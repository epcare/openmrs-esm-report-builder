/**
 * Section Disaggregation SQL Builder
 *
 * This module builds age/sex disaggregation SQL for report sections.
 * It provides both synchronous (for backward compatibility) and asynchronous
 * (for nested composite indicators) versions.
 */

import type { IndicatorDto } from '../../resources/indicator/indicators.api';
import {
    compilePopulationSql,
    generateAgeSexDisaggregationSql,
    clearCompilationCache,
    type CompilerOptions
} from '../indicators/utils/population-sql.compiler';
import {
    countSqlToPopulationSql,
    tryGetPatientIdColumnFromConfig
} from '../indicators/utils/composite-indicator-sql.utils';

type BuildSectionDisaggSqlArgs = {
    /** The indicator to disaggregate */
    indicator: IndicatorDto;
    /** The age category code (e.g., 'HTS', 'HMIS_106A') */
    ageCategoryCode: string;
    /** The genders to include */
    genders: Array<'F' | 'M'>;
    /** Function to fetch referenced indicators by UUID */
    getIndicator: (uuid: string) => Promise<IndicatorDto | null>;
    /** Compiler options */
    compilerOptions?: CompilerOptions;
};

/**
 * Result of building section disaggregation SQL (async version).
 */
export type SectionDisaggResult = {
    /** The generated SQL */
    sql: string;
    /** Any warnings from compilation */
    warnings?: string[];
};

/**
 * Builds section disaggregation SQL for any indicator type (BASE, COMPOSITE, FINAL).
 *
 * This is the synchronous version for backward compatibility. It extracts
 * population SQL from the indicator's sql_template without recursive compilation.
 *
 * For nested composite indicators, this version may fail or produce incorrect results.
 * Use `buildSectionDisaggregationSqlAsync` instead for nested composite indicators.
 *
 * @returns The generated SQL as a string
 */
export function buildSectionDisaggregationSql(args: {
    indicator: IndicatorDto;
    ageCategoryCode: string;
    genders: Array<'F' | 'M'>;
}): string {
    const { indicator, ageCategoryCode, genders } = args;

    // If user unchecks everything, default to both
    const selectedGenders = (genders ?? []).length ? genders : (['F', 'M'] as Array<'F' | 'M'>);

    const escapedCode = escapeSql(ageCategoryCode);
    const genderList = selectedGenders.map((g) => `'${g}'`).join(',');

    // Try to get population SQL from the indicator
    const populationSql = tryGetPopulationSql(indicator);

    if (!populationSql) {
        return `-- Unable to build section disaggregation SQL: indicator does not contain usable population SQL.\n-- Ensure the indicator has a valid sqlTemplate or configJson.\n-- Indicator: ${indicator.name} (${indicator.code})\n-- Note: For nested composite indicators, use buildSectionDisaggregationSqlAsync.`;
    }

    return `
WITH base_pop AS (
  ${indent(populationSql, 2)}
),
ag AS (
  SELECT
    ag.age_group_id,
    ag.label,
    ag.min_age_days,
    ag.max_age_days,
    ag.sort_order
  FROM report_builder_dim_age_group ag
  JOIN report_builder_dim_age_category ac
    ON ac.age_category_id = ag.age_category_id
  WHERE ac.code = '${escapedCode}'
    AND ag.is_active = 1
),
genders AS (
  SELECT 'F' AS gender
  UNION ALL SELECT 'M' AS gender
),
cnt AS (
  SELECT
    ag.age_group_id AS age_group_id,
    mdp.gender AS gender,
    COUNT(DISTINCT base_pop.patient_id) AS value
  FROM base_pop
  JOIN mamba_fact_patients_latest_patient_demographics mdp
    ON mdp.patient_id = base_pop.patient_id
  JOIN ag
    ON TIMESTAMPDIFF(DAY, mdp.birthdate, :endDate)
       BETWEEN ag.min_age_days AND ag.max_age_days
  WHERE mdp.birthdate IS NOT NULL
    AND mdp.gender IS NOT NULL
    AND mdp.gender IN (${genderList})
  GROUP BY ag.age_group_id, mdp.gender
)
SELECT
  ag.label AS age_group,
  g.gender AS gender,
  COALESCE(cnt.value, 0) AS value
FROM ag
CROSS JOIN genders g
LEFT JOIN cnt
    ON cnt.age_group_id = ag.age_group_id
   AND cnt.gender = g.gender
ORDER BY ag.sort_order, g.gender;
`.trim();
}

/**
 * Async version of section disaggregation SQL builder.
 *
 * This function uses the recursive population SQL compiler to properly handle
 * nested composite indicators. The compiler:
 * 1. Recursively compiles each indicator to population SQL
 * 2. Detects circular dependencies
 * 3. Handles missing references
 * 4. Fixes common typos like `:stratDate` -> `:startDate`
 *
 * Use this version for composite indicators that reference other composite indicators.
 *
 * @returns The generated SQL and any warnings
 */
export async function buildSectionDisaggregationSqlAsync({
    indicator,
    ageCategoryCode,
    genders,
    getIndicator,
    compilerOptions = {}
}: BuildSectionDisaggSqlArgs): Promise<SectionDisaggResult> {
    try {
        // Clear cache to ensure fresh compilation
        clearCompilationCache();

        // Recursively compile the indicator to population SQL
        const result = await compilePopulationSql(indicator, getIndicator, new Set(), compilerOptions);

        // Generate the disaggregation SQL
        const sql = generateAgeSexDisaggregationSql({
            populationSql: result.sql,
            ageCategoryCode,
            genders
        });

        return {
            sql,
            warnings: result.warnings
        };
    } catch (error) {
        // Return an error comment in the SQL
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
            sql: `-- Error building disaggregation SQL: ${errorMsg}\n-- Indicator: ${indicator.name} (${indicator.code || indicator.uuid})`,
            warnings: [`Compilation error: ${errorMsg}`]
        };
    }
}

/**
 * Try to extract population SQL from an indicator's sql_template or configJson.
 *
 * This attempts to convert COUNT SQL to population SQL for simple cases.
 * For complex nested composite indicators, use the async version instead.
 */
function tryGetPopulationSql(indicator: IndicatorDto): string | null {
    // First, try sqlTemplate directly
    let sql = indicator.sqlTemplate || '';

    // If not found, try config_json fields (like tryGetCountSqlFromIndicator does)
    if (!sql && indicator.configJson) {
        try {
            const parsed = JSON.parse(indicator.configJson);
            // Try various config paths
            sql = parsed?.sqlPreview ||
                  parsed?.sqlTemplate ||
                  parsed?.base?.sqlPreview ||
                  parsed?.base?.sqlTemplate ||
                  parsed?.authoring?.base?.sqlPreview ||
                  parsed?.authoring?.base?.sqlTemplate ||
                  parsed?.baseIndicator?.sqlPreview ||
                  parsed?.baseIndicator?.sqlTemplate ||
                  '';
        } catch (e) {
            // Invalid JSON, continue
        }
    }

    const trimmed = sql.trim();

    if (!trimmed) {
        return null;
    }

    // Remove trailing semicolons - they cause "Multiple statements" errors when used in CTEs
    const withoutSemicolon = trimmed.replace(/;+\s*$/, '');

    // Fix common typos
    const fixed = withoutSemicolon.replace(/:stratDate\b/g, ':startDate');

    // Check if it's already a population query
    if (/SELECT\s+DISTINCT\s+(?:\w+\.?patient_id|patient_id)/i.test(fixed)) {
        return fixed;
    }

    // Try to convert COUNT SQL to population SQL using the existing utility
    const pidCol = tryGetPatientIdColumnFromConfig(indicator);

    try {
        const populationSql = countSqlToPopulationSql(fixed, pidCol, 'Patients');
        if (populationSql) {
            return populationSql;
        }
    } catch (e) {
        // Conversion failed, continue to fallback
    }

    // As a last resort, if it looks like a population query, return it
    if (/^SELECT\s+.*?\s+FROM\s+/i.test(fixed)) {
        return fixed;
    }

    return null;
}

function escapeSql(s: string): string {
    return String(s).replace(/'/g, "''");
}

function indent(sql: string, spaces: number): string {
    const pad = ' '.repeat(spaces);
    return sql
        .split('\n')
        .map((line) => (line.trim() ? pad + line : line))
        .join('\n');
}

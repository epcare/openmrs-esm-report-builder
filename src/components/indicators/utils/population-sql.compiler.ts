/**
 * Recursive Population SQL Compiler for Indicators
 *
 * This module implements a recursive compiler that builds population SQL
 * directly from indicator configuration, avoiding the fragile approach of
 * parsing/modifying generated SQL queries.
 *
 * Key design principles:
 * 1. Every indicator (atomic or composite) compiles to population SQL returning client_id
 * 2. Scalar counts and disaggregations are wrappers around population SQL
 * 3. Nested composite indicators are handled recursively
 * 4. Circular dependencies are detected
 * 5. Missing references are validated
 */

import type { IndicatorDto } from '../../../resources/indicator/indicators.api';
import type { CompositeOperator } from '../types/composite-indicator.types';

/**
 * Result of compiling an indicator to population SQL.
 */
export type PopulationCompileResult = {
    /** The population SQL that returns the patient ID column */
    sql: string;
    /** The column name used for patient identification (e.g., 'client_id', 'patient_id', 'encounter_id') */
    patientIdColumn: string;
    /** Any warnings or information about the compilation */
    warnings?: string[];
    /** Whether this indicator was retired (for informational purposes) */
    retired?: boolean;
};

/**
 * Compiler options for population SQL generation.
 */
export type CompilerOptions = {
    /** Whether to allow using retired indicators as operands */
    allowRetired?: boolean;
    /** Maximum nesting depth to prevent infinite recursion (default: 10) */
    maxDepth?: number;
};

/**
 * Circular dependency error.
 */
export class CircularDependencyError extends Error {
    constructor(public chain: string[]) {
        super(`Circular indicator dependency detected: ${chain.join(' → ')}`);
        this.name = 'CircularDependencyError';
    }
}

/**
 * Missing reference error.
 */
export class MissingReferenceError extends Error {
    constructor(
        public parentIndicator: string,
        public missingRef: string,
        public refType: 'indicatorAId' | 'indicatorBId'
    ) {
        super(`Missing ${refType} in indicator ${parentIndicator}: ${missingRef}`);
        this.name = 'MissingReferenceError';
    }
}

/**
 * Unsupported operator error.
 */
export class UnsupportedOperatorError extends Error {
    constructor(
        public indicator: string,
        public operator: string
    ) {
        super(`Unsupported operator '${operator}' in indicator ${indicator}`);
        this.name = 'UnsupportedOperatorError';
    }
}

/**
 * Atomic indicator compilation error.
 */
export class AtomicIndicatorError extends Error {
    constructor(
        public indicator: string,
        public reason: string
    ) {
        super(`Cannot compile atomic indicator ${indicator}: ${reason}`);
        this.name = 'AtomicIndicatorError';
    }
}

/**
 * Configuration for a composite indicator from config_json.
 */
type CompositeIndicatorConfig = {
    version?: number;
    unit?: 'Patients' | 'Encounters';
    operator?: CompositeOperator;
    indicatorAId?: string;
    indicatorBId?: string;
    indicatorACode?: string;
    indicatorBCode?: string;
    // Legacy fields that might be present
    sqlPreview?: string;
    sqlTemplate?: string;
    base?: {
        sqlPreview?: string;
        sqlTemplate?: string;
        themeConfig?: {
            patientIdColumn?: string;
        };
    };
    themeConfig?: {
        patientIdColumn?: string;
    };
    authoring?: {
        base?: {
            sqlPreview?: string;
            sqlTemplate?: string;
            themeConfig?: {
                patientIdColumn?: string;
            };
        };
    };
    baseIndicator?: {
        sqlPreview?: string;
        sqlTemplate?: string;
        themeConfig?: {
            patientIdColumn?: string;
        };
    };
};

/**
 * Cache to avoid re-compiling the same indicator multiple times.
 * Map<indicatorUuid, PopulationCompileResult>
 */
const compilationCache = new Map<string, PopulationCompileResult>();

/**
 * Clear the compilation cache. Useful for testing or when indicators change.
 */
export function clearCompilationCache(): void {
    compilationCache.clear();
}

/**
 * Recursively compile an indicator to population SQL.
 *
 * This function follows these rules:
 * 1. Check cache first
 * 2. Detect circular dependencies
 * 3. Parse config_json to get configuration
 * 4. For COMPOSITE: recursively compile A and B, then combine
 * 5. For BASE: extract population SQL from sql_template
 * 6. Fix common typos like `:stratDate` -> `:startDate`
 *
 * @param indicator - The indicator to compile
 * @param getIndicator - Function to fetch referenced indicators by UUID
 * @param visited - Set of already-visited indicator UUIDs (for cycle detection)
 * @param options - Compiler options
 * @returns Population SQL that returns client_id
 */
export async function compilePopulationSql(
    indicator: IndicatorDto,
    getIndicator: (uuid: string) => Promise<IndicatorDto | null>,
    visited: Set<string> = new Set(),
    options: CompilerOptions = {}
): Promise<PopulationCompileResult> {
    const { allowRetired = false, maxDepth = 10 } = options;

    // Check cache
    if (compilationCache.has(indicator.uuid)) {
        return compilationCache.get(indicator.uuid)!;
    }

    // Check depth limit
    if (visited.size >= maxDepth) {
        throw new Error(`Maximum compilation depth ${maxDepth} exceeded. Possible circular dependency.`);
    }

    // Check for circular dependency
    if (visited.has(indicator.uuid)) {
        throw new CircularDependencyError([...visited, indicator.uuid]);
    }

    // Add to visited set
    const newVisited = new Set(visited);
    newVisited.add(indicator.uuid);

    // Check if retired
    if (indicator.retired && !allowRetired) {
        throw new Error(`Cannot use retired indicator ${indicator.code || indicator.uuid} as operand`);
    }

    const warnings: string[] = [];
    if (indicator.retired) {
        warnings.push(`Using retired indicator: ${indicator.code || indicator.name}`);
    }

    // Parse config_json
    let config: CompositeIndicatorConfig | null = null;
    try {
        config = indicator.configJson ? JSON.parse(indicator.configJson) : null;
    } catch (e) {
        warnings.push(`Failed to parse config_json: ${e}`);
    }

    // Handle different indicator types
    if (indicator.kind === 'COMPOSITE' && config) {
        // Composite indicator - compile recursively
        const result = await compileCompositePopulation(indicator, config, getIndicator, newVisited, options);
        result.warnings = [...warnings, ...(result.warnings || [])];
        compilationCache.set(indicator.uuid, result);
        return result;
    } else if (indicator.kind === 'BASE') {
        // Base indicator - extract population SQL
        const result = compileBasePopulation(indicator, config);
        result.warnings = warnings;
        compilationCache.set(indicator.uuid, result);
        return result;
    } else {
        // FINAL indicator or unsupported type
        // For FINAL indicators, we might need different handling
        // For now, try to extract population SQL like a base indicator
        try {
            const result = compileBasePopulation(indicator, config);
            result.warnings = [...warnings, 'FINAL indicator treated as BASE'];
            compilationCache.set(indicator.uuid, result);
            return result;
        } catch (e) {
            throw new AtomicIndicatorError(
                indicator.code || indicator.uuid,
                `Unsupported indicator kind: ${indicator.kind}`
            );
        }
    }
}

/**
 * Compile a composite indicator's population SQL.
 */
async function compileCompositePopulation(
    indicator: IndicatorDto,
    config: CompositeIndicatorConfig,
    getIndicator: (uuid: string) => Promise<IndicatorDto | null>,
    visited: Set<string>,
    options: CompilerOptions
): Promise<PopulationCompileResult> {
    const warnings: string[] = [];

    // Validate required fields
    if (!config.indicatorAId) {
        throw new MissingReferenceError(
            indicator.code || indicator.uuid,
            'missing',
            'indicatorAId'
        );
    }

    if (!config.indicatorBId) {
        throw new MissingReferenceError(
            indicator.code || indicator.uuid,
            'missing',
            'indicatorBId'
        );
    }

    if (!config.operator) {
        throw new UnsupportedOperatorError(indicator.code || indicator.uuid, 'missing');
    }

    // Get referenced indicators
    const indicatorA = await getIndicator(config.indicatorAId);
    const indicatorB = await getIndicator(config.indicatorBId);

    if (!indicatorA) {
        throw new MissingReferenceError(
            indicator.code || indicator.uuid,
            config.indicatorAId,
            'indicatorAId'
        );
    }

    if (!indicatorB) {
        throw new MissingReferenceError(
            indicator.code || indicator.uuid,
            config.indicatorBId,
            'indicatorBId'
        );
    }

    // Recursively compile operand A
    const resultA = await compilePopulationSql(indicatorA, getIndicator, visited, options);

    // Recursively compile operand B
    const resultB = await compilePopulationSql(indicatorB, getIndicator, visited, options);

    // Combine with the appropriate operator
    const sql = combineWithOperator(
        config.operator!,
        resultA.sql,
        resultB.sql,
        config.unit || 'Patients'
    );

    return {
        sql,
        patientIdColumn: resultA.patientIdColumn, // Use the patientIdColumn from operand A
        warnings: [...warnings, ...(resultA.warnings || []), ...(resultB.warnings || [])],
        retired: indicator.retired
    };
}

/**
 * Combine two population SQL queries with the given operator.
 *
 * Handles the case where population SQL may already contain WITH clauses
 * by using unique CTE names that won't conflict with inner CTEs.
 */
function combineWithOperator(
    operator: CompositeOperator,
    populationSqlA: string,
    populationSqlB: string,
    unit: 'Patients' | 'Encounters'
): string {
    const idField = unit === 'Encounters' ? 'encounter_id' : 'client_id';

    // Clean the SQL - remove trailing semicolons
    const cleanA = populationSqlA.trim().replace(/;+\s*$/, '');
    const cleanB = populationSqlB.trim().replace(/;+\s*$/, '');

    // Check if the population SQL contains WITH clauses (nested CTEs)
    const aHasWith = /^\s*WITH\s+/i.test(cleanA);
    const bHasWith = /^\s*WITH\s+/i.test(cleanB);

    // Use unique CTE names to avoid conflicts with inner CTEs
    // If the population SQL has WITH clauses, use more specific names
    const aName = aHasWith ? 'operand_a_base' : 'A';
    const bName = bHasWith ? 'operand_b_base' : 'B';

    if (operator === 'AND') {
        // Intersection: A INNER JOIN B on client_id
        return `
WITH ${aName} AS (
${indent(cleanA, 0)}
),
${bName} AS (
${indent(cleanB, 0)}
)
SELECT DISTINCT
    ${aName}.${idField}
FROM ${aName}
INNER JOIN ${bName}
    ON ${bName}.${idField} = ${aName}.${idField}
`.trim();
    } else if (operator === 'OR') {
        // Union: A UNION B
        return `
WITH ${aName} AS (
${indent(cleanA, 0)}
),
${bName} AS (
${indent(cleanB, 0)}
)
SELECT ${idField} FROM ${aName}
UNION
SELECT ${idField} FROM ${bName}
`.trim();
    } else if (operator === 'A_AND_NOT_B') {
        // Set difference: A LEFT JOIN B WHERE B IS NULL
        return `
WITH ${aName} AS (
${indent(cleanA, 0)}
),
${bName} AS (
${indent(cleanB, 0)}
)
SELECT DISTINCT
    ${aName}.${idField}
FROM ${aName}
LEFT JOIN ${bName}
    ON ${bName}.${idField} = ${aName}.${idField}
WHERE ${bName}.${idField} IS NULL
`.trim();
    }

    throw new Error(`Unsupported operator: ${operator}`);
}

/**
 * Compile a base indicator's population SQL.
 *
 * For base indicators, we extract the population SQL from the sql_template
 * or from config_json fields. The population SQL should return the patient ID column.
 */
function compileBasePopulation(
    indicator: IndicatorDto,
    config: CompositeIndicatorConfig | null
): PopulationCompileResult {
    // Try to get SQL from various sources
    let sql = indicator.sqlTemplate || '';

    if (!sql && config) {
        // Try config_json fields
        sql = config.sqlPreview || config.sqlTemplate || config.base?.sqlPreview || config.base?.sqlTemplate || '';
    }

    if (!sql) {
        throw new AtomicIndicatorError(
            indicator.code || indicator.uuid,
            'No SQL template found'
        );
    }

    // Fix common typos
    sql = fixCommonTypos(sql);

    // Get the patient ID column from config (e.g., 'client_id' for HIV indicators)
    const patientIdColumn = getPatientIdColumnFromConfig(config);

    // Convert COUNT SQL to population SQL if needed
    const populationSql = convertCountToPopulation(sql, patientIdColumn);

    return {
        sql: populationSql,
        patientIdColumn,
        retired: indicator.retired
    };
}

/**
 * Get the patient ID column from indicator config.
 * Defaults to 'client_id' if not specified.
 */
function getPatientIdColumnFromConfig(config: CompositeIndicatorConfig | null): string {
    try {
        const cfg =
            config?.themeConfig ||
            config?.base?.themeConfig ||
            config?.authoring?.base?.themeConfig ||
            config?.baseIndicator?.themeConfig ||
            null;
        const pid = cfg?.patientIdColumn;
        return pid ? String(pid) : 'client_id';
    } catch {
        return 'client_id';
    }
}

/**
 * Convert COUNT SQL to population SQL.
 *
 * This handles the case where a base indicator has COUNT(*) SQL
 * and needs to be converted to return patient_id or client_id instead.
 *
 * IMPORTANT: The output column is ALWAYS aliased as the patientIdColumn value
 * (e.g., 'client_id' or 'patient_id') for consistency with downstream queries.
 */
function convertCountToPopulation(sql: string, patientIdColumn: string = 'client_id'): string {
    const trimmed = sql.trim();

    // Remove any trailing semicolons first (they cause issues when used as CTE)
    const withoutSemicolon = trimmed.replace(/;+\s*$/, '');

    // Check if it's already a population query (SELECT DISTINCT with patient_id, client_id, or encounter_id)
    // The output should always be aliased as patientIdColumn for consistency
    const populationCheck = new RegExp(`SELECT\\\\s+DISTINCT\\\\s+\\\\w+\\\\.?\\\\(?:${patientIdColumn}\\\\|client_id\\\\|patient_id\\\\|encounter_id\\\\)`, 'i');
    if (populationCheck.test(withoutSemicolon)) {
        // Ensure the output is aliased correctly
        const fixed = fixCommonTypos(withoutSemicolon);
        // If it's already aliasing correctly (AS patientIdColumn), return as-is
        const aliasCheck = new RegExp(`AS\\\\s+${patientIdColumn}$`, 'im');
        if (aliasCheck.test(fixed)) {
            return fixed;
        }
        // Check if the column already matches patientIdColumn (no alias needed)
        // e.g., "SELECT DISTINCT a.client_id" when patientIdColumn is "client_id"
        const columnMatch = fixed.match(/SELECT\s+DISTINCT\s+(\w+\.?\w*)\s*$/im);
        if (columnMatch) {
            const columnName = columnMatch[1].split('.').pop(); // Get just column name without alias
            if (columnName === patientIdColumn) {
                return fixed; // No alias needed when column name matches
            }
        }
        // Otherwise, fix the alias to use patientIdColumn
        const replacePattern = /SELECT\s+DISTINCT\s+(\w+\.?(?:client_id|patient_id|encounter_id))/i;
        return fixed.replace(replacePattern, `SELECT DISTINCT $1 AS ${patientIdColumn}`);
    }

    // Check if it's a COUNT query
    const countPattern = /SELECT\s+.*?COUNT\s*\(\s*\*\s*\)\s+AS\s+total/i;
    if (!countPattern.test(withoutSemicolon)) {
        // Not a COUNT query and not a population query
        // Assume it's already correct but fix typos
        return fixCommonTypos(withoutSemicolon);
    }

    // Convert COUNT(*) to SELECT DISTINCT <patientIdColumn> AS patientIdColumn
    // Pattern: SELECT COUNT(*) AS total FROM <table> a ...
    // We want: SELECT DISTINCT a.<patientIdColumn> AS patientIdColumn FROM <table> a ...

    // Try to extract the table and alias from the FROM clause
    const fromMatch = withoutSemicolon.match(/FROM\s+(\S+)\s+(\S+)/i);
    if (fromMatch) {
        const alias = fromMatch[2];

        // Build population SQL
        const result = withoutSemicolon
            .replace(/SELECT\s+.*?COUNT\s*\(\s*\*\s*\)\s+AS\s+total\s*/i, '')
            .replace(/FROM\s+/i, `SELECT DISTINCT ${alias}.${patientIdColumn} AS ${patientIdColumn} FROM `);

        return fixCommonTypos(result);
    }

    // If we can't parse it, try a simple replacement
    const result = withoutSemicolon.replace(
        /SELECT\s+.*?COUNT\s*\(\s*\*\s*\)\s+AS\s+total\s+FROM\s+/i,
        `SELECT DISTINCT ${patientIdColumn} AS ${patientIdColumn} FROM `
    );

    return fixCommonTypos(result);
}

/**
 * Fix common typos in generated SQL.
 */
function fixCommonTypos(sql: string): string {
    let fixed = sql;
    // Fix :stratDate -> :startDate
    fixed = fixed.replace(/:stratDate\b/g, ':startDate');
    // Remove trailing semicolons - population SQL used as CTE shouldn't have semicolons
    fixed = fixed.replace(/;+\s*$/, '');
    return fixed;
}

/**
 * Indent SQL by a number of spaces.
 */
function indent(sql: string, spaces: number): string {
    const pad = ' '.repeat(spaces);
    return sql
        .split('\n')
        .map((line) => (line.trim() ? pad + line : line))
        .join('\n');
}

/**
 * Generate scalar COUNT SQL from population SQL.
 *
 * This wraps the population SQL in a COUNT query.
 */
export function generateScalarCountSql(populationSql: string): string {
    const clean = populationSql.trim().replace(/;+\s*$/, '');

    return `
WITH base_population AS (
${indent(clean, 0)}
)
SELECT
    COUNT(DISTINCT client_id) AS total
FROM base_population;
`.trim();
}

/**
 * Generate age/sex disaggregation SQL from population SQL.
 *
 * This wraps the population SQL in the disaggregation CTE structure.
 */
export function generateAgeSexDisaggregationSql(args: {
    populationSql: string;
    ageCategoryCode: string;
    genders: Array<'F' | 'M'>;
    patientIdColumn?: string;
}): string {
    const { populationSql, ageCategoryCode, genders, patientIdColumn = 'patient_id' } = args;

    const selectedGenders = (genders || []).length ? genders : (['F', 'M'] as Array<'F' | 'M'>);

    const clean = populationSql.trim().replace(/;+\s*$/, '');

    return `
WITH base_pop AS (
${indent(clean, 2)}
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
  WHERE ac.code = '${escapeSql(ageCategoryCode)}'
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
    COUNT(DISTINCT base_pop.${patientIdColumn}) AS value
  FROM base_pop
  JOIN mamba_fact_patients_latest_patient_demographics mdp
    ON mdp.${patientIdColumn} = base_pop.${patientIdColumn}
  JOIN ag
    ON TIMESTAMPDIFF(DAY, mdp.birthdate, :endDate)
       BETWEEN ag.min_age_days AND ag.max_age_days
  WHERE mdp.birthdate IS NOT NULL
    AND mdp.gender IS NOT NULL
    AND mdp.gender IN (${selectedGenders.map((g) => `'${g}'`).join(',')})
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
 * Escape SQL literal values.
 */
function escapeSql(s: string): string {
    return String(s).replace(/'/g, "''");
}

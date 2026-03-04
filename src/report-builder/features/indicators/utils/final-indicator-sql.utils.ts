import type { IndicatorDto } from '../../../services/indicator/indicators.api';

import {
    countSqlToPopulationSql,
    tryGetPatientIdColumnFromConfig,
    tryGetCountSqlFromIndicator,
} from './composite-indicator-sql.utils';

export type FinalIndicatorAuthoringV1 = {
    version: 1;
    baseIndicatorId: string;

    // Backward/forward compatibility
    ageGroupSetCode?: string;
    ageCategoryCode?: string;

    genders: Array<'F' | 'M'>;
    sqlPreview: string;
};

type BuildFinalSqlArgs = {
    baseIndicator: IndicatorDto;
    ageCategoryCode: string;
    genders: Array<'F' | 'M'>;
};

/**
 * Builds a Final Indicator query that ALWAYS returns all age groups (even if value = 0),
 * and for each selected gender.
 *
 * Strategy:
 *  - base_pop: patient population set from base indicator
 *  - ag: all age groups for the selected category (active only)
 *  - genders: the selected genders as rows
 *  - cnt: computed counts per (age_group_id, gender)
 *  - final: ag CROSS JOIN genders LEFT JOIN cnt, COALESCE(value,0)
 */
export function buildFinalIndicatorSql({ baseIndicator, ageCategoryCode, genders }: BuildFinalSqlArgs): string {
    const { sql: countSql } = tryGetCountSqlFromIndicator(baseIndicator);
    const pidCol = tryGetPatientIdColumnFromConfig(baseIndicator);

    const populationSql = countSql ? countSqlToPopulationSql(countSql, pidCol, 'Patients') : '';

    if (!populationSql.trim()) {
        return `-- Unable to build final indicator SQL: base indicator does not contain usable count SQL.\n-- Ensure the base indicator has a valid sqlTemplate or configJson.sqlPreview.`;
    }

    // If user unchecks everything, default to both (better UX than returning no rows)
    const selectedGenders = (genders ?? []).length ? genders : (['F', 'M'] as Array<'F' | 'M'>);

    const gendersCte = buildGenderCte(selectedGenders);

    // NOTE: adjust these table names if your DB uses different names.
    // If you adopted the new naming, use report_builder_dim_age_category/group.
    const AGE_CATEGORY_TABLE = 'report_builder_dim_age_category';
    const AGE_GROUP_TABLE = 'report_builder_dim_age_group';

    return `
WITH base_pop AS (
${indent(populationSql.trim(), 2)}
),
ag AS (
  SELECT
    ag.age_group_id,
    ag.label,
    ag.min_age_days,
    ag.max_age_days,
    ag.sort_order
  FROM ${AGE_GROUP_TABLE} ag
  JOIN ${AGE_CATEGORY_TABLE} ac
    ON ac.age_category_id = ag.age_category_id
  WHERE ac.code = '${escapeSqlLiteral(ageCategoryCode)}'
    AND ag.is_active = 1
),
genders AS (
${indent(gendersCte, 2)}
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
    ON TIMESTAMPDIFF(DAY, mdp.birthdate, ':endDate')
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

function buildGenderCte(genders: Array<'F' | 'M'>): string {
    // Produce rows:
    // SELECT 'F' AS gender UNION ALL SELECT 'M' AS gender
    const parts = genders.map((g, i) => (i === 0 ? `SELECT '${g}' AS gender` : `UNION ALL SELECT '${g}' AS gender`));
    return parts.join('\n');
}

function indent(s: string, spaces: number) {
    const pad = ' '.repeat(spaces);
    return s
        .split('\n')
        .map((l) => (l.trim().length ? pad + l : l))
        .join('\n');
}

function escapeSqlLiteral(s: string) {
    return String(s).replace(/'/g, "''");
}
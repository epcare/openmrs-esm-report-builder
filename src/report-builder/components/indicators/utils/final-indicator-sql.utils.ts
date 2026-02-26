import type { IndicatorDto } from '../../../services/indicator/indicators.api';
import type { BaseIndicatorOption } from '../types/composite-indicator.types';

import {
    countSqlToPopulationSql,
    tryGetPatientIdColumnFromConfig,
    tryGetCountSqlFromIndicator,
} from './composite-indicator-sql.utils';

export type FinalIndicatorAuthoringV1 = {
    version: 1;
    baseIndicatorId: string;
    ageGroupSetCode: string;
    genders: Array<'F' | 'M'>;
    sqlPreview: string;
};

type BuildFinalSqlArgs = {
    baseIndicator: IndicatorDto;
    ageGroupSetCode: string;
    genders: Array<'F' | 'M'>;
};

export function buildFinalIndicatorSql({ baseIndicator, ageGroupSetCode, genders }: BuildFinalSqlArgs): string {
    const { sql: countSql } = tryGetCountSqlFromIndicator(baseIndicator);
    const pidCol = tryGetPatientIdColumnFromConfig(baseIndicator);

    // Convert base count SQL into a patient population set.
    const populationSql = countSql ? countSqlToPopulationSql(countSql, pidCol, 'Patients') : '';

    if (!populationSql.trim()) {
        return `-- Unable to build final indicator SQL: base indicator does not contain usable count SQL.\n-- Ensure the base indicator has a valid sqlTemplate or configJson.sqlPreview.`;
    }

    // Gender filter (optional)
    const genderFilter =
        genders.length === 0
            ? ''
            : `  AND mdp.gender IN (${genders.map((g) => `'${g}'`).join(',')})`;

    // We use ':endDate' as the age reference for MVP.
    // Later we can improve by using an event date column if available.
    return `
WITH base_pop AS (
${indent(populationSql.trim(), 2)}
)
SELECT
  ag.label AS age_group,
  mdp.gender,
  COUNT(DISTINCT base_pop.patient_id) AS value
FROM base_pop
JOIN mamba_fact_patients_latest_patient_demographics mdp
  ON mdp.patient_id = base_pop.patient_id
JOIN mamba_dim_age_category ac
  ON ac.code = '${escapeSqlLiteral(ageGroupSetCode)}'
JOIN mamba_dim_age_group ag
  ON ag.age_category_id = ac.age_category_id
 AND TIMESTAMPDIFF(DAY, mdp.birthdate, ':endDate')
     BETWEEN ag.min_age_days AND ag.max_age_days
WHERE mdp.birthdate IS NOT NULL
  AND mdp.gender IS NOT NULL
${genderFilter}
GROUP BY ag.sort_order, ag.label, mdp.gender
ORDER BY ag.sort_order, mdp.gender;
`.trim();
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
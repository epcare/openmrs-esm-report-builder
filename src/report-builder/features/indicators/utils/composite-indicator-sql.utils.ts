import type { IndicatorDto } from '../../../services/indicator/indicators.api';

export type CountSqlSource =
    | 'indicator.sqlTemplate'
    | 'configJson.sqlPreview'
    | 'configJson.sqlTemplate'
    | 'configJson.base.sqlPreview'
    | 'configJson.base.sqlTemplate'
    | 'configJson.authoring.base.sqlPreview'
    | 'configJson.authoring.base.sqlTemplate'
    | 'configJson.baseIndicator.sqlPreview'
    | 'configJson.baseIndicator.sqlTemplate'
    | 'none'
    | 'none(parse-error)';

export function idFieldForUnit(unit: 'Patients' | 'Encounters') {
    return unit === 'Encounters' ? 'encounter_id' : 'patient_id';
}

/**
 * Extract patientIdColumn from stored authoring (if present),
 * otherwise fallback to "patient_id".
 */
export function tryGetPatientIdColumnFromConfig(ind: IndicatorDto): string {
    try {
        const parsed: any = ind?.configJson ? JSON.parse(ind.configJson) : null;

        const cfg =
            parsed?.themeConfig ||
            parsed?.base?.themeConfig ||
            parsed?.authoring?.base?.themeConfig ||
            parsed?.baseIndicator?.themeConfig ||
            null;

        const pid = cfg?.patientIdColumn;
        return pid ? String(pid) : 'patient_id';
    } catch {
        return 'patient_id';
    }
}

/**
 * ✅ Key fix:
 * Many times the backend returns sqlTemplate empty, but configJson contains sqlPreview.
 * We support all known config shapes.
 */
export function tryGetCountSqlFromIndicator(ind: IndicatorDto): { sql: string; source: CountSqlSource } {
    const direct = (ind?.sqlTemplate ?? '').trim();
    if (direct) return { sql: direct, source: 'indicator.sqlTemplate' };

    try {
        const parsed: any = ind?.configJson ? JSON.parse(ind.configJson) : null;

        // flat
        const flatPreview = (parsed?.sqlPreview ?? '').trim();
        if (flatPreview) return { sql: flatPreview, source: 'configJson.sqlPreview' };

        const flatTemplate = (parsed?.sqlTemplate ?? '').trim();
        if (flatTemplate) return { sql: flatTemplate, source: 'configJson.sqlTemplate' };

        // base
        const basePreview = (parsed?.base?.sqlPreview ?? '').trim();
        if (basePreview) return { sql: basePreview, source: 'configJson.base.sqlPreview' };

        const baseTemplate = (parsed?.base?.sqlTemplate ?? '').trim();
        if (baseTemplate) return { sql: baseTemplate, source: 'configJson.base.sqlTemplate' };

        // authoring.base
        const authPreview = (parsed?.authoring?.base?.sqlPreview ?? '').trim();
        if (authPreview) return { sql: authPreview, source: 'configJson.authoring.base.sqlPreview' };

        const authTemplate = (parsed?.authoring?.base?.sqlTemplate ?? '').trim();
        if (authTemplate) return { sql: authTemplate, source: 'configJson.authoring.base.sqlTemplate' };

        // sometimes wrapped differently
        const biPreview = (parsed?.baseIndicator?.sqlPreview ?? '').trim();
        if (biPreview) return { sql: biPreview, source: 'configJson.baseIndicator.sqlPreview' };

        const biTemplate = (parsed?.baseIndicator?.sqlTemplate ?? '').trim();
        if (biTemplate) return { sql: biTemplate, source: 'configJson.baseIndicator.sqlTemplate' };

        return { sql: '', source: 'none' };
    } catch {
        return { sql: '', source: 'none(parse-error)' };
    }
}

/**
 * Convert a base indicator COUNT sqlTemplate into a population query.
 *
 * Assumes base SQL looks like:
 * SELECT
 *   COUNT(*) AS total
 * FROM <table> a
 * ...
 *
 * We convert to:
 * SELECT DISTINCT a.<idColumn> AS <idField>
 * FROM <table> a
 * ...
 */
export function countSqlToPopulationSql(sql: string, idColumn: string, unit: 'Patients' | 'Encounters') {
    const idField = idFieldForUnit(unit);

    const raw = (sql ?? '').trim();
    if (!raw) return '';

    // normalize trailing semicolons
    const noSemi = raw.replace(/;+\s*$/, '');

    // Replace the first SELECT COUNT block (robust-ish)
    const replaced = noSemi.replace(
        /SELECT\s+([\s\S]*?)COUNT\s*\(\s*\*\s*\)\s+AS\s+total\s*/i,
        `SELECT DISTINCT a.${idColumn} AS ${idField}\n`,
    );

    // If it didn’t replace, fallback: try simpler replace
    if (replaced === noSemi) {
        return noSemi.replace(/COUNT\s*\(\s*\*\s*\)\s+AS\s+total/gi, `DISTINCT a.${idColumn} AS ${idField}`);
    }

    return replaced;
}

/**
 * Build composite COUNT SQL from two population queries.
 * Population queries MUST return a column named patient_id or encounter_id.
 */
export function buildCompositeCountSql(args: {
    unit: 'Patients' | 'Encounters';
    operator: 'AND' | 'OR' | 'A_AND_NOT_B';
    populationSqlA: string;
    populationSqlB: string;
}) {
    const idField = idFieldForUnit(args.unit);

    const A = args.populationSqlA.trim().replace(/;+\s*$/, '');
    const B = args.populationSqlB.trim().replace(/;+\s*$/, '');

    if (!A || !B) return '';

    if (args.operator === 'AND') {
        return `
WITH
A AS (${A}),
B AS (${B})
SELECT COUNT(*) AS total
FROM (
  SELECT A.${idField}
  FROM A
  INNER JOIN B ON B.${idField} = A.${idField}
) X;
`.trim();
    }

    if (args.operator === 'OR') {
        return `
WITH
A AS (${A}),
B AS (${B})
SELECT COUNT(*) AS total
FROM (
  SELECT ${idField} FROM A
  UNION
  SELECT ${idField} FROM B
) X;
`.trim();
    }

    // A_AND_NOT_B
    return `
WITH
A AS (${A}),
B AS (${B})
SELECT COUNT(*) AS total
FROM (
  SELECT A.${idField}
  FROM A
  LEFT JOIN B ON B.${idField} = A.${idField}
  WHERE B.${idField} IS NULL
) X;
`.trim();
}
import type { DataThemeConfig, ThemeCondition } from '../types/data-theme-config.types';
import type { IndicatorCondition } from '../types/indicator-types';

import { normalizeOperator, isInOperator, isNullCheckOperator } from '../../../types/condition-operators';
import { getConceptByUuid } from '../../../resources/concepts/concepts.resource';

const DEMO_JOIN_TABLE = 'mamba_fact_patients_latest_patient_demographics';

function sqlQuote(v: string) {
    return `'${String(v).replace(/'/g, "''")}'`;
}

function qualifyColumn(col: string) {
    const c = String(col ?? '').trim();
    if (!c) return c;
    if (c.includes('.') || c.includes('(') || c.includes(' ') || c.includes('`')) return c;
    return `a.${c}`;
}

/**
 * Extract numeric concept ID from OpenMRS UUID format.
 * OpenMRS UUIDs for concepts are often: {numericId} + A... padding
 * e.g., "116128AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" → 116128
 * Returns original value if not in this format.
 */
function extractConceptIdFromUuid(uuid: string): string {
    const str = String(uuid).trim();
    // Match OpenMRS concept UUID format: numeric prefix followed by 'A' characters
    const match = str.match(/^(\d+)A+$/);
    if (match) return match[1];

    // Try extracting from standard UUID format that might have numeric prefix
    // e.g., "116128..." in various formats
    const numericPrefix = str.match(/^(\d+)/);
    if (numericPrefix) return numericPrefix[1];

    // Return original if no pattern matches
    return str;
}

function parseQaColumnsFromExpr(expr?: string | null) {
    const raw = String(expr ?? '').trim();
    if (!raw) return { questionColumn: undefined as string | undefined, answerColumn: undefined as string | undefined };

    const m = raw.match(/QA\s*$begin:math:text$\(\.\*\)$end:math:text$/i);
    if (!m) return { questionColumn: undefined, answerColumn: undefined };

    const inner = (m[1] ?? '').trim();
    if (!inner) return { questionColumn: undefined, answerColumn: undefined };

    const parts = inner
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);

    return { questionColumn: parts[0], answerColumn: parts[1] };
}

function looksLikeQaExpression(expr?: string | null) {
    const raw = String(expr ?? '').trim();
    return /^([a-z]\.)?QA\s*\(/i.test(raw);
}

type QAValue = {
    question?: string | number | null;
    questions?: Array<string | number>;
    answers?: Array<string | number>;
};

function isQAValue(v: any): v is QAValue {
    return v && typeof v === 'object' && ('question' in v || 'questions' in v || 'answers' in v);
}

function normalizeArrayValue(v: any) {
    const arr = Array.isArray(v) ? v : [v];
    return arr.map((x) => String(x)).filter((x) => x.trim().length > 0);
}

export function buildSqlPreview(themeCfg: DataThemeConfig, excludeDateFilter: boolean = false, countDistinctPatientId: boolean = false) {
    const src = themeCfg.sourceTable;
    const pid = themeCfg.patientIdColumn;
    const dateCol = themeCfg.dateColumn;

    const lines: string[] = [];
    lines.push(`SELECT`);
    lines.push(`  COUNT${countDistinctPatientId ? `(DISTINCT a.${pid})` : '(*)'} AS total`);
    lines.push(`FROM ${src} a`);
    lines.push(`JOIN ${DEMO_JOIN_TABLE} mdp`);
    lines.push(`  ON mdp.${pid} = a.${pid}`);
    lines.push(`WHERE`);

    // Build WHERE clause conditions
    // - The first condition never needs AND
    // - All subsequent conditions need AND prefix
    if (!excludeDateFilter) {
        // Date filtering enabled - date filters come first
        lines.push(`  a.${dateCol} >= ':startDate'`);
        lines.push(`  AND a.${dateCol} <  ':endDate'`);
    }

    // Demographic filters (always present, conditionally add AND prefix)
    const needsAnd = !excludeDateFilter; // Need AND if date filters were added
    if (needsAnd) {
        lines.push(`  AND mdp.birthdate IS NOT NULL`);
        lines.push(`  AND mdp.gender IS NOT NULL`);
    } else {
        lines.push(`  mdp.birthdate IS NOT NULL`);
        lines.push(`  AND mdp.gender IS NOT NULL`);
    }

    lines.push(`;`);

    return lines.join('\n');
}

export function applyConditionClauses(baseSql: string, themeConditions: ThemeCondition[], picked: IndicatorCondition[]) {
    const sqlLines = baseSql.split('\n');

    // Find WHERE clause and insert conditions after the last condition
    const whereIdx = sqlLines.findIndex((l) => l.trim() === 'WHERE');
    let insertAt = sqlLines.length; // Default to end if no WHERE found

    if (whereIdx >= 0) {
        // Find the last condition line before empty line, semicolon, or other SQL clauses
        for (let i = whereIdx + 1; i < sqlLines.length; i++) {
            const line = sqlLines[i]?.trim();
            // Stop at empty line, semicolon, JOIN, ORDER BY, GROUP BY, LIMIT, etc.
            if (!line || line === ';' || line.startsWith('JOIN') || line.startsWith('ORDER BY') ||
                line.startsWith('GROUP BY') || line.startsWith('LIMIT') || line.startsWith('HAVING')) {
                insertAt = i;
                break;
            }
        }
    }

    const clauses: string[] = [];

    // All clauses get AND prefix since we're appending after existing conditions
    const addClause = (clause: string) => {
        clauses.push(`  AND ${clause}`);
    };

    for (const tc of themeConditions ?? []) {
        const pc = picked.find((x) => x.key === tc.key);
        if (!pc) continue;

        const v: any = pc.value;
        if (v === null || v === undefined) continue;

        // ✅ Normalize operator tokens from theme/UI
        const op = normalizeOperator((pc.operator as any) ?? (tc.operator as any) ?? 'IN');

        // QUESTION_ANSWER_CONCEPT_SEARCH
        if (tc.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH' && isQAValue(v)) {
            const qVals: any[] = Array.isArray(v.questions)
                ? v.questions
                : v.question !== null && v.question !== undefined && String(v.question).trim() !== ''
                    ? [v.question]
                    : [];

            const av = Array.isArray(v.answers) ? v.answers : [];

            let questionColumn = (tc as any)?.columns?.question ?? (tc as any).questionColumn;
            let answerColumn = (tc as any)?.columns?.answer ?? (tc as any).answerColumn;

            if ((!questionColumn || !answerColumn) && (tc as any)?.column) {
                const parsed = parseQaColumnsFromExpr((tc as any).column);
                questionColumn = questionColumn ?? parsed.questionColumn;
                answerColumn = answerColumn ?? parsed.answerColumn;
            }

            const tcCol = (tc as any)?.column as string | undefined;
            if (!questionColumn && tcCol) questionColumn = tcCol;
            if (!answerColumn && tcCol && !looksLikeQaExpression(tcCol)) answerColumn = tcCol;

            if (questionColumn && qVals.length) {
                const arr = normalizeArrayValue(qVals);
                if (arr.length) {
                    const isNumericList = tc.valueType === 'conceptId' || arr.every((x) => /^[0-9]+$/.test(x));
                    const rendered = arr.map((x) => (isNumericList ? x : sqlQuote(x))).join(',');
                    const col = qualifyColumn(questionColumn);

                    // For questions we keep original behavior: single => =, many => IN (...)
                    if (arr.length === 1) addClause(`${col} = ${rendered}`);
                    else addClause(`${col} IN (${rendered})`);
                }
            }

            if (answerColumn && Array.isArray(av) && av.length) {
                const arr = normalizeArrayValue(av);
                if (arr.length) {
                    // For concept answer columns, extract numeric IDs from UUIDs
                    const isConceptColumn = /diagnosis_coded|diagnosis|concept|coded/i.test(answerColumn || '');
                    const shouldExtractIds = isConceptColumn && (
                        tc.valueType === 'conceptUuid' ||
                        arr.some((x) => /^[0-9]+A+$/.test(String(x))) || arr.some((x) => String(x).length > 20)
                    );

                    const processedArr = shouldExtractIds
                        ? arr.map((x) => extractConceptIdFromUuid(String(x)))
                        : arr;

                    const isNumericList = tc.valueType === 'conceptId' || processedArr.every((x) => /^[0-9]+$/.test(x));
                    const rendered = processedArr.map((x) => (isNumericList ? x : sqlQuote(x))).join(',');
                    const col = qualifyColumn(answerColumn);

                    // ✅ Always bracket IN/NOT IN
                    if (op === 'NOT IN') addClause(`${col} NOT IN (${rendered})`);
                    else addClause(`${col} IN (${rendered})`);
                }
            }

            continue;
        }

        // array values
        if (Array.isArray(v)) {
            const arr = normalizeArrayValue(v);
            if (!arr.length) continue;

            // For concept columns (diagnosis_coded, etc.), extract numeric IDs from UUIDs
            // This handles both explicit conceptUuid valueType and auto-detection of UUIDs
            const isConceptColumn = /diagnosis_coded|diagnosis|concept|coded/i.test(tc.column || '');
            const shouldExtractIds = isConceptColumn && (
                tc.valueType === 'conceptUuid' ||
                arr.some((x) => /^[0-9]+A+$/.test(String(x))) || arr.some((x) => String(x).length > 20)
            );

            const processedArr = shouldExtractIds
                ? arr.map((x) => extractConceptIdFromUuid(String(x)))
                : arr;

            const isNumericList = tc.valueType === 'conceptId' || processedArr.every((x) => /^[0-9]+$/.test(x));
            const rendered = processedArr.map((x) => (isNumericList ? x : sqlQuote(x))).join(',');

            const col = qualifyColumn(tc.column);

            // ✅ BETWEEN requires exactly 2 values: BETWEEN val1 AND val2
            if (op === 'BETWEEN') {
                if (arr.length === 2) {
                    const [v1, v2] = processedArr.map((x) => (isNumericList ? x : sqlQuote(x)));
                    addClause(`${col} BETWEEN ${v1} AND ${v2}`);
                }
                // If BETWEEN doesn't have exactly 2 values, skip it (invalid)
                continue;
            }

            if (op === 'NOT IN') addClause(`${col} NOT IN (${rendered})`);
            else if (op === 'IN') addClause(`${col} IN (${rendered})`);
            else addClause(`${col} ${op} (${rendered})`);

            continue;
        }

        // ✅ BETWEEN with { start, end } object format
        if (op === 'BETWEEN' && typeof v === 'object' && v !== null && 'start' in v && 'end' in v) {
            const startVal = (v as any).start;
            const endVal = (v as any).end;

            if (startVal !== null && startVal !== undefined && startVal !== '' &&
                endVal !== null && endVal !== undefined && endVal !== '') {

                const isNumericStart = tc.valueType === 'conceptId' || /^[0-9]+$/.test(String(startVal));
                const isNumericEnd = tc.valueType === 'conceptId' || /^[0-9]+$/.test(String(endVal));

                const renderedStart = isNumericStart ? startVal : sqlQuote(String(startVal));
                const renderedEnd = isNumericEnd ? endVal : sqlQuote(String(endVal));
                const col = qualifyColumn(tc.column);

                addClause(`${col} BETWEEN ${renderedStart} AND ${renderedEnd}`);
            }
            continue;
        }

        // other object not supported
        if (typeof v === 'object') continue;

        const col = qualifyColumn(tc.column);

        // ✅ IS NULL / IS NOT NULL - no value needed
        if (isNullCheckOperator(op)) {
            addClause(`${col} ${op}`);
            continue;
        }

        // scalar
        const sval = String(v);
        // Skip empty strings to avoid IN('') or similar invalid SQL
        if (sval === '') continue;

        const isNumeric = tc.valueType === 'conceptId' || /^[0-9]+$/.test(sval);
        const renderedScalar = isNumeric ? sval : sqlQuote(sval);

        // ✅ IN must always have brackets, even for scalar
        if (isInOperator(op)) {
            if (op === 'NOT IN') addClause(`${col} NOT IN (${renderedScalar})`);
            else addClause(`${col} IN (${renderedScalar})`);
        } else if (op === 'BETWEEN') {
            // BETWEEN with scalar is invalid (requires 2 values), skip it
            continue;
        } else {
            addClause(`${col} ${op} ${renderedScalar}`);
        }
    }

    sqlLines.splice(insertAt, 0, ...clauses);
    return sqlLines.join('\n');
}

/**
 * Async version of applyConditionClauses that fetches concept IDs from UUIDs.
 * Use this when conditions contain concept UUIDs that need to be resolved to numeric IDs.
 */
export async function applyConditionClausesAsync(
    baseSql: string,
    themeConditions: ThemeCondition[],
    picked: IndicatorCondition[],
    signal?: AbortSignal
): Promise<string> {
    const sqlLines = baseSql.split('\n');

    // Find WHERE clause and insert conditions after the last condition
    const whereIdx = sqlLines.findIndex((l) => l.trim() === 'WHERE');
    let insertAt = sqlLines.length; // Default to end if no WHERE found

    if (whereIdx >= 0) {
        // Find the last condition line before empty line, semicolon, or other SQL clauses
        for (let i = whereIdx + 1; i < sqlLines.length; i++) {
            const line = sqlLines[i]?.trim();
            // Stop at empty line, semicolon, JOIN, ORDER BY, GROUP BY, LIMIT, etc.
            if (!line || line === ';' || line.startsWith('JOIN') || line.startsWith('ORDER BY') ||
                line.startsWith('GROUP BY') || line.startsWith('LIMIT') || line.startsWith('HAVING')) {
                insertAt = i;
                break;
            }
        }
    }

    const clauses: string[] = [];

    // All clauses get AND prefix since we're appending after existing conditions
    const addClause = (clause: string) => {
        clauses.push(`  AND ${clause}`);
    };

    // Helper to resolve concept UUID to ID
    const resolveConceptId = async (uuid: string): Promise<string> => {
        const str = String(uuid).trim();
        // First try to extract from OpenMRS UUID format (numeric prefix + A's)
        const match = str.match(/^(\d+)A+$/);
        if (match) return match[1];

        // If it's not in OpenMRS UUID format, fetch from API
        try {
            const concept = await getConceptByUuid(str, signal);
            return String(concept.id);
        } catch (e) {
            // If API call fails, fall back to original value
            console.warn(`Failed to resolve concept UUID ${str}:`, e);
            return str;
        }
    };

    // Helper to resolve multiple UUIDs in parallel
    const resolveConceptIds = async (values: string[]): Promise<string[]> => {
        // First filter out values that are already numeric (no need to fetch)
        const numericValues: string[] = [];
        const uuidValues: string[] = [];

        for (const v of values) {
            const trimmed = v.trim();
            // Check if it's already a number or in OpenMRS UUID format (can extract without API)
            const match = trimmed.match(/^(\d+)A+$/);
            if (match) {
                numericValues.push(match[1]);
            } else if (/^\d+$/.test(trimmed)) {
                numericValues.push(trimmed);
            } else {
                uuidValues.push(trimmed);
            }
        }

        // Fetch UUIDs in parallel
        const resolved = await Promise.all(
            uuidValues.map(uuid => resolveConceptId(uuid))
        );

        return [...numericValues, ...resolved];
    };

    for (const tc of themeConditions ?? []) {
        const pc = picked.find((x) => x.key === tc.key);
        if (!pc) continue;

        const v: any = pc.value;
        if (v === null || v === undefined) continue;

        // Normalize operator tokens from theme/UI
        const op = normalizeOperator((pc.operator as any) ?? (tc.operator as any) ?? 'IN');

        // QUESTION_ANSWER_CONCEPT_SEARCH
        if (tc.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH' && isQAValue(v)) {
            const qVals: any[] = Array.isArray(v.questions)
                ? v.questions
                : v.question !== null && v.question !== undefined && String(v.question).trim() !== ''
                    ? [v.question]
                    : [];

            const av = Array.isArray(v.answers) ? v.answers : [];

            let questionColumn = (tc as any)?.columns?.question ?? (tc as any).questionColumn;
            let answerColumn = (tc as any)?.columns?.answer ?? (tc as any).answerColumn;

            if ((!questionColumn || !answerColumn) && (tc as any)?.column) {
                const parsed = parseQaColumnsFromExpr((tc as any).column);
                questionColumn = questionColumn ?? parsed.questionColumn;
                answerColumn = answerColumn ?? parsed.answerColumn;
            }

            const tcCol = (tc as any)?.column as string | undefined;
            if (!questionColumn && tcCol) questionColumn = tcCol;
            if (!answerColumn && tcCol && !looksLikeQaExpression(tcCol)) answerColumn = tcCol;

            if (questionColumn && qVals.length) {
                const arr = normalizeArrayValue(qVals);
                if (arr.length) {
                    // Resolve concept IDs if this is a concept column
                    const isConceptColumn = /question|concept|coded/i.test(questionColumn || '');
                    const shouldFetch = isConceptColumn && tc.valueType === 'conceptUuid';

                    const processedArr = shouldFetch
                        ? await resolveConceptIds(arr)
                        : arr;

                    const isNumericList = tc.valueType === 'conceptId' || processedArr.every((x) => /^[0-9]+$/.test(x));
                    const rendered = processedArr.map((x) => (isNumericList ? x : sqlQuote(x))).join(',');
                    const col = qualifyColumn(questionColumn);

                    if (arr.length === 1) addClause(`${col} = ${rendered}`);
                    else addClause(`${col} IN (${rendered})`);
                }
            }

            if (answerColumn && Array.isArray(av) && av.length) {
                const arr = normalizeArrayValue(av);
                if (arr.length) {
                    const isConceptColumn = /diagnosis_coded|diagnosis|concept|coded/i.test(answerColumn || '');
                    const shouldFetch = isConceptColumn && tc.valueType === 'conceptUuid';

                    const processedArr = shouldFetch
                        ? await resolveConceptIds(arr)
                        : arr;

                    const isNumericList = tc.valueType === 'conceptId' || processedArr.every((x) => /^[0-9]+$/.test(x));
                    const rendered = processedArr.map((x) => (isNumericList ? x : sqlQuote(x))).join(',');
                    const col = qualifyColumn(answerColumn);

                    if (op === 'NOT IN') addClause(`${col} NOT IN (${rendered})`);
                    else addClause(`${col} IN (${rendered})`);
                }
            }

            continue;
        }

        // array values
        if (Array.isArray(v)) {
            const arr = normalizeArrayValue(v);
            if (!arr.length) continue;

            const isConceptColumn = /diagnosis_coded|diagnosis|concept|coded/i.test(tc.column || '');
            const shouldFetch = isConceptColumn && tc.valueType === 'conceptUuid';

            const processedArr = shouldFetch
                ? await resolveConceptIds(arr)
                : arr;

            const isNumericList = tc.valueType === 'conceptId' || processedArr.every((x) => /^[0-9]+$/.test(x));
            const rendered = processedArr.map((x) => (isNumericList ? x : sqlQuote(x))).join(',');

            const col = qualifyColumn(tc.column);

            if (op === 'BETWEEN') {
                if (arr.length === 2) {
                    const [v1, v2] = processedArr.map((x) => (isNumericList ? x : sqlQuote(x)));
                    addClause(`${col} BETWEEN ${v1} AND ${v2}`);
                }
                continue;
            }

            if (op === 'NOT IN') addClause(`${col} NOT IN (${rendered})`);
            else if (op === 'IN') addClause(`${col} IN (${rendered})`);
            else addClause(`${col} ${op} (${rendered})`);

            continue;
        }

        // BETWEEN with { start, end } object format
        if (op === 'BETWEEN' && typeof v === 'object' && v !== null && 'start' in v && 'end' in v) {
            const startVal = (v as any).start;
            const endVal = (v as any).end;

            if (startVal !== null && startVal !== undefined && startVal !== '' &&
                endVal !== null && endVal !== undefined && endVal !== '') {

                const isConceptColumn = /diagnosis_coded|diagnosis|concept|coded/i.test(tc.column || '');
                const shouldFetch = isConceptColumn && tc.valueType === 'conceptUuid';

                let processedStart = String(startVal);
                let processedEnd = String(endVal);

                if (shouldFetch) {
                    const resolved = await resolveConceptIds([processedStart, processedEnd]);
                    processedStart = resolved[0];
                    processedEnd = resolved[1];
                }

                const isNumericStart = tc.valueType === 'conceptId' || /^[0-9]+$/.test(processedStart);
                const isNumericEnd = tc.valueType === 'conceptId' || /^[0-9]+$/.test(processedEnd);

                const renderedStart = isNumericStart ? processedStart : sqlQuote(processedStart);
                const renderedEnd = isNumericEnd ? processedEnd : sqlQuote(processedEnd);
                const col = qualifyColumn(tc.column);

                addClause(`${col} BETWEEN ${renderedStart} AND ${renderedEnd}`);
            }
            continue;
        }

        // other object not supported
        if (typeof v === 'object') continue;

        const col = qualifyColumn(tc.column);

        // IS NULL / IS NOT NULL - no value needed
        if (isNullCheckOperator(op)) {
            addClause(`${col} ${op}`);
            continue;
        }

        // scalar
        const sval = String(v);
        if (sval === '') continue;

        const isConceptColumn = /diagnosis_coded|diagnosis|concept|coded/i.test(tc.column || '');
        const shouldFetch = isConceptColumn && tc.valueType === 'conceptUuid';

        let processedScalar = sval;
        if (shouldFetch) {
            const resolved = await resolveConceptIds([sval]);
            processedScalar = resolved[0];
        }

        const isNumeric = tc.valueType === 'conceptId' || /^[0-9]+$/.test(processedScalar);
        const renderedScalar = isNumeric ? processedScalar : sqlQuote(processedScalar);

        if (isInOperator(op)) {
            if (op === 'NOT IN') addClause(`${col} NOT IN (${renderedScalar})`);
            else addClause(`${col} IN (${renderedScalar})`);
        } else if (op === 'BETWEEN') {
            continue;
        } else {
            addClause(`${col} ${op} ${renderedScalar}`);
        }
    }

    sqlLines.splice(insertAt, 0, ...clauses);
    return sqlLines.join('\n');
}

export type CustomCondition = {
    id: string;
    column: string;
    operator: string;
    value: string | string[] | boolean | { start: string; end: string };
    wildcardMode?: 'none' | 'contains' | 'startsWith' | 'endsWith';
};

/**
 * Applies custom user-defined conditions to the SQL.
 * These conditions are defined by the user during indicator creation,
 * separate from the theme-defined conditions.
 */
export function applyCustomConditions(baseSql: string, customConditions: CustomCondition[]): string {
    if (!customConditions || customConditions.length === 0) return baseSql;

    const sqlLines = baseSql.split('\n');

    // Find WHERE clause and insert conditions after the last condition
    const whereIdx = sqlLines.findIndex((l) => l.trim() === 'WHERE');
    let insertAt = sqlLines.length; // Default to end if no WHERE found

    if (whereIdx >= 0) {
        // Find the last condition line before empty line, semicolon, or other SQL clauses
        for (let i = whereIdx + 1; i < sqlLines.length; i++) {
            const line = sqlLines[i]?.trim();
            // Stop at empty line, semicolon, JOIN, ORDER BY, GROUP BY, LIMIT, etc.
            if (!line || line === ';' || line.startsWith('JOIN') || line.startsWith('ORDER BY') ||
                line.startsWith('GROUP BY') || line.startsWith('LIMIT') || line.startsWith('HAVING')) {
                insertAt = i;
                break;
            }
        }
    }

    const clauses: string[] = [];

    // All clauses get AND prefix since we're appending after existing conditions
    const addClause = (clause: string) => {
        clauses.push(`  AND ${clause}`);
    };

    for (const cc of customConditions) {
        const col = qualifyColumn(cc.column);
        const op = normalizeOperator(cc.operator);
        const v: any = cc.value;

        // IS NULL / IS NOT NULL - no value needed
        if (isNullCheckOperator(op)) {
            if (v === true) {
                addClause(`${col} ${op}`);
            }
            continue;
        }

        // Array values (IN, NOT IN)
        if (Array.isArray(v)) {
            if (v.length === 0) continue;

            const isNumericList = v.every((x) => /^[0-9]+$/.test(String(x)));
            const rendered = v.map((x) => (isNumericList ? x : sqlQuote(String(x)))).join(',');

            if (op === 'NOT IN') addClause(`${col} NOT IN (${rendered})`);
            else if (op === 'IN') addClause(`${col} IN (${rendered})`);
            else addClause(`${col} ${op} (${rendered})`);
            continue;
        }

        // BETWEEN with { start, end } object or JSON string
        let betweenObj: { start: string; end: string } | null = null;
        if (typeof v === 'object' && v !== null && 'start' in v && 'end' in v) {
            betweenObj = v as { start: string; end: string };
        } else if (typeof v === 'string') {
            try {
                const parsed = JSON.parse(v);
                if (parsed && typeof parsed === 'object' && 'start' in parsed && 'end' in parsed) {
                    betweenObj = parsed;
                }
            } catch {
                // Not valid JSON, continue to other handlers
            }
        }

        if (betweenObj) {
            const startVal = betweenObj.start;
            const endVal = betweenObj.end;

            if (startVal !== null && startVal !== undefined && startVal !== '' &&
                endVal !== null && endVal !== undefined && endVal !== '') {

                const isNumericStart = /^[0-9]+$/.test(String(startVal));
                const isNumericEnd = /^[0-9]+$/.test(String(endVal));

                const renderedStart = isNumericStart ? startVal : sqlQuote(String(startVal));
                const renderedEnd = isNumericEnd ? endVal : sqlQuote(String(endVal));

                addClause(`${col} BETWEEN ${renderedStart} AND ${renderedEnd}`);
            }
            continue;
        }

        // Scalar values
        const sval = String(v);
        if (sval === '') continue;

        // Check for comma-separated values in IN/NOT IN
        if (isInOperator(op) && sval.includes(',')) {
            const parts = sval.split(',').map((x) => x.trim()).filter(Boolean);
            if (parts.length === 0) continue;

            const isNumericList = parts.every((x) => /^[0-9]+$/.test(x));
            const rendered = parts.map((x) => (isNumericList ? x : sqlQuote(x))).join(',');

            if (op === 'NOT IN') addClause(`${col} NOT IN (${rendered})`);
            else addClause(`${col} IN (${rendered})`);
            continue;
        }

        // Single scalar value
        const isNumeric = /^[0-9]+$/.test(sval);
        const renderedScalar = isNumeric ? sval : sqlQuote(sval);

        if (isInOperator(op)) {
            if (op === 'NOT IN') addClause(`${col} NOT IN (${renderedScalar})`);
            else addClause(`${col} IN (${renderedScalar})`);
        } else if (op === 'BETWEEN') {
            // BETWEEN with scalar is invalid
            continue;
        } else if (op === 'LIKE') {
            // Apply wildcard mode
            let likeValue = sval;
            if (cc.wildcardMode === 'contains') {
                likeValue = `%${sval}%`;
            } else if (cc.wildcardMode === 'startsWith') {
                likeValue = `${sval}%`;
            } else if (cc.wildcardMode === 'endsWith') {
                likeValue = `%${sval}`;
            }
            // 'none' uses the value as-is
            const renderedLike = sqlQuote(likeValue);
            addClause(`${col} LIKE ${renderedLike}`);
        } else {
            addClause(`${col} ${op} ${renderedScalar}`);
        }
    }

    if (clauses.length === 0) return baseSql;

    sqlLines.splice(insertAt, 0, ...clauses);
    return sqlLines.join('\n');
}
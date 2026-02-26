import type { DataThemeConfig, ThemeCondition } from '../types/data-theme-config.types';
import type { IndicatorCondition } from '../types/indicator-types';

import { normalizeOperator, isInOperator } from '../../../types/condition-operators';

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

export function buildSqlPreview(themeCfg: DataThemeConfig) {
    const src = themeCfg.sourceTable;
    const pid = themeCfg.patientIdColumn;
    const dateCol = themeCfg.dateColumn;

    const lines: string[] = [];
    lines.push(`SELECT`);
    lines.push(`  COUNT(*) AS total`);
    lines.push(`FROM ${src} a`);
    lines.push(`JOIN ${DEMO_JOIN_TABLE} mdp`);
    lines.push(`  ON mdp.patient_id = a.${pid}`);
    lines.push(`WHERE a.${dateCol} >= ':startDate'`);
    lines.push(`  AND a.${dateCol} <  ':endDate'`);
    lines.push(`  AND mdp.birthdate IS NOT NULL`);
    lines.push(`  AND mdp.gender IS NOT NULL`);
    lines.push(`;`);

    return lines.join('\n');
}

export function applyConditionClauses(baseSql: string, themeConditions: ThemeCondition[], picked: IndicatorCondition[]) {
    const sqlLines = baseSql.split('\n');

    const demoBirthIdx = sqlLines.findIndex((l) => l.includes('mdp.birthdate IS NOT NULL'));
    const insertAt = demoBirthIdx > -1 ? demoBirthIdx : sqlLines.length;

    const clauses: string[] = [];

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
                    if (arr.length === 1) clauses.push(`  AND ${col} = ${rendered}`);
                    else clauses.push(`  AND ${col} IN (${rendered})`);
                }
            }

            if (answerColumn && Array.isArray(av) && av.length) {
                const arr = normalizeArrayValue(av);
                if (arr.length) {
                    const isNumericList = tc.valueType === 'conceptId' || arr.every((x) => /^[0-9]+$/.test(x));
                    const rendered = arr.map((x) => (isNumericList ? x : sqlQuote(x))).join(',');
                    const col = qualifyColumn(answerColumn);

                    // ✅ Always bracket IN/NOT IN
                    if (op === 'NOT IN') clauses.push(`  AND ${col} NOT IN (${rendered})`);
                    else clauses.push(`  AND ${col} IN (${rendered})`);
                }
            }

            continue;
        }

        // array values
        if (Array.isArray(v)) {
            const arr = normalizeArrayValue(v);
            if (!arr.length) continue;

            const isNumericList = tc.valueType === 'conceptId' || arr.every((x) => /^[0-9]+$/.test(x));
            const rendered = arr.map((x) => (isNumericList ? x : sqlQuote(x))).join(',');

            const col = qualifyColumn(tc.column);

            if (op === 'NOT IN') clauses.push(`  AND ${col} NOT IN (${rendered})`);
            else if (op === 'IN') clauses.push(`  AND ${col} IN (${rendered})`);
            else clauses.push(`  AND ${col} ${op} (${rendered})`);

            continue;
        }

        // other object not supported
        if (typeof v === 'object') continue;

        // scalar
        const sval = String(v);
        const isNumeric = tc.valueType === 'conceptId' || /^[0-9]+$/.test(sval);
        const renderedScalar = isNumeric ? sval : sqlQuote(sval);

        const col = qualifyColumn(tc.column);

        // ✅ IN must always have brackets, even for scalar
        if (isInOperator(op)) {
            if (op === 'NOT IN') clauses.push(`  AND ${col} NOT IN (${renderedScalar})`);
            else clauses.push(`  AND ${col} IN (${renderedScalar})`);
        } else {
            clauses.push(`  AND ${col} ${op} ${renderedScalar}`);
        }
    }

    sqlLines.splice(insertAt, 0, ...clauses);
    return sqlLines.join('\n');
}
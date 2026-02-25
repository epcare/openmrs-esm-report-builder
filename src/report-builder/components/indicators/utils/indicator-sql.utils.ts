import type { DataThemeConfig, ThemeCondition } from '../types/data-theme-config.types';
import type { IndicatorCondition } from '../types/indicator-types';

const DEMO_JOIN_TABLE = 'mamba_fact_patients_latest_patient_demographics';

function sqlQuote(v: string) {
    return `'${String(v).replace(/'/g, "''")}'`;
}

function qualifyColumn(col: string) {
    const c = String(col ?? '').trim();
    if (!c) return c;
    // already qualified or expression-like
    if (c.includes('.') || c.includes('(') || c.includes(' ') || c.includes('`')) return c;
    return `a.${c}`;
}

// Back-compat: some themes stored QA columns inside tc.column like:
//   QA(obs_question_concept_id,obs_value_coded)
// or  a.QA(obs_question_concept_id,obs_value_coded)
function parseQaColumnsFromExpr(expr?: string | null) {
    const raw = String(expr ?? '').trim();
    if (!raw) return { questionColumn: undefined as string | undefined, answerColumn: undefined as string | undefined };

    const m = raw.match(/QA\s*\((.*)\)/i);
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
    // legacy single question
    question?: string | number | null;
    // current multi-question
    questions?: Array<string | number>;
    answers?: Array<string | number>;
};

function isQAValue(v: any): v is QAValue {
    return v && typeof v === 'object' && ('question' in v || 'questions' in v || 'answers' in v);
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

        const op = pc.operator ?? tc.operator ?? 'IN';

        // QUESTION_ANSWER_CONCEPT_SEARCH => legacy { question, answers[] } OR current { questions[], answers[] }
        if (tc.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH' && isQAValue(v)) {
            const qVals: any[] = Array.isArray(v.questions)
                ? v.questions
                : v.question !== null && v.question !== undefined && String(v.question).trim() !== ''
                    ? [v.question]
                    : [];

            const av = Array.isArray(v.answers) ? v.answers : [];

            // Prefer explicit columns from theme config.
            let questionColumn = (tc as any)?.columns?.question ?? (tc as any).questionColumn;
            let answerColumn = (tc as any)?.columns?.answer ?? (tc as any).answerColumn;

            // Back-compat: if columns are missing but tc.column looks like QA(qCol,aCol), extract args.
            if ((!questionColumn || !answerColumn) && (tc as any)?.column) {
                const parsed = parseQaColumnsFromExpr((tc as any).column);
                questionColumn = questionColumn ?? parsed.questionColumn;
                answerColumn = answerColumn ?? parsed.answerColumn;
            }

            // Last resort:
            // - questionColumn can fall back to tc.column (best-effort)
            // - BUT answerColumn must NOT fall back to tc.column if tc.column is a QA(...) expression,
            //   otherwise we generate duplicate clauses on the same expression.
            const tcCol = (tc as any)?.column as string | undefined;
            if (!questionColumn && tcCol) questionColumn = tcCol;
            if (!answerColumn && tcCol && !looksLikeQaExpression(tcCol)) answerColumn = tcCol;

            if (questionColumn && qVals.length) {
                const arr = qVals.map((x) => String(x)).filter((x) => x.trim().length > 0);
                if (arr.length) {
                    const isNumericList = tc.valueType === 'conceptId' || arr.every((x) => /^[0-9]+$/.test(x));
                    const rendered = arr.map((x) => (isNumericList ? x : sqlQuote(x))).join(',');
                    const col = qualifyColumn(questionColumn);
                    if (arr.length === 1) clauses.push(`  AND ${col} = ${rendered}`);
                    else clauses.push(`  AND ${col} IN (${rendered})`);
                }
            }

            if (answerColumn && Array.isArray(av) && av.length) {
                const arr = av.map((x) => String(x)).filter((x) => x.trim().length > 0);
                if (arr.length) {
                    const isNumericList = tc.valueType === 'conceptId' || arr.every((x) => /^[0-9]+$/.test(x));
                    const rendered = arr.map((x) => (isNumericList ? x : sqlQuote(x))).join(',');
                    const col = qualifyColumn(answerColumn);

                    // Multiple answers should always use IN/NOT_IN semantics.
                    if (arr.length > 1) {
                        if (op === 'NOT_IN') clauses.push(`  AND ${col} NOT IN (${rendered})`);
                        else clauses.push(`  AND ${col} IN (${rendered})`);
                    } else {
                        if (op === 'IN') clauses.push(`  AND ${col} IN (${rendered})`);
                        else if (op === 'NOT_IN') clauses.push(`  AND ${col} NOT IN (${rendered})`);
                        else clauses.push(`  AND ${col} ${op} ${rendered}`);
                    }
                }
            }

            continue;
        }

        // normal array
        if (Array.isArray(v)) {
            const arr = v.map((x) => String(x)).filter((x) => x.trim().length > 0);
            if (!arr.length) continue;

            const isNumericList = tc.valueType === 'conceptId' || arr.every((x) => /^[0-9]+$/.test(x));
            const rendered = arr.map((x) => (isNumericList ? x : sqlQuote(x))).join(',');

            if (op === 'IN') clauses.push(`  AND a.${tc.column} IN (${rendered})`);
            else if (op === 'NOT_IN') clauses.push(`  AND a.${tc.column} NOT IN (${rendered})`);
            else clauses.push(`  AND a.${tc.column} ${op} (${rendered})`);

            continue;
        }

        // other object (range etc) not yet
        if (typeof v === 'object') continue;

        // scalar
        const sval = String(v);
        const isNumeric = tc.valueType === 'conceptId' || /^[0-9]+$/.test(sval);
        clauses.push(`  AND a.${tc.column} ${op} ${isNumeric ? sval : sqlQuote(sval)}`);
    }

    sqlLines.splice(insertAt, 0, ...clauses);
    return sqlLines.join('\n');
}
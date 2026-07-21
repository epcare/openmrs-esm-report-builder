import type { DataThemeConfig, ThemeCondition } from '../../../types/theme/data-theme.types';
import type { IndicatorCondition } from '../types/indicator-types';

import { normalizeOperator, isInOperator } from '../../../types/condition-operators';

const DEMO_JOIN_TABLE = 'mamba_fact_patients_latest_patient_demographics';

function sqlQuote(v: string) {
    return `'${String(v).replace(/'/g, "''")}'`;
}

function qualifyColumn(col: string, tableAlias: string = 'a') {
    const c = String(col ?? '').trim();
    if (!c) return c;
    if (c.includes('.') || c.includes('(') || c.includes(' ') || c.includes('`')) return c;
    return `${tableAlias}.${c}`;
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
    const sources = themeCfg.sourceTables ?? [];
    const strategy = themeCfg.combinationStrategy ?? 'UNION_ALL';
    const pid = themeCfg.patientIdColumn;
    const dateCol = themeCfg.dateColumn;
    const sourceJoins = themeCfg.sourceJoins ?? [];

    if (sources.length === 0) {
        return '-- No sources configured';
    }

    // Single source - no combination needed
    if (sources.length === 1) {
        const lines: string[] = [];
        lines.push(`SELECT COUNT(*) AS total`);
        lines.push(`FROM ${sources[0]} a`);
        lines.push(`JOIN ${DEMO_JOIN_TABLE} mdp ON mdp.patient_id = a.${pid}`);
        lines.push(`WHERE a.${dateCol} >= ':startDate'`);
        lines.push(`  AND a.${dateCol} < ':endDate'`);
        lines.push(`  AND mdp.birthdate IS NOT NULL`);
        lines.push(`  AND mdp.gender IS NOT NULL`);
        lines.push(`;`);
        return lines.join('\n');
    }

    // Multi-source - generate based on combination strategy
    const lines: string[] = [];

    switch (strategy) {
        case 'UNION':
        case 'UNION_ALL':
            lines.push(`SELECT COUNT(*) AS total FROM (`);

            sources.forEach((table, index) => {
                const alias = `src${index}`;
                const unionKeyword = strategy === 'UNION_ALL' ? 'UNION ALL' : 'UNION';

                if (index === 0) {
                    lines.push(`  SELECT ${alias}.${pid} FROM ${table} ${alias}`);
                } else {
                    lines.push(`  ${unionKeyword}`);
                    lines.push(`  SELECT ${alias}.${pid} FROM ${table} ${alias}`);
                }
            });

            lines.push(`) AS all_sources`);
            lines.push(`JOIN ${DEMO_JOIN_TABLE} mdp ON mdp.patient_id = all_sources.${pid}`);
            lines.push(`WHERE all_sources.${dateCol} >= ':startDate'`);
            lines.push(`  AND all_sources.${dateCol} < ':endDate'`);
            lines.push(`  AND mdp.birthdate IS NOT NULL`);
            lines.push(`  AND mdp.gender IS NOT NULL`);
            break;

        case 'INTERSECTION':
            // Use INNER JOIN for intersection
            lines.push(`SELECT COUNT(*) AS total FROM (`);
            lines.push(`  SELECT src0.${pid} FROM ${sources[0]} src0`);

            for (let i = 1; i < sources.length; i++) {
                const alias = `src${i}`;
                lines.push(`  INNER JOIN (`);
                lines.push(`    SELECT ${alias}.${pid} FROM ${sources[i]} ${alias}`);
                lines.push(`  ) ${alias} ON ${alias}.${pid} = src0.${pid}`);
            }

            lines.push(`) AS all_sources`);
            lines.push(`JOIN ${DEMO_JOIN_TABLE} mdp ON mdp.patient_id = all_sources.${pid}`);
            lines.push(`WHERE all_sources.${dateCol} >= ':startDate'`);
            lines.push(`  AND all_sources.${dateCol} < ':endDate'`);
            lines.push(`  AND mdp.birthdate IS NOT NULL`);
            lines.push(`  AND mdp.gender IS NOT NULL`);
            break;

        case 'EXCEPT':
            // Use LEFT JOIN with NULL check for EXCEPT
            lines.push(`SELECT COUNT(*) AS total FROM (`);
            lines.push(`  SELECT src0.${pid} FROM ${sources[0]} src0`);

            for (let i = 1; i < sources.length; i++) {
                const alias = `src${i}`;
                lines.push(`  LEFT JOIN (`);
                lines.push(`    SELECT ${alias}.${pid} FROM ${sources[i]} ${alias}`);
                lines.push(`  ) ${alias} ON ${alias}.${pid} = src0.${pid}`);
            }

            lines.push(`  WHERE 1=1`);

            for (let i = 1; i < sources.length; i++) {
                lines.push(`    AND src${i}.${pid} IS NULL`);
            }

            lines.push(`) AS all_sources`);
            lines.push(`JOIN ${DEMO_JOIN_TABLE} mdp ON mdp.patient_id = all_sources.${pid}`);
            lines.push(`WHERE all_sources.${dateCol} >= ':startDate'`);
            lines.push(`  AND all_sources.${dateCol} < ':endDate'`);
            lines.push(`  AND mdp.birthdate IS NOT NULL`);
            lines.push(`  AND mdp.gender IS NOT NULL`);
            break;

        case 'CUSTOM': {
            // Build custom join configuration
            if (sourceJoins.length === 0) {
                return '-- Custom joins selected but no joins configured. Please add joins below.';
            }

            lines.push(`SELECT COUNT(*) AS total FROM (`);

            // Build a joined table from all sources
            // Start with the first source that's referenced in joins
            const allReferencedSources = new Set<string>();
            for (const join of sourceJoins) {
                allReferencedSources.add(join.fromSource);
                allReferencedSources.add(join.toSource);
            }
            const sortedSources = sources.filter((s) => allReferencedSources.has(s));

            if (sortedSources.length === 0) {
                return '-- Custom joins configured but no valid sources found in join definitions.';
            }

            const primarySource = sortedSources[0];
            const primaryAlias = 'src0';

            lines.push(`  SELECT DISTINCT ${primaryAlias}.${pid}`);
            lines.push(`  FROM ${primarySource} ${primaryAlias}`);

            // Build graph of joins to traverse
            const joinGraph = new Map<string, Array<{ to: string; type: string; condition: string }>>();
            for (const join of sourceJoins) {
                if (!joinGraph.has(join.fromSource)) {
                    joinGraph.set(join.fromSource, []);
                }
                joinGraph.get(join.fromSource)!.push({
                    to: join.toSource,
                    type: join.joinType,
                    condition: join.joinCondition,
                });
            }

            // Add joins using BFS traversal
            const visited = new Set<string>([primarySource]);
            const queue = [primarySource];

            while (queue.length > 0) {
                const current = queue.shift()!;

                const joins = joinGraph.get(current) ?? [];
                for (const join of joins) {
                    if (visited.has(join.to)) continue;

                    const toIdx = sources.indexOf(join.to);
                    const toAlias = `src${toIdx}`;

                    lines.push(`  ${join.type} JOIN ${join.to} ${toAlias} ON ${join.condition}`);

                    visited.add(join.to);
                    queue.push(join.to);
                }
            }

            lines.push(`) AS all_sources`);
            lines.push(`JOIN ${DEMO_JOIN_TABLE} mdp ON mdp.patient_id = all_sources.${pid}`);
            lines.push(`WHERE all_sources.${dateCol} >= ':startDate'`);
            lines.push(`  AND all_sources.${dateCol} < ':endDate'`);
            lines.push(`  AND mdp.birthdate IS NOT NULL`);
            lines.push(`  AND mdp.gender IS NOT NULL`);
            break;
        }
    }

    lines.push(`;`);
    return lines.join('\n');
}

/**
 * Builds SQL clauses for a single theme condition.
 * Returns an array of SQL clause strings.
 */
function buildClausesForCondition(
    tc: ThemeCondition,
    pc: IndicatorCondition,
    tableAlias: string = 'a'
): string[] {
    const clauses: string[] = [];
    const v: any = pc.value;

    if (v === null || v === undefined) return clauses;

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
                const col = qualifyColumn(questionColumn, tableAlias);

                if (arr.length === 1) clauses.push(`  AND ${col} = ${rendered}`);
                else clauses.push(`  AND ${col} IN (${rendered})`);
            }
        }

        if (answerColumn && Array.isArray(av) && av.length) {
            const arr = normalizeArrayValue(av);
            if (arr.length) {
                const isNumericList = tc.valueType === 'conceptId' || arr.every((x) => /^[0-9]+$/.test(x));
                const rendered = arr.map((x) => (isNumericList ? x : sqlQuote(x))).join(',');
                const col = qualifyColumn(answerColumn, tableAlias);

                if (op === 'NOT IN') clauses.push(`  AND ${col} NOT IN (${rendered})`);
                else clauses.push(`  AND ${col} IN (${rendered})`);
            }
        }

        return clauses;
    }

    // array values
    if (Array.isArray(v)) {
        const arr = normalizeArrayValue(v);
        if (!arr.length) return clauses;

        const isNumericList = tc.valueType === 'conceptId' || arr.every((x) => /^[0-9]+$/.test(x));
        const rendered = arr.map((x) => (isNumericList ? x : sqlQuote(x))).join(',');
        const col = qualifyColumn(tc.column, tableAlias);

        if (op === 'BETWEEN') {
            if (arr.length === 2) {
                const [v1, v2] = arr.map((x) => (isNumericList ? x : sqlQuote(x)));
                clauses.push(`  AND ${col} BETWEEN ${v1} AND ${v2}`);
            }
            return clauses;
        }

        if (op === 'NOT IN') clauses.push(`  AND ${col} NOT IN (${rendered})`);
        else if (op === 'IN') clauses.push(`  AND ${col} IN (${rendered})`);
        else clauses.push(`  AND ${col} ${op} (${rendered})`);

        return clauses;
    }

    // BETWEEN with { start, end } object format
    if (op === 'BETWEEN' && typeof v === 'object' && v !== null && 'start' in v && 'end' in v) {
        const startVal = (v as any).start;
        const endVal = (v as any).end;

        if (startVal !== null && startVal !== undefined && startVal !== '' &&
            endVal !== null && endVal !== undefined && endVal !== '') {

            const isNumericStart = tc.valueType === 'conceptId' || /^[0-9]+$/.test(String(startVal));
            const isNumericEnd = tc.valueType === 'conceptId' || /^[0-9]+$/.test(String(endVal));

            const renderedStart = isNumericStart ? startVal : sqlQuote(String(startVal));
            const renderedEnd = isNumericEnd ? endVal : sqlQuote(String(endVal));
            const col = qualifyColumn(tc.column, tableAlias);

            clauses.push(`  AND ${col} BETWEEN ${renderedStart} AND ${renderedEnd}`);
        }
        return clauses;
    }

    // other object not supported
    if (typeof v === 'object') return clauses;

    // scalar
    const sval = String(v);
    const isNumeric = tc.valueType === 'conceptId' || /^[0-9]+$/.test(sval);
    const renderedScalar = isNumeric ? sval : sqlQuote(sval);

    const col = qualifyColumn(tc.column, tableAlias);

    if (isInOperator(op)) {
        if (op === 'NOT IN') clauses.push(`  AND ${col} NOT IN (${renderedScalar})`);
        else clauses.push(`  AND ${col} IN (${renderedScalar})`);
    } else if (op === 'BETWEEN') {
        // BETWEEN with scalar is invalid
        return clauses;
    } else {
        clauses.push(`  AND ${col} ${op} ${renderedScalar}`);
    }

    return clauses;
}

export function applyConditionClauses(
    baseSql: string,
    themeConditions: ThemeCondition[],
    picked: IndicatorCondition[],
    sourceTables?: string[]
) {
    const sqlLines = baseSql.split('\n');

    // Group conditions by source
    const conditionsBySource = new Map<string, string[]>();
    const globalConditions: string[] = [];

    for (const tc of themeConditions ?? []) {
        const pc = picked.find((x) => x.key === tc.key);
        if (!pc) continue;

        const source = tc.source;
        if (source && sourceTables && sourceTables.includes(source)) {
            // Source-specific condition
            const sourceIndex = sourceTables.indexOf(source);
            const sourceKey = `src${sourceIndex}`;
            if (!conditionsBySource.has(sourceKey)) {
                conditionsBySource.set(sourceKey, []);
            }
            const clauses = buildClausesForCondition(tc, pc, sourceKey);
            conditionsBySource.get(sourceKey)!.push(...clauses);
        } else {
            // Global condition
            const clauses = buildClausesForCondition(tc, pc, 'all_sources');
            globalConditions.push(...clauses);
        }
    }

    // For multi-source SQL with source-specific conditions, insert into UNION branches
    if (sourceTables && sourceTables.length > 0 && conditionsBySource.size > 0) {
        const modifiedLines = [...sqlLines];

        // Find each UNION branch and insert its conditions
        sourceTables.forEach((table, index) => {
            const alias = `src${index}`;
            // Find the SELECT line for this source
            const branchLine = modifiedLines.findIndex((l) =>
                l.includes(`SELECT ${alias}.`) && l.includes(`FROM ${table} ${alias}`)
            );

            if (branchLine > -1 && conditionsBySource.has(alias)) {
                const sourceClauses = conditionsBySource.get(alias)!;
                if (sourceClauses.length > 0) {
                    // Insert WHERE clause after the SELECT line
                    modifiedLines.splice(branchLine + 1, 0, `  WHERE 1=1`);
                    sourceClauses.forEach((clause, i) => {
                        modifiedLines.splice(branchLine + 2 + i, 0, clause);
                    });
                }
            }
        });

        // Insert global conditions at the end
        const demoBirthIdx = modifiedLines.findIndex((l) => l.includes('mdp.birthdate IS NOT NULL'));
        const insertAt = demoBirthIdx > -1 ? demoBirthIdx : modifiedLines.length;
        if (globalConditions.length > 0) {
            modifiedLines.splice(insertAt, 0, ...globalConditions);
        }

        return modifiedLines.join('\n');
    }

    // For single-source or no source-specific conditions, insert at original location
    const demoBirthIdx = sqlLines.findIndex((l) => l.includes('mdp.birthdate IS NOT NULL'));
    const insertAt = demoBirthIdx > -1 ? demoBirthIdx : sqlLines.length;

    if (globalConditions.length > 0) {
        sqlLines.splice(insertAt, 0, ...globalConditions);
        return sqlLines.join('\n');
    }

    return baseSql;
}
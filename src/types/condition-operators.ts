// src/report-builder/types/condition-operators.ts

/**
 * Central source of truth for operators used across:
 * - Theme definition UI
 * - Indicator condition saving
 * - SQL rendering
 */

/** Operators shown/allowed in Theme editor UI */
export const THEME_OPERATOR_OPTIONS = ['EQUALS', 'IN', 'NOT_IN', 'LIKE', 'BETWEEN', 'GTE', 'LTE'] as const;
export type ThemeOperator = (typeof THEME_OPERATOR_OPTIONS)[number];

/** SQL operators after normalization */
export type NormalizedSqlOperator =
    | '='
    | '!='
    | '>'
    | '>='
    | '<'
    | '<='
    | 'IN'
    | 'NOT IN'
    | 'LIKE'
    | 'BETWEEN';

export function normalizeOperator(op?: string | null): NormalizedSqlOperator {
    const raw = String(op ?? '').trim().toUpperCase();

    if (raw === 'EQUALS') return '=';
    if (raw === 'GTE') return '>=';
    if (raw === 'LTE') return '<=';
    if (raw === 'NOT_IN') return 'NOT IN';
    if (raw === 'IN') return 'IN';
    if (raw === 'LIKE') return 'LIKE';
    if (raw === 'BETWEEN') return 'BETWEEN';

    // allow already-normalized SQL ops
    if (raw === '=' || raw === '!=' || raw === '>' || raw === '>=' || raw === '<' || raw === '<=') {
        return raw as NormalizedSqlOperator;
    }

    // safest default
    return 'IN';
}

export function isInOperator(op: NormalizedSqlOperator) {
    return op === 'IN' || op === 'NOT IN';
}
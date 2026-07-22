// src/report-builder/types/condition-operators.ts

/**
 * Central source of truth for operators used across:
 * - Theme definition UI
 * - Indicator condition saving
 * - SQL rendering
 */

/** Operators shown/allowed in Theme editor UI */
export const THEME_OPERATOR_OPTIONS = ['EQUALS', 'IN', 'NOT_IN', 'LIKE', 'BETWEEN', 'GTE', 'LTE', 'IS_NULL', 'IS_NOT_NULL'] as const;
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
    | 'BETWEEN'
    | 'IS NULL'
    | 'IS NOT NULL';

export function normalizeOperator(op?: string | null): NormalizedSqlOperator {
    const raw = String(op ?? '').trim().toUpperCase();

    if (raw === 'EQUALS') return '=';
    if (raw === 'GTE') return '>=';
    if (raw === 'LTE') return '<=';
    if (raw === 'NOT_IN') return 'NOT IN';
    if (raw === 'IN') return 'IN';
    if (raw === 'LIKE') return 'LIKE';
    if (raw === 'BETWEEN') return 'BETWEEN';
    if (raw === 'IS_NULL') return 'IS NULL';
    if (raw === 'IS_NOT_NULL') return 'IS NOT NULL';

    // allow already-normalized SQL ops
    if (raw === '=' || raw === '!=' || raw === '>' || raw === '>=' || raw === '<' || raw === '<=') {
        return raw as NormalizedSqlOperator;
    }
    if (raw === 'IS NULL' || raw === 'IS NOT NULL') {
        return raw as NormalizedSqlOperator;
    }

    // safest default
    return 'IN';
}

export function isInOperator(op: NormalizedSqlOperator) {
    return op === 'IN' || op === 'NOT IN';
}

/**
 * Check if operator requires no value (IS NULL, IS NOT NULL)
 */
export function isNullCheckOperator(op: NormalizedSqlOperator) {
    return op === 'IS NULL' || op === 'IS NOT NULL';
}
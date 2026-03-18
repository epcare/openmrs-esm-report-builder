import type { IndicatorDto } from '../../resources/indicator/indicators.api';
import type { FinalIndicatorAuthoringV1 } from '../indicators/utils/final-indicator-sql.utils';

export function safeTrim(s: any) {
    const v = (s ?? '').toString().trim();
    return v.length ? v : '';
}

export function makeDisaggKey(ageGroupLabel: string, gender: string) {
    return `${ageGroupLabel}__${gender}`;
}

export function safeParseJson(s?: string) {
    try {
        return s ? JSON.parse(s) : null;
    } catch {
        return null;
    }
}

export function normalizeCompiledSql(sql: string) {
    if (!sql) return sql;

    let out = sql
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    // convert quoted placeholders into named params
    out = out.replace(/':startDate'/g, ':startDate').replace(/':endDate'/g, ':endDate');

    return out;
}

export function parseFinalAuthoring(ind: IndicatorDto): FinalIndicatorAuthoringV1 | null {
    try {
        if (!ind?.configJson) return null;
        const obj = JSON.parse(ind.configJson);
        if (obj && obj.version === 1 && (obj.ageCategoryCode || obj.ageGroupSetCode)) return obj as FinalIndicatorAuthoringV1;
        return null;
    } catch {
        return null;
    }
}
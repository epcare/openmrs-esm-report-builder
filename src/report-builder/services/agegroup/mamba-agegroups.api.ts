import { omrsGet } from '../openmrs-api';

/**
 * Endpoint:
 *  /ws/rest/v1/reportbuilder/mambaagegroup
 *
 * We don't assume exact shape; we normalize a "category/set" list for UI.
 */

type RestList<T> = { results?: T[] };

function unwrapRestList<T>(data: RestList<T> | T[] | undefined): T[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Array.isArray(data.results) ? data.results : [];
}

export type MambaAgeGroupRow = {
    // common fields we might see
    ageCategoryId?: string | number;
    age_category_id?: string | number;

    categoryCode?: string;
    ageCategoryCode?: string;
    age_category_code?: string;

    categoryLabel?: string;
    ageCategoryLabel?: string;
    age_category_label?: string;

    // group fields
    label?: string;
    name?: string;

    minAgeDays?: number;
    maxAgeDays?: number;
    min_age_days?: number;
    max_age_days?: number;

    sortOrder?: number;
    sort_order?: number;
};

export type AgeGroupSetOption = {
    code: string;
    label: string;
};

export async function listAgeGroupSets(signal?: AbortSignal): Promise<AgeGroupSetOption[]> {
    const data = await omrsGet<RestList<MambaAgeGroupRow> | MambaAgeGroupRow[]>(
        '/mambaagecategory?v=full',
        signal,
    );

    const rows = unwrapRestList(data);

    // Normalize "set/category" identity
    const map = new Map<string, string>();

    for (const r of rows) {
        const code =
            (r.ageCategoryCode ?? r.age_category_code ?? r.categoryCode ?? '').toString().trim() ||
            // fallback: category id as code if code missing
            (r.ageCategoryId ?? r.age_category_id ?? '').toString().trim();

        if (!code) continue;

        const label =
            (r.ageCategoryLabel ?? r.age_category_label ?? r.categoryLabel ?? '').toString().trim() || code;

        if (!map.has(code)) map.set(code, label);
    }

    return Array.from(map.entries())
        .map(([code, label]) => ({ code, label }))
        .sort((a, b) => a.label.localeCompare(b.label));
}
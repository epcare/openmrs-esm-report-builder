import { omrsGet } from '../openmrs-api';

type RestList<T> = { results?: T[] };

export type AgeGroupRef = {
    id: number;
    display: string;
    code?: string;
    label: string;
    minAgeDays: number;
    maxAgeDays: number;
    sortOrder: number;
    active: boolean;
};

export type AgeCategoryDto = {
    uuid: string;
    display: string;
    name: string;
    description?: string;
    code: string;
    version?: string;
    effectiveFrom?: string;
    effectiveTo?: string | null;
    active: boolean;
    ageGroups?: AgeGroupRef[];
    retired?: boolean;
};

export type AgeCategoryOption = {
    uuid: string;
    code: string;
    label: string; // what we show in dropdown
    name: string;
    description?: string;
    ageGroups: AgeGroupRef[];
};

export async function listAgeCategoriesWithGroups(signal?: AbortSignal): Promise<AgeCategoryOption[]> {
    // ✅ categories endpoint
    const data = await omrsGet<RestList<AgeCategoryDto>>('/reportbuilder/agecategory?v=full', signal);

    const results = Array.isArray(data?.results) ? data.results : [];

    return results
        .filter((c) => !c.retired)
        .map((c) => ({
            uuid: c.uuid,
            code: c.code,
            name: c.name ?? c.display ?? c.code,
            description: c.description,
            label: `${c.name ?? c.display ?? c.code} (${c.code})`,
            ageGroups: Array.isArray(c.ageGroups)
                ? c.ageGroups.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                : [],
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
}
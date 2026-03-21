import { omrsGet } from '../../../resources/openmrs-api';
import type { ConceptSummary } from '../../../resources/concepts/concept-types';
import type { SelectedConcept } from '../handler/concept-search-multiselect.component';

export async function searchConcepts(q: string, signal?: AbortSignal): Promise<ConceptSummary[]> {
    const trimmed = q.trim();
    if (!trimmed) return [];
    const data = await omrsGet<any>(`/concept?q=${encodeURIComponent(trimmed)}&v=default`, signal);
    const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
    return results as ConceptSummary[];
}

export function toSelectedConcept(c: any): SelectedConcept {
    return {
        id: Number(c.id) || 0,
        uuid: c.uuid,
        display: c.display,
        conceptClass: c.conceptClass?.name,
        datatype: c.datatype?.name,
    };
}
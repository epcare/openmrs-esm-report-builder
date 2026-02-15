import { openmrsFetch } from '@openmrs/esm-framework';
import type { ConceptSummary } from './concept-types';

type ConceptSearchResponse = {
    results: ConceptSummary[];
};

export async function searchConcepts(
    query: string,
    signal?: AbortSignal,
): Promise<ConceptSummary[]> {
    const res = await openmrsFetch<ConceptSearchResponse>(
        `/ws/rest/v1/concept?q=${encodeURIComponent(query)}&v=custom:(id,uuid,display,datatype:(uuid,name),conceptClass:(uuid,name),answers:(id,uuid,display),mappings:(display,uuid,conceptMapType:(display)))`,
        { signal },
    );

    return res.data?.results ?? [];
}
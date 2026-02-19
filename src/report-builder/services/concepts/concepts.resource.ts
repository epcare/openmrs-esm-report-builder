import { openmrsFetch } from '@openmrs/esm-framework';
import type { ConceptSummary } from './concept-types';

type ConceptSearchResponse = {
    results: ConceptSummary[];
};

type ConceptAnswersResponse = {
    answers?: Array<{ uuid: string; display: string; id?: number; mappings?: any[]; conceptClass?: any; datatype?: any }>;
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


export async function getConceptAnswers(questionUuid: string, signal?: AbortSignal): Promise<ConceptSummary[]> {
    const v = 'custom:(id,uuid,display,answers:(id,uuid,display,mappings:(display),conceptClass:(name),datatype:(name)))';

    const res = await openmrsFetch<ConceptAnswersResponse>(`/ws/rest/v1/concept/${questionUuid}?v=${v}`, { signal });

    const answers = (res?.data as any)?.answers ?? [];
    return answers as ConceptSummary[];
}
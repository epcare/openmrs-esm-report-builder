import type { ConceptSummary } from './concept-types';

import { omrsGet } from '../openmrs-api';


const RESOURCE = '/concept';
const cutomConceptRepresentation = 'custom:(id,uuid,display,datatype:(uuid,name),conceptClass:(uuid,name),answers:(id,uuid,display),mappings:(display,uuid,conceptMapType:(display)))';

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
    const res = await omrsGet<ConceptSearchResponse>(
        `${RESOURCE}/?q=${encodeURIComponent(query)}&v=${cutomConceptRepresentation}`,
        signal);

    return res?.results ?? [];
}

export async function getConceptByUuid(uuid: string, signal?: AbortSignal): Promise<ConceptSummary> {
    const u = String(uuid ?? '').trim();
    if (!u) {
        throw new Error('Concept uuid is required');
    }

    // /concept/{uuid} returns a single Concept object
    return omrsGet<ConceptSummary>(`${RESOURCE}/${encodeURIComponent(u)}?v=${cutomConceptRepresentation}`, signal);
}


export async function getConceptAnswers(questionUuid: string, signal?: AbortSignal): Promise<ConceptSummary[]> {
    const res = await omrsGet<ConceptAnswersResponse>(`${RESOURCE}/${questionUuid}?v=${cutomConceptRepresentation}`, signal );

    const answers = (res as any)?.answers ?? [];
    return answers as ConceptSummary[];
}
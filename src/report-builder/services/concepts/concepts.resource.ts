import { openmrsFetch } from '@openmrs/esm-framework';
import type { ConceptSummary } from './concept-types';

import { omrsDelete, omrsGet, omrsPost } from '../../services/openmrs-api';


const RESOURCE = '/concept';

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
        `${RESOURCE}/?q=${encodeURIComponent(query)}&v=custom:(id,uuid,display,datatype:(uuid,name),conceptClass:(uuid,name),answers:(id,uuid,display),mappings:(display,uuid,conceptMapType:(display)))`,
        signal);

    return res?.results ?? [];
}


export async function getConceptAnswers(questionUuid: string, signal?: AbortSignal): Promise<ConceptSummary[]> {
    const v = 'custom:(id,uuid,display,answers:(id,uuid,display,mappings:(display),conceptClass:(name),datatype:(name)))';

    const res = await omrsGet<ConceptAnswersResponse>(`${RESOURCE}/${questionUuid}?v=${v}`, signal );

    const answers = (res as any)?.answers ?? [];
    return answers as ConceptSummary[];
}
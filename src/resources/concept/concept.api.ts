/**
 * Concept API
 *
 * OpenMRS REST API for concepts
 * GET /ws/rest/v1/concept
 *
 * Used for searching and selecting concepts in observations and encounter diagnoses
 */

import { omrsGet } from '../openmrs-api';

type RestList<T> = { results?: T[] } & Record<string, any>;

function unwrapRestList<T>(data: RestList<T> | T[] | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Array.isArray(data.results) ? data.results : [];
}

export type ConceptDto = {
  uuid: string;
  display: string;
  name: {
    uuid: string;
    name: string;
    locale: string;
    localePreferred: boolean;
  };
  datatype: {
    uuid: string;
    display: string;
    name: string;
  };
  conceptClass: {
    uuid: string;
    display: string;
    name: string;
  };
  descriptions?: Array<{
    uuid: string;
    display: string;
    description: string;
    locale: string;
  }>;
  answers?: ConceptDto[];
  retired?: boolean;
  version?: string;
};

/**
 * Search concepts by name or UUID
 * @param query - Search term (concept name or UUID)
 * @param signal - AbortSignal for request cancellation
 */
export async function searchConcepts(
  query: string,
  signal?: AbortSignal
): Promise<Array<ConceptDto>> {
  if (!query?.trim()) {
    return [];
  }

  // Search by name or UUID
  const data = await omrsGet<RestList<ConceptDto> | ConceptDto[] | undefined>(
    `concept?q=${encodeURIComponent(query)}&v=full`,
    signal
  );
  return unwrapRestList(data);
}

/**
 * Get a concept by UUID
 * @param uuid - Concept UUID
 * @param signal - AbortSignal for request cancellation
 */
export async function getConcept(uuid: string, signal?: AbortSignal): Promise<ConceptDto> {
  return omrsGet<ConceptDto>(`concept/${uuid}?v=full`, signal);
}

/**
 * Get concepts by UUIDs (batch)
 * @param uuids - Array of concept UUIDs
 * @param signal - AbortSignal for request cancellation
 */
export async function getConceptsByUuids(
  uuids: string[],
  signal?: AbortSignal
): Promise<Array<ConceptDto>> {
  if (!uuids || uuids.length === 0) {
    return [];
  }

  // OpenMRS REST API supports multiple UUIDs separated by comma
  const uuidsParam = uuids.join(',');
  const data = await omrsGet<RestList<ConceptDto> | ConceptDto[] | undefined>(
    `concept?uuids=${uuidsParam}&v=full`,
    signal
  );
  return unwrapRestList(data);
}

/**
 * List concepts by class (e.g., for specific types of concepts)
 * @param conceptClassUuid - UUID of the concept class to filter by
 * @param signal - AbortSignal for request cancellation
 */
export async function listConceptsByClass(
  conceptClassUuid: string,
  signal?: AbortSignal
): Promise<Array<ConceptDto>> {
  const data = await omrsGet<RestList<ConceptDto> | ConceptDto[] | undefined>(
    `concept?class=${conceptClassUuid}&v=full`,
    signal
  );
  return unwrapRestList(data);
}

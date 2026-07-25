/**
 * Person Attribute Type API
 *
 * OpenMRS REST API for person attribute types
 * GET /ws/rest/v1/personattributetype
 */

import { omrsGet } from '../openmrs-api';

type RestList<T> = { results?: T[] } & Record<string, any>;

function unwrapRestList<T>(data: RestList<T> | T[] | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Array.isArray(data.results) ? data.results : [];
}

export type PersonAttributeTypeDto = {
  uuid: string;
  display: string;
  name?: string;
  description?: string;
  format?: string;
  foreignKey?: number;
  sortWeight?: number;
  searchable?: boolean;
  editPrivilege?: string;
  retired?: boolean;
  // Full representation includes the concept for format="org.openmrs.Concept"
  concept?: {
    uuid: string;
    display: string;
    name: {
      name: string;
    };
  };
};

/**
 * List all person attribute types
 */
export async function listPersonAttributeTypes(includeAll: boolean = false, signal?: AbortSignal): Promise<Array<PersonAttributeTypeDto>> {
  const qs = includeAll ? '?includeAll=true&v=default' : '?v=default';
  const data = await omrsGet<RestList<PersonAttributeTypeDto> | PersonAttributeTypeDto[] | undefined>(
    `personattributetype${qs}`,
    signal
  );
  return unwrapRestList(data);
}

/**
 * Get a person attribute type by UUID
 */
export async function getPersonAttributeType(uuid: string, signal?: AbortSignal): Promise<PersonAttributeTypeDto> {
  return omrsGet<PersonAttributeTypeDto>(`personattributetype/${uuid}?v=default`, signal);
}

/**
 * Search person attribute types by name
 */
export async function searchPersonAttributeTypes(query: string, signal?: AbortSignal): Promise<Array<PersonAttributeTypeDto>> {
  if (!query?.trim()) {
    return [];
  }

  const data = await omrsGet<RestList<PersonAttributeTypeDto> | PersonAttributeTypeDto[] | undefined>(
    `personattributetype?q=${encodeURIComponent(query)}&v=default`,
    signal
  );
  return unwrapRestList(data);
}

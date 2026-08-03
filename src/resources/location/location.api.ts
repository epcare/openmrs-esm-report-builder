/**
 * Location API
 *
 * OpenMRS REST API for locations
 * GET /ws/rest/v1/location
 */

import { omrsGet } from '../openmrs-api';

type RestList<T> = { results?: T[] } & Record<string, any>;

function unwrapRestList<T>(data: RestList<T> | T[] | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Array.isArray(data.results) ? data.results : [];
}

export type LocationDto = {
  uuid: string;
  display: string;
  name: string;
  description?: string;
  country?: string;
  stateProvince?: string;
  countyDistrict?: string;
  address3?: string;
  address2?: string;
  address1?: string;
  cityVillage?: string;
  postalCode?: string;
  latitude?: string;
  longitude?: string;
  altitude?: string;
  tags?: Array<{
    uuid: string;
    display: string;
  }>;
  parentLocation?: {
    uuid: string;
    display: string;
    name: string;
  };
  childLocations?: LocationDto[];
  retired?: boolean;
};

/**
 * List all locations
 * @param includeAll - Include retired locations
 * @param tagUuid - Filter by location tag UUID
 * @param signal - AbortSignal for request cancellation
 */
export async function listLocations(
  includeAll: boolean = false,
  tagUuid?: string,
  signal?: AbortSignal
): Promise<Array<LocationDto>> {
  const params = new URLSearchParams();
  params.append('v', 'full');
  if (includeAll) {
    params.append('includeAll', 'true');
  }
  if (tagUuid) {
    params.append('tag', tagUuid);
  }

  const qs = params.toString();
  const data = await omrsGet<RestList<LocationDto> | LocationDto[] | undefined>(
    `location?${qs}`,
    signal
  );
  return unwrapRestList(data);
}

/**
 * Get a location by UUID
 * @param uuid - Location UUID
 * @param signal - AbortSignal for request cancellation
 */
export async function getLocation(uuid: string, signal?: AbortSignal): Promise<LocationDto> {
  return omrsGet<LocationDto>(`location/${uuid}?v=full`, signal);
}

/**
 * Search locations by name
 * @param query - Search term (location name)
 * @param tagUuid - Filter by location tag UUID
 * @param signal - AbortSignal for request cancellation
 */
export async function searchLocations(
  query: string,
  tagUuid?: string,
  signal?: AbortSignal
): Promise<Array<LocationDto>> {
  if (!query?.trim()) {
    return [];
  }

  const params = new URLSearchParams();
  params.append('q', query);
  params.append('v', 'full');
  if (tagUuid) {
    params.append('tag', tagUuid);
  }

  const qs = params.toString();
  const data = await omrsGet<RestList<LocationDto> | LocationDto[] | undefined>(
    `location?${qs}`,
    signal
  );
  return unwrapRestList(data);
}

/**
 * Get location tree (locations with hierarchy)
 * @param rootUuid - Root location UUID to start from (optional)
 * @param signal - AbortSignal for request cancellation
 */
export async function getLocationTree(
  rootUuid?: string,
  signal?: AbortSignal
): Promise<Array<LocationDto>> {
  const params = new URLSearchParams();
  params.append('v', 'full');
  if (rootUuid) {
    params.append('ancestorOf', rootUuid);
  }

  const qs = params.toString();
  const data = await omrsGet<RestList<LocationDto> | LocationDto[] | undefined>(
    `location?${qs}`,
    signal
  );
  return unwrapRestList(data);
}

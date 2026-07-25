/**
 * Patient Identifier Type API
 *
 * OpenMRS REST API for patient identifier types
 * GET /ws/rest/v1/patientidentifiertype
 */

import { omrsGet } from '../openmrs-api';

type RestList<T> = { results?: T[] } & Record<string, any>;

function unwrapRestList<T>(data: RestList<T> | T[] | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Array.isArray(data.results) ? data.results : [];
}

export type PatientIdentifierTypeDto = {
  uuid: string;
  display: string;
  name?: string;
  description?: string;
  format?: string;
  formatDescription?: string;
  required?: boolean;
  checkDigit?: boolean;
  validator?: string;
  locationBehavior?: 'REQUIRED' | 'NOT_USED';
  uniquenessBehavior?: 'UNIQUE' | 'NON_UNIQUE' | 'LOCATION';
  retired?: boolean;
};

/**
 * List all patient identifier types
 */
export async function listPatientIdentifierTypes(includeAll: boolean = false, signal?: AbortSignal): Promise<Array<PatientIdentifierTypeDto>> {
  const qs = includeAll ? '?includeAll=true&v=default' : '?v=default';
  const data = await omrsGet<RestList<PatientIdentifierTypeDto> | PatientIdentifierTypeDto[] | undefined>(
    `patientidentifiertype${qs}`,
    signal
  );
  return unwrapRestList(data);
}

/**
 * Get a patient identifier type by UUID
 */
export async function getPatientIdentifierType(uuid: string, signal?: AbortSignal): Promise<PatientIdentifierTypeDto> {
  return omrsGet<PatientIdentifierTypeDto>(`patientidentifiertype/${uuid}?v=default`, signal);
}

/**
 * Search patient identifier types by name
 */
export async function searchPatientIdentifierTypes(query: string, signal?: AbortSignal): Promise<Array<PatientIdentifierTypeDto>> {
  if (!query?.trim()) {
    return [];
  }

  const data = await omrsGet<RestList<PatientIdentifierTypeDto> | PatientIdentifierTypeDto[] | undefined>(
    `patientidentifiertype?q=${encodeURIComponent(query)}&v=default`,
    signal
  );
  return unwrapRestList(data);
}

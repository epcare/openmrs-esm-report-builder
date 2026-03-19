import { openmrsFetch } from '@openmrs/esm-framework';

export async function previewSection(
    sectionUuid: string,
    body: { startDate: string; endDate: string; maxRows?: number; params?: Record<string, any> },
    signal?: AbortSignal,
) {
  const { data } = await openmrsFetch(`/ws/rest/v1/reportbuildersection/${sectionUuid}/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal,
  });

  return data;
}
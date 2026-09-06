import { openmrsFetch } from '@openmrs/esm-framework';

import { guardRejection } from '../../utils/api-error.utils';

export type SectionPreviewRequest = {
  sectionUuid: string;
  indicatorUuid?: string;
  startDate: string;
  endDate: string;
  maxRows?: number;
  params?: Record<string, any>;
};

export async function previewSection(body: SectionPreviewRequest, signal?: AbortSignal) {
  const { data } = await guardRejection(
    openmrsFetch('/ws/rest/v1/reportbuilder/sectionpreview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal,
    }),
  );

  return data;
}
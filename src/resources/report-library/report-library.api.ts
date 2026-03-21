import { omrsDelete, omrsGet, omrsPost } from '../openmrs-api';

type RestList<T> = { results?: T[] } & Record<string, any>;

function unwrapRestList<T>(data: RestList<T> | T[] | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Array.isArray(data.results) ? data.results : [];
}

const RESOURCE = '/reportlibrary';

export type ReportSourceType = 'LEGACY' | 'BUILDER';
export type ReportType = 'AGGREGATE' | 'LINE_LIST';

export type ReportLibraryDto = {
  uuid: string;
  display?: string;
  name: string;
  description?: string;
  code?: string;
  sourceType?: ReportSourceType;
  reportDefinitionUuid?: string;
  reportBuilderReportUuid?: string;
  reportType?: ReportType;
  migrated?: boolean;
  metaJson?: string;
  retired?: boolean;
  category?: { uuid: string; name?: string } | string;
};

export type SaveReportLibraryPayload = {
  name: string;
  description?: string;
  code?: string;
  sourceType?: ReportSourceType;
  reportDefinitionUuid?: string;
  reportBuilderReportUuid?: string;
  reportType?: ReportType;
  migrated?: boolean;
  metaJson?: string;
  category?: string;
};

export async function listReportLibraries(q?: string, signal?: AbortSignal): Promise<ReportLibraryDto[]> {
  const qs = new URLSearchParams();
  qs.set('v', 'full');
  if (q?.trim()) qs.set('q', q.trim());
  const data = await omrsGet<RestList<ReportLibraryDto> | ReportLibraryDto[]>(`${RESOURCE}?${qs.toString()}`, signal);
  return unwrapRestList(data).filter((x) => Boolean(x?.uuid));
}

export async function createReportLibrary(payload: SaveReportLibraryPayload, signal?: AbortSignal): Promise<ReportLibraryDto> {
  return omrsPost<ReportLibraryDto>(RESOURCE, payload, signal);
}

export async function updateReportLibrary(uuid: string, payload: SaveReportLibraryPayload, signal?: AbortSignal): Promise<ReportLibraryDto> {
  return omrsPost<ReportLibraryDto>(`${RESOURCE}/${encodeURIComponent(uuid)}`, payload, signal);
}

export async function deleteReportLibrary(uuid: string, reason = 'Retired from report library', signal?: AbortSignal): Promise<any> {
  return omrsDelete<any>(`${RESOURCE}/${encodeURIComponent(uuid)}?reason=${encodeURIComponent(reason)}`, signal);
}

import { omrsDelete, omrsGet, omrsPost } from '../openmrs-api';

type RestList<T> = { results?: T[] } & Record<string, any>;

function unwrapRestList<T>(data: RestList<T> | T[] | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Array.isArray(data.results) ? data.results : [];
}

const RESOURCE = '/reportbuilder/etlsource';

export type ETLSourceDto = {
  uuid: string;
  display?: string;
  name: string;
  code?: string;
  description?: string;
  tablePatterns?: string;
  schemaName?: string;
  sourceType?: string;
  active?: boolean;
  voided?: boolean;
};

export type SaveETLSourcePayload = {
  name: string;
  code?: string;
  description?: string;
  tablePatterns?: string;
  schemaName?: string;
  sourceType?: string;
  active?: boolean;
};

export async function listETLSources(q?: string, signal?: AbortSignal): Promise<ETLSourceDto[]> {
  const qs = new URLSearchParams();
  qs.set('v', 'custom:(uuid,name,code,description,tablePatterns,schemaName,sourceType,active,retired)');
  if (q?.trim()) qs.set('q', q.trim());

  const data = await omrsGet<RestList<ETLSourceDto> | ETLSourceDto[] | undefined>(
    `${RESOURCE}?${qs.toString()}`,
    signal,
  );

  return unwrapRestList(data).filter((x) => Boolean(x?.uuid));
}

export async function createETLSource(payload: SaveETLSourcePayload, signal?: AbortSignal) {
  return omrsPost<ETLSourceDto>(RESOURCE, payload, signal);
}

export async function updateETLSource(uuid: string, payload: SaveETLSourcePayload, signal?: AbortSignal) {
  return omrsPost<ETLSourceDto>(`${RESOURCE}/${encodeURIComponent(uuid)}`, payload, signal);
}

export async function deleteETLSource(
  uuid: string,
  reason = 'Retired from Report Builder Admin',
  signal?: AbortSignal,
) {
  const qs = new URLSearchParams();
  qs.set('reason', reason);
  return omrsDelete(`${RESOURCE}/${encodeURIComponent(uuid)}?${qs.toString()}`, signal);
}
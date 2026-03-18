import { omrsGet, omrsPost } from '../openmrs-api';
import { decodeHtmlEntities } from '../../utils/html-entities.utils';

/**
 * REST resource:
 *  /ws/rest/v1/mambasection
 */
const RESOURCE = '/mambasection';

type RestList<T> = { results?: T[] } & Record<string, any>;

function unwrapRestList<T>(data: RestList<T> | T[] | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Array.isArray(data.results) ? data.results : [];
}

export type RestRep = 'default' | 'full';

export type MambaSectionDto = {
  uuid: string;
  name: string;
  description?: string;
  code?: string;
  configJson?: string;
  metaJson?: string;
  retired?: boolean;
};

function normalizeSectionDto(s: MambaSectionDto): MambaSectionDto {
  return {
    ...s,
    configJson: s.configJson ? decodeHtmlEntities(s.configJson) : s.configJson,
    metaJson: s.metaJson ? decodeHtmlEntities(s.metaJson) : s.metaJson,
  };
}

export type ListSectionsParams = {
  q?: string;
  includeRetired?: boolean;
  v?: RestRep;
};

export async function listSections(params?: ListSectionsParams, signal?: AbortSignal): Promise<MambaSectionDto[]> {
  const q = params?.q?.trim();
  const includeRetired = params?.includeRetired === true;
  const v = params?.v ?? 'default';

  const qs = new URLSearchParams();
  qs.set('v', v);
  if (q) qs.set('q', q);
  if (includeRetired) qs.set('includeRetired', 'true');

  const data = await omrsGet<RestList<MambaSectionDto> | MambaSectionDto[] | undefined>(`${RESOURCE}?${qs.toString()}`, signal);
  return unwrapRestList(data)
    .filter((x) => Boolean(x?.uuid))
    .map(normalizeSectionDto);
}

export async function getSection(uuid: string, signal?: AbortSignal, v: RestRep = 'full'): Promise<MambaSectionDto> {
  const s = await omrsGet<MambaSectionDto>(`${RESOURCE}/${encodeURIComponent(uuid)}?v=${v}`, signal);
  return normalizeSectionDto(s);
}

export async function createSection(payload: Partial<MambaSectionDto>, signal?: AbortSignal): Promise<MambaSectionDto> {
  const s = await omrsPost<MambaSectionDto>(RESOURCE, payload, signal);
  return normalizeSectionDto(s);
}

export async function updateSection(uuid: string, payload: Partial<MambaSectionDto>, signal?: AbortSignal): Promise<MambaSectionDto> {
  const s = await omrsPost<MambaSectionDto>(`${RESOURCE}/${encodeURIComponent(uuid)}`, payload, signal);
  return normalizeSectionDto(s);
}

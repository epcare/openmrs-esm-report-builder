import { omrsDelete, omrsGet, omrsPost } from '../openmrs-api';

type RestList<T> = { results?: T[] } & Record<string, any>;

function unwrapRestList<T>(data: RestList<T> | T[] | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Array.isArray(data.results) ? data.results : [];
}

const RESOURCE = '/reportcategory';

export type ReportCategoryDto = {
  uuid: string;
  display?: string;
  name: string;
  description?: string;
  retired?: boolean;
};

export async function listReportCategories(q?: string, signal?: AbortSignal): Promise<ReportCategoryDto[]> {
  const qs = new URLSearchParams();
  qs.set('v', 'full');
  if (q?.trim()) qs.set('q', q.trim());
  const data = await omrsGet<RestList<ReportCategoryDto> | ReportCategoryDto[] | undefined>(`${RESOURCE}?${qs.toString()}`, signal);
  return unwrapRestList(data).filter((x) => Boolean(x?.uuid));
}

export async function createReportCategory(payload: Pick<ReportCategoryDto, 'name' | 'description'>, signal?: AbortSignal) {
  return omrsPost<ReportCategoryDto>(RESOURCE, payload, signal);
}

export async function updateReportCategory(uuid: string, payload: Pick<ReportCategoryDto, 'name' | 'description'>, signal?: AbortSignal) {
  return omrsPost<ReportCategoryDto>(`${RESOURCE}/${encodeURIComponent(uuid)}`, payload, signal);
}

export async function deleteReportCategory(uuid: string, reason = 'Retired from Report Builder Admin', signal?: AbortSignal) {
  const qs = new URLSearchParams();
  qs.set('reason', reason);
  return omrsDelete<any>(`${RESOURCE}/${encodeURIComponent(uuid)}?${qs.toString()}`, signal);
}

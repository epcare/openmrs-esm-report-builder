import { omrsDelete, omrsGet, omrsPost } from '../openmrs-api';
import { decodeHtmlEntities } from '../../utils/html-entities.utils';

/**
 * REST resource:
 *  /ws/rest/v1/reportbuilderindicator
 */
const RESOURCE = '/reportbuilder/indicator';

type RestList<T> = { results?: T[] } & Record<string, any>;

function unwrapRestList<T>(data: RestList<T> | T[] | undefined): T[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Array.isArray(data.results) ? data.results : [];
}

function normalizeIndicatorDto(ind: IndicatorDto): IndicatorDto {
    // OpenMRS can return HTML-escaped strings; decode before UI uses them.
    return {
        ...ind,
        configJson: ind.configJson ? decodeHtmlEntities(ind.configJson) : ind.configJson,
        metaJson: ind.metaJson ? decodeHtmlEntities(ind.metaJson) : ind.metaJson,
        sqlTemplate: ind.sqlTemplate ? decodeHtmlEntities(ind.sqlTemplate) : ind.sqlTemplate,
        denominatorSqlTemplate: ind.denominatorSqlTemplate
            ? decodeHtmlEntities(ind.denominatorSqlTemplate)
            : ind.denominatorSqlTemplate,
    };
}

export type IndicatorKind = 'BASE' | 'COMPOSITE' | 'FINAL';
export type IndicatorValueType = 'NUMBER' | 'TABLE' | 'PATIENT_SET';
export type RestRep = 'default' | 'full';

export type IndicatorDto = {
    uuid: string;
    name: string;
    description?: string;
    code?: string;

    kind: IndicatorKind;
    defaultValueType?: IndicatorValueType;

    // new-ish fields you’re adding backend-side (safe optional)
    themeUuid?: string | null;
    configJson?: string;
    metaJson?: string;
    sqlTemplate?: string | null;
    denominatorSqlTemplate?: string | null;

    retired?: boolean;
    retireReason?: string | null;
};

export type MambaIndicatorDto = {
    id: string,
    uuid: string;
    name: string;
    description?: string;
    code?: string;

    kind: IndicatorKind;
    defaultValueType?: IndicatorValueType;
    themeName?: string;
    themeColor?: string;

    // new-ish fields you’re adding backend-side (safe optional)
    themeUuid?: string | null;
    configJson?: string;
    metaJson?: string;
    sqlTemplate?: string | null;
    denominatorSqlTemplate?: string | null;

    retired?: boolean;
    retireReason?: string | null;
};

export type ListIndicatorsParams = {
    q?: string;
    kind?: IndicatorKind;
    includeRetired?: boolean;
    v?: RestRep;
};

export async function listIndicators(params?: ListIndicatorsParams, signal?: AbortSignal): Promise<IndicatorDto[]> {
    const q = params?.q?.trim();
    const kind = params?.kind?.trim?.() ? params.kind : params?.kind;
    const includeRetired = params?.includeRetired === true;
    const v = params?.v ?? 'default';

    const qs = new URLSearchParams();
    qs.set('v', v);
    if (q) qs.set('q', q);
    if (kind) qs.set('kind', kind);
    if (includeRetired) qs.set('includeRetired', 'true');

    const data = await omrsGet<RestList<IndicatorDto> | IndicatorDto[] | undefined>(`${RESOURCE}?${qs.toString()}`, signal);

    return unwrapRestList(data)
        .filter((x) => Boolean(x?.uuid))
        .map(normalizeIndicatorDto);
}

export async function getIndicator(uuid: string, signal?: AbortSignal, v: RestRep = 'full'): Promise<IndicatorDto> {
    const res = await omrsGet<IndicatorDto>(`${RESOURCE}/${encodeURIComponent(uuid)}?v=${v}`, signal);
    return normalizeIndicatorDto(res);
}

export async function createIndicator(payload: Partial<IndicatorDto>, signal?: AbortSignal): Promise<IndicatorDto> {
    return omrsPost<IndicatorDto>(RESOURCE, payload, signal);
}

export async function updateIndicator(uuid: string, payload: Partial<IndicatorDto>, signal?: AbortSignal): Promise<IndicatorDto> {
    return omrsPost<IndicatorDto>(`${RESOURCE}/${encodeURIComponent(uuid)}`, payload, signal);
}

export async function deleteIndicator(
    uuid: string,
    purge = false,
    reason = 'Retired via UI',
    signal?: AbortSignal,
): Promise<void> {
    const qs = purge ? `purge=true` : `purge=false&reason=${encodeURIComponent(reason)}`;
    await omrsDelete<void>(`${RESOURCE}/${encodeURIComponent(uuid)}?${qs}`, signal);
}
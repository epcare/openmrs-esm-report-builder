import { omrsGet, omrsPost } from '../openmrs-api';
import { decodeHtmlEntities } from '../../utils/html-entities.utils';

const RESOURCE = '/mambareport';
const COMPILE_RESOURCE = '/mambareportcompile';

type RestList<T> = { results?: T[] } & Record<string, any>;

function unwrapRestList<T>(data: RestList<T> | T[] | undefined): T[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Array.isArray(data.results) ? data.results : [];
}

export type RestRep = 'default' | 'full';

export type MambaReportDto = {
    uuid: string;
    name: string;
    description?: string;
    code?: string;
    configJson?: string;
    metaJson?: string;
    retired?: boolean;
};

export type SaveMambaReportPayload = {
    name: string;
    description?: string;
    code?: string;
    configJson?: string;
    metaJson?: string;
};

export type ListMambaReportsParams = {
    q?: string;
    includeRetired?: boolean;
    v?: RestRep;
};

export type CompileMambaReportPayload = {
    mambaReportUuid: string;
};

export type CompileMambaReportResult = {
    mambaReportUuid: string;
    reportDefinitionUuid?: string;
    reportDefinitionName?: string;
    reportDesignPath?: string;
    compiled?: boolean;
};

function normalizeReportDto(r: MambaReportDto): MambaReportDto {
    return {
        ...r,
        configJson: r.configJson ? decodeHtmlEntities(r.configJson) : r.configJson,
        metaJson: r.metaJson ? decodeHtmlEntities(r.metaJson) : r.metaJson,
    };
}

export async function listMambaReports(
    params?: ListMambaReportsParams,
    signal?: AbortSignal,
): Promise<MambaReportDto[]> {
    const q = params?.q?.trim();
    const includeRetired = params?.includeRetired === true;
    const v = params?.v ?? 'default';

    const qs = new URLSearchParams();
    qs.set('v', v);

    if (q) qs.set('q', q);
    if (includeRetired) qs.set('includeRetired', 'true');

    const data = await omrsGet<RestList<MambaReportDto> | MambaReportDto[] | undefined>(
        `${RESOURCE}?${qs.toString()}`,
        signal,
    );

    return unwrapRestList(data)
        .filter((x) => Boolean(x?.uuid))
        .map(normalizeReportDto);
}

export async function getMambaReport(
    uuid: string,
    signal?: AbortSignal,
    v: RestRep = 'full',
): Promise<MambaReportDto> {
    const data = await omrsGet<MambaReportDto>(`${RESOURCE}/${encodeURIComponent(uuid)}?v=${v}`, signal);
    return normalizeReportDto(data);
}

export async function createMambaReport(
    payload: SaveMambaReportPayload,
    signal?: AbortSignal,
): Promise<MambaReportDto> {
    const data = await omrsPost<MambaReportDto>(RESOURCE, payload, signal);
    return normalizeReportDto(data);
}

export async function updateMambaReport(
    uuid: string,
    payload: SaveMambaReportPayload,
    signal?: AbortSignal,
): Promise<MambaReportDto> {
    const data = await omrsPost<MambaReportDto>(`${RESOURCE}/${encodeURIComponent(uuid)}`, payload, signal);
    return normalizeReportDto(data);
}

export async function compileMambaReport(
    mambaReportUuid: string,
    signal?: AbortSignal,
): Promise<CompileMambaReportResult> {
    const payload: CompileMambaReportPayload = { mambaReportUuid };
    return omrsPost<CompileMambaReportResult>(COMPILE_RESOURCE, payload, signal);
}
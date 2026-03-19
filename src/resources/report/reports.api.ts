import { omrsGet, omrsPost } from '../openmrs-api';
import { decodeHtmlEntities } from '../../utils/html-entities.utils';

const RESOURCE = '/reportbuilderreport';
const COMPILE_RESOURCE = '/reportbuilderreportcompile';

type RestList<T> = { results?: T[] } & Record<string, any>;

function unwrapRestList<T>(data: RestList<T> | T[] | undefined): T[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Array.isArray(data.results) ? data.results : [];
}

export type RestRep = 'default' | 'full';

export type ReportDto = {
    uuid: string;
    name: string;
    description?: string;
    code?: string;
    configJson?: string;
    metaJson?: string;
    retired?: boolean;
};

export type SaveReportPayload = {
    name: string;
    description?: string;
    code?: string;
    configJson?: string;
    metaJson?: string;
};

export type ListReportsParams = {
    q?: string;
    includeRetired?: boolean;
    v?: RestRep;
};

export type CompileReportPayload = {
    mambaReportUuid: string;
};

export type CompileReportResult = {
    mambaReportUuid: string;
    reportDefinitionUuid?: string;
    reportDefinitionName?: string;
    reportDesignPath?: string;
    compiled?: boolean;
};

function normalizeReportDto(r: ReportDto): ReportDto {
    return {
        ...r,
        configJson: r.configJson ? decodeHtmlEntities(r.configJson) : r.configJson,
        metaJson: r.metaJson ? decodeHtmlEntities(r.metaJson) : r.metaJson,
    };
}

export async function listReports(
    params?: ListReportsParams,
    signal?: AbortSignal,
): Promise<ReportDto[]> {
    const q = params?.q?.trim();
    const includeRetired = params?.includeRetired === true;
    const v = params?.v ?? 'default';

    const qs = new URLSearchParams();
    qs.set('v', v);

    if (q) qs.set('q', q);
    if (includeRetired) qs.set('includeRetired', 'true');

    const data = await omrsGet<RestList<ReportDto> | ReportDto[] | undefined>(
        `${RESOURCE}?${qs.toString()}`,
        signal,
    );

    return unwrapRestList(data)
        .filter((x) => Boolean(x?.uuid))
        .map(normalizeReportDto);
}

export async function getReport(
    uuid: string,
    signal?: AbortSignal,
    v: RestRep = 'full',
): Promise<ReportDto> {
    const data = await omrsGet<ReportDto>(`${RESOURCE}/${encodeURIComponent(uuid)}?v=${v}`, signal);
    return normalizeReportDto(data);
}

export async function createReport(
    payload: SaveReportPayload,
    signal?: AbortSignal,
): Promise<ReportDto> {
    const data = await omrsPost<ReportDto>(RESOURCE, payload, signal);
    return normalizeReportDto(data);
}

export async function updateReport(
    uuid: string,
    payload: SaveReportPayload,
    signal?: AbortSignal,
): Promise<ReportDto> {
    const data = await omrsPost<ReportDto>(`${RESOURCE}/${encodeURIComponent(uuid)}`, payload, signal);
    return normalizeReportDto(data);
}

export async function compileReport(
    mambaReportUuid: string,
    signal?: AbortSignal,
): Promise<CompileReportResult> {
    const payload: CompileReportPayload = { mambaReportUuid };
    return omrsPost<CompileReportResult>(COMPILE_RESOURCE, payload, signal);
}
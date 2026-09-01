/**
 * Dashboard REST API
 * CRUD for ReportBuilderDashboard rows at ws/rest/v1/reportbuilder/dashboard.
 */

import { omrsGet, omrsPost, omrsDelete } from '../openmrs-api';
import type { DashboardDto, DashboardType, SaveDashboardPayload } from '../../types/dashboard/dashboard.types';

type RestList<T> = { results?: T[] } & Record<string, any>;

function unwrapRestList<T>(data: RestList<T> | T[] | undefined): T[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Array.isArray(data.results) ? data.results : [];
}

const RESOURCE = '/reportbuilder/dashboard';

export interface ListDashboardsParams {
    q?: string;
    type?: DashboardType;
    activeOnly?: boolean;
    includeRetired?: boolean;
    v?: 'default' | 'full';
}

/**
 * List dashboards. Default representation omits configJson — pass v: 'full' when needed.
 */
export async function listDashboards(
    params?: ListDashboardsParams,
    signal?: AbortSignal,
): Promise<DashboardDto[]> {
    const qs = new URLSearchParams();
    qs.set('v', params?.v ?? 'default');
    if (params?.q?.trim()) qs.set('q', params.q.trim());
    if (params?.type) qs.set('type', params.type);
    if (params?.activeOnly) qs.set('activeOnly', 'true');
    if (params?.includeRetired) qs.set('includeRetired', 'true');

    const data = await omrsGet<RestList<DashboardDto> | DashboardDto[] | undefined>(
        `${RESOURCE}?${qs.toString()}`,
        signal,
    );
    return unwrapRestList(data);
}

/**
 * Get one dashboard by uuid, code, or numeric id. Always requests v=full so configJson is present.
 */
export async function getDashboard(uuidOrCode: string, signal?: AbortSignal): Promise<DashboardDto> {
    return omrsGet<DashboardDto>(
        `${RESOURCE}/${encodeURIComponent(uuidOrCode.trim())}?v=full`,
        signal,
    );
}

/**
 * Get a dashboard by code, returning null when it does not exist.
 * The /etl-dashboard alias + fallback path depends on the null (not a throw).
 */
export async function getDashboardByCode(code: string, signal?: AbortSignal): Promise<DashboardDto | null> {
    try {
        return await getDashboard(code, signal);
    } catch (e: any) {
        if (e?.status === 404 || e?.response?.status === 404 || /not found|404/i.test(String(e?.message))) {
            return null;
        }
        throw e;
    }
}

export async function createDashboard(
    payload: SaveDashboardPayload,
    signal?: AbortSignal,
): Promise<DashboardDto> {
    return omrsPost<DashboardDto>(RESOURCE, payload, signal);
}

/**
 * Update (RESTWS convention: POST to the resource).
 */
export async function updateDashboard(
    uuid: string,
    payload: SaveDashboardPayload,
    signal?: AbortSignal,
): Promise<DashboardDto> {
    return omrsPost<DashboardDto>(`${RESOURCE}/${encodeURIComponent(uuid)}`, payload, signal);
}

/**
 * Retire (default) or purge a dashboard.
 */
export async function deleteDashboard(
    uuid: string,
    purge = false,
    reason = 'Retired from Report Builder Admin',
    signal?: AbortSignal,
): Promise<void> {
    const qs = new URLSearchParams();
    if (purge) {
        qs.set('purge', 'true');
    } else {
        qs.set('reason', reason);
    }
    await omrsDelete(`${RESOURCE}/${encodeURIComponent(uuid)}?${qs.toString()}`, signal);
}

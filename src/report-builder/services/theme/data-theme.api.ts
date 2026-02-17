import type { DataTheme } from '../../types/theme/data-theme.types';
import { omrsDelete, omrsGet, omrsPost } from '../openmrs-api';

const RESOURCE = '/mambadatatheme';

type RestList<T> = {
    results?: T[];
} & Record<string, any>;

function unwrapRestList<T>(data: RestList<T> | T[] | undefined): T[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Array.isArray(data.results) ? data.results : [];
}

export async function listThemes(q?: string, signal?: AbortSignal): Promise<DataTheme[]> {
    const trimmed = q?.trim();
    const path = trimmed
        ? `${RESOURCE}?q=${encodeURIComponent(trimmed)}&v=default`
        : `${RESOURCE}?v=default`;

    const data = await omrsGet<RestList<DataTheme> | DataTheme[] | undefined>(path, signal);
    return unwrapRestList(data);
}

export async function getTheme(uuid: string, signal?: AbortSignal): Promise<DataTheme> {
    return omrsGet<DataTheme>(`${RESOURCE}/${encodeURIComponent(uuid)}?v=full`, signal);
}

export async function createTheme(
    payload: Partial<DataTheme>,
    signal?: AbortSignal
): Promise<DataTheme> {
    return omrsPost<DataTheme>(RESOURCE, payload, signal);
}

export async function updateTheme(
    uuid: string,
    payload: Partial<DataTheme>,
    signal?: AbortSignal
): Promise<DataTheme> {
    // RESTWS often uses POST for update
    return omrsPost<DataTheme>(`${RESOURCE}/${encodeURIComponent(uuid)}`, payload, signal);
}

export async function deleteTheme(
    uuid: string,
    purge = false,
    reason = 'Retired via UI',
    signal?: AbortSignal
): Promise<void> {
    const qs = purge
        ? `purge=true`
        : `purge=false&reason=${encodeURIComponent(reason)}`;

    await omrsDelete<void>(`${RESOURCE}/${encodeURIComponent(uuid)}?${qs}`, signal);
}
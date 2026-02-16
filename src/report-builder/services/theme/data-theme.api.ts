import type { DataTheme } from '../../types/theme/data-theme.types';
import { omrsDelete, omrsGet, omrsPost } from '../openmrs-api';

const RESOURCE = '/mambadatatheme';

type RestList<T> = {
    results?: T[];
} & Record<string, any>;

export async function listThemes(q?: string, signal?: AbortSignal): Promise<DataTheme[]> {
    const path = q ? `${RESOURCE}?q=${encodeURIComponent(q)}` : RESOURCE;

    const data = await omrsGet<RestList<DataTheme> | DataTheme[]>(path, signal);

    // RESTWS often returns { results: [...] }, but be tolerant if it returns an array
    return Array.isArray(data) ? data : data?.results ?? [];
}

export async function getTheme(uuid: string, signal?: AbortSignal): Promise<DataTheme> {
    return omrsGet<DataTheme>(`${RESOURCE}/${uuid}`, signal);
}

export async function createTheme(payload: DataTheme, signal?: AbortSignal): Promise<DataTheme> {
    return omrsPost<DataTheme>(RESOURCE, payload, signal);
}

export async function updateTheme(uuid: string, payload: DataTheme, signal?: AbortSignal): Promise<DataTheme> {
    // RESTWS often uses POST for update (unless your resource supports PUT)
    return omrsPost<DataTheme>(`${RESOURCE}/${uuid}`, payload, signal);
}

export async function deleteTheme(uuid: string, purge = false, signal?: AbortSignal): Promise<void> {
    await omrsDelete<void>(`${RESOURCE}/${uuid}?purge=${purge ? 'true' : 'false'}`, signal);
}
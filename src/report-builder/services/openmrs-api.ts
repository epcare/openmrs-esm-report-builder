import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export type OpenmrsFetchResponse<T> = {
    data: T;
};

function toUrl(path: string) {
    return `${restBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function omrsGet<T>(path: string, signal?: AbortSignal): Promise<T> {
    const url = toUrl(path);
    const res = await openmrsFetch<OpenmrsFetchResponse<T>>(url, { signal });
    return res.data.data;
}

export async function omrsPost<T>(path: string, body: any, signal?: AbortSignal): Promise<T> {
    const url = toUrl(path);
    const res = await openmrsFetch<OpenmrsFetchResponse<T>>(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body ?? {}),
        signal,
    });
    return res.data.data;
}

export async function omrsDelete<T>(path: string, signal?: AbortSignal): Promise<T> {
    const url = toUrl(path);
    const res = await openmrsFetch<OpenmrsFetchResponse<T>>(url, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        signal,
    });
    return res.data.data;
}
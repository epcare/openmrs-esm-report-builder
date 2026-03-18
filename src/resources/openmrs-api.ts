import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export async function omrsGet<T>(path: string, signal?: AbortSignal): Promise<T> {
    const url = `${restBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await openmrsFetch<T>(url, { signal });
    return res.data;
}

export async function omrsPost<T>(path: string, body: any, signal?: AbortSignal): Promise<T> {
    const url = `${restBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await openmrsFetch<T>(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal,
    });
    return res.data;
}

export async function omrsDelete<T>(path: string, signal?: AbortSignal): Promise<T> {
    const url = `${restBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await openmrsFetch<T>(url, { method: 'DELETE', signal });
    return res.data;
}
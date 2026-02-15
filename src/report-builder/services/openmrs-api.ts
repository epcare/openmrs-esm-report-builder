import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export type OpenmrsFetchResponse<T> = {
    data: T;
};

export async function omrsGet<T>(path: string, signal?: AbortSignal): Promise<T> {
    const url = `${restBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await openmrsFetch<OpenmrsFetchResponse<T>>(url, { signal });
    return res.data.data;
}
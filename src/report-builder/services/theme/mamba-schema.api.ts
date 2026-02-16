import { omrsGet } from '../openmrs-api';

export type SchemaTable = { name: string; type?: string };

type ListTablesResponse =
    | { results: SchemaTable[] }
    | { tables: SchemaTable[] }
    | SchemaTable[]
    | string[]; // if backend returns ["mamba_x", ...]

function normalizeTables(payload: ListTablesResponse): SchemaTable[] {
    if (Array.isArray(payload)) {
        // array of strings or array of objects
        if (payload.length && typeof payload[0] === 'string') {
            return (payload as string[]).map((name) => ({ name }));
        }
        return payload as SchemaTable[];
    }

    const anyPayload: any = payload as any;
    if (Array.isArray(anyPayload?.results)) return anyPayload.results;
    if (Array.isArray(anyPayload?.tables)) return anyPayload.tables;

    return [];
}

export async function getSchemaTables(signal?: AbortSignal): Promise<SchemaTable[]> {
    const data = await omrsGet<ListTablesResponse>('/schema', signal);
    return normalizeTables(data);
}
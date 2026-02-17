import { omrsGet } from '../openmrs-api';

export type SchemaTable = { name: string; type?: string };

type ListTablesResponse =
    | { results: SchemaTable[] }
    | { tables: SchemaTable[] }
    | SchemaTable[]
    | string[];

function normalizeTables(payload: ListTablesResponse | null | undefined): SchemaTable[] {
    if (!payload) return [];

    if (Array.isArray(payload)) {
        if (payload.length && typeof payload[0] === 'string') {
            return (payload as string[]).map((name) => ({ name }));
        }
        return payload as SchemaTable[];
    }

    const anyPayload: any = payload;
    if (Array.isArray(anyPayload?.results)) return anyPayload.results;
    if (Array.isArray(anyPayload?.tables)) return anyPayload.tables;

    return [];
}

export async function getSchemaTables(signal?: AbortSignal): Promise<SchemaTable[]> {
    const data = await omrsGet<ListTablesResponse>('/schema', signal);
    return normalizeTables(data);
}
import { omrsGet } from '../openmrs-api';

export type SchemaTable = {
    name: string;
    /** legacy field kept for older consumers */
    type?: string;
    /** approximate INFORMATION_SCHEMA row count; null for views */
    rows?: number | null;
    /** last modification time as serialized by OpenMRS; null when unknown */
    updateTime?: string | null;
    /** "BASE TABLE" or "VIEW" */
    tableType?: string | null;
};

type RawTable = Record<string, any>;

type ListTablesResponse =
    | { results: SchemaTable[]; totalCount?: number }
    | { tables: SchemaTable[] }
    | SchemaTable[]
    | string[];

/**
 * Normalize one table entry from any known backend shape into a SchemaTable.
 */
function normalizeTable(entry: RawTable | string): SchemaTable {
    if (typeof entry === 'string') return { name: entry };
    return {
        name: String(entry?.name ?? entry?.tableName ?? entry?.table ?? ''),
        type: entry?.type,
        rows: typeof entry?.rows === 'number' ? entry.rows
            : typeof entry?.tableRows === 'number' ? entry.tableRows
            : null,
        updateTime: entry?.updateTime ?? null,
        tableType: entry?.tableType ?? entry?.type ?? null,
    };
}

/**
 * Normalize a tables payload from any known backend shape.
 * Exported for tests.
 */
export function normalizeTables(payload: ListTablesResponse | null | undefined): SchemaTable[] {
    if (!payload) return [];

    let raw: Array<RawTable | string> = [];
    if (Array.isArray(payload)) {
        raw = payload;
    } else {
        const anyPayload: any = payload;
        if (Array.isArray(anyPayload?.results)) raw = anyPayload.results;
        else if (Array.isArray(anyPayload?.tables)) raw = anyPayload.tables;
    }

    return raw
        .map(normalizeTable)
        .filter((t) => Boolean(t.name));
}

/** RESTWS rejects limit > 100 ("absolute limit"); page in chunks of this size. */
const PAGE_SIZE = 100;
/** Safety cap: at most 30 pages (3000 tables) per full load. */
const MAX_PAGES = 30;

/**
 * Fetch all ETL tables with row-count metadata, paging through RESTWS in
 * <=100-row chunks (the REST absolute limit) until totalCount is reached.
 */
export async function getSchemaTables(signal?: AbortSignal): Promise<SchemaTable[]> {
    const all: SchemaTable[] = [];
    const seen = new Set<string>();
    let totalCount: number | null = null;

    for (let page = 0; page < MAX_PAGES; page++) {
        if (signal?.aborted) return [];
        const startIndex = page * PAGE_SIZE;
        const data = await omrsGet<ListTablesResponse>(
            `/reportbuilder/schema?limit=${PAGE_SIZE}&startIndex=${startIndex}&totalCount=true`,
            signal,
        );

        const results = normalizeTables(data);
        for (const table of results) {
            if (!seen.has(table.name)) {
                seen.add(table.name);
                all.push(table);
            }
        }

        if (totalCount === null) {
            const anyData: any = data;
            totalCount = typeof anyData?.totalCount === 'number' ? anyData.totalCount : null;
        }

        // Stop on a short page, once we have everything, or if totalCount is unknown
        if (results.length < PAGE_SIZE) break;
        if (totalCount !== null && all.length >= totalCount) break;
    }

    return all;
}

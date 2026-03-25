export type SqlPreviewRequest = {
    /**
     * Prefer plain sql for now.
     * If you later add sqlEncoded, you can extend this type.
     */
    sql: string;
    params?: Record<string, any>;
    maxRows?: number;
};

export type SqlPreviewResponse = {
    columns: string[];
    rows: any[][];
    rowCount: number;
    truncated: boolean;

    // optional echo fields from RESTWS
    sql?: string;
    params?: Record<string, any>;
    maxRows?: number;
    resourceVersion?: string;
};

function restBase() {
    // OpenMRS ESM convention
    const base = (window as any).openmrsBaseUrl ?? '/openmrs/';
    return `${base}ws/rest/v1`;
}

export async function previewSql(request: SqlPreviewRequest, signal?: AbortSignal): Promise<SqlPreviewResponse> {
    const url = `${restBase()}/reportbuilder/sqlpreview`;

    const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({
            sql: request.sql,
            params: request.params ?? {},
            maxRows: request.maxRows ?? 200,
        }),
        signal,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`SQL preview failed (${res.status}). ${text}`);
    }

    return (await res.json()) as SqlPreviewResponse;
}
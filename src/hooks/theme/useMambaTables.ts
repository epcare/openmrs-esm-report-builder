import React from 'react';
import { getSchemaTables, type SchemaTable } from '../../resources/theme/mamba-schema.api';

function toTableName(t: SchemaTable | any): string {
    // Try common backend shapes
    return (
        t?.name ??
        t?.table ??
        t?.tableName ??
        t?.view ??
        t?.value ?? // fallback (some APIs)
        ''
    );
}

export function useMambaTables(enabled: boolean) {
    const [tables, setTables] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!enabled) {
            setTables([]);
            setLoading(false);
            setError(null);
            return;
        }

        const ac = new AbortController();
        setLoading(true);
        setError(null);

        getSchemaTables(ac.signal).then((data) => {
                // data is expected to be SchemaTable[] or something close

            console.log("I am here trying to see if data is loaded")
                const names = (data ?? [])
                    .map((t) => toTableName(t))
                    .map((x) => x.trim())
                    .filter(Boolean);

                // de-dupe while preserving order
                const uniq: string[] = [];
                const seen = new Set<string>();
                for (const n of names) {
                    if (!seen.has(n)) {
                        seen.add(n);
                        uniq.push(n);
                    }
                }

                setTables(uniq);
            })
            .catch((e) => {
                if (e?.name !== 'AbortError') setError(e?.message ?? 'Failed to load tables');
            })
            .finally(() => setLoading(false));

        return () => ac.abort();
    }, [enabled]);

    return { tables, loading, error };
}
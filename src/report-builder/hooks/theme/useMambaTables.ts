import React from 'react';
import { getSchemaTables, type SchemaTable } from '../../services/theme/mamba-schema.api';

export function useMambaTables(enabled: boolean) {
    const [tables, setTables] = React.useState<SchemaTable[]>([]);
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

        getSchemaTables(ac.signal)
            .then((data) => {
                setTables(data ?? []);
            })
            .catch((e) => {
                if (e?.name !== 'AbortError') setError(e?.message ?? 'Failed to load tables');
            })
            .finally(() => setLoading(false));

        return () => ac.abort();
    }, [enabled]);

    return { tables, loading, error };
}
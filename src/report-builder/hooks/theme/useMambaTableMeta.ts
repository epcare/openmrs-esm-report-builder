import React from 'react';
import { getMambaTableMeta } from '../../services/theme/mamba-table-meta.api';
import type { TableColumn } from '../../services/theme/mamba-table-meta.api';

export function useMambaTableMeta(table?: string, enabled: boolean = true) {
    const [columns, setColumns] = React.useState<TableColumn[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        // ✅ don’t load until enabled AND a table is selected
        if (!enabled || !table) {
            setColumns([]);
            setLoading(false);
            setError(null);
            return;
        }

        const ac = new AbortController();
        setLoading(true);
        setError(null);

        getMambaTableMeta(table, ac.signal)
            .then((cols) => setColumns(Array.isArray(cols) ? cols : []))
            .catch((e) => {
                if (e?.name !== 'AbortError') setError(e?.message ?? 'Failed to load columns');
            })
            .finally(() => setLoading(false));

        return () => ac.abort();
    }, [table, enabled]);

    return { columns, loading, error };
}
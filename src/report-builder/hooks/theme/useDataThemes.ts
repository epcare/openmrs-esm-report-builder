import React from 'react';
import type { DataTheme } from '../../types/theme/data-theme.types';
import { listThemes } from '../../services/theme/data-theme.api';

export function useDataThemes(query: string) {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [themes, setThemes] = React.useState<DataTheme[]>([]);

    const reload = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listThemes(query?.trim() || undefined);
            setThemes(data);
        } catch (e: any) {
            setError(e?.message ?? String(e));
        } finally {
            setLoading(false);
        }
    }, [query]);

    React.useEffect(() => {
        reload();
    }, [reload]);

    return { themes, loading, error, reload, setThemes };
}
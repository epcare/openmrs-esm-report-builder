/**
 * useTablePreview — fetches a ≤1000-row preview of one ETL table via
 * /reportbuilder/sqlpreview. State resets synchronously on table change so a
 * slow previous fetch can never flash stale rows.
 */

import React from 'react';
import { previewSql } from '../../../resources/preview/sql-preview.api';
import type { SqlPreviewResponse } from '../../../resources/preview/sql-preview.api';
import { buildTablePreviewSql } from '../../../utils/etl-browser';

export type TablePreviewState = {
    status: 'idle' | 'loading' | 'ready' | 'error';
    data?: SqlPreviewResponse;
    error?: string;
};

export function useTablePreview(table?: string | null): TablePreviewState & { refresh: () => void } {
    const [state, setState] = React.useState<TablePreviewState>({ status: 'idle' });
    const [refreshTick, setRefreshTick] = React.useState(0);

    React.useEffect(() => {
        if (!table) {
            setState({ status: 'idle' });
            return;
        }

        setState({ status: 'loading' });
        const ac = new AbortController();

        previewSql({ sql: buildTablePreviewSql(table), maxRows: 1000 }, ac.signal)
            .then((data) => {
                if (!ac.signal.aborted) {
                    setState({ status: 'ready', data });
                }
            })
            .catch((e) => {
                if (e?.name !== 'AbortError') {
                    setState({ status: 'error', error: e?.message ?? 'Failed to load preview' });
                }
            });

        return () => ac.abort();
    }, [table, refreshTick]);

    return { ...state, refresh: () => setRefreshTick((tick) => tick + 1) };
}

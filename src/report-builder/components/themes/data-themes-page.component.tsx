import React from 'react';
import { Button, Search, Stack } from '@carbon/react';
import { Add } from '@carbon/icons-react';

import DataThemesTable from './data-themes-table.component';
import DataThemeModal from './data-theme-modal.component';

import type { DataTheme, DataThemeRow } from '../../types/theme/data-theme.types';
import { listThemes, createTheme, updateTheme, deleteTheme } from '../../services/theme/data-theme.api';

export default function DataThemesPage() {
    const [q, setQ] = React.useState('');
    const [rows, setRows] = React.useState<DataThemeRow[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [open, setOpen] = React.useState(false);
    const [mode, setMode] = React.useState<'create' | 'edit'>('create');
    const [editing, setEditing] = React.useState<DataTheme | null>(null);

    const load = React.useCallback(
        (signal?: AbortSignal) => {
            setLoading(true);
            setError(null);

            return listThemes(q, signal)
                .then((data) => {
                    const next: DataThemeRow[] = (data ?? []).map((t) => ({
                        uuid: t.uuid ?? '',
                        name: t.name ?? '',
                        code: t.code ?? '',
                        domain: t.domain,
                        description: t.description,
                        retired: t.retired,
                    }));

                    setRows(next.filter((r) => Boolean(r.uuid)));
                })
                .catch((e) => setError(e?.message ?? 'Failed to load themes'))
                .finally(() => setLoading(false));
        },
        [q],
    );

    React.useEffect(() => {
        const ac = new AbortController();
        load(ac.signal);
        return () => ac.abort();
    }, [load]);

    const onCreate = () => {
        setMode('create');
        setEditing(null);
        setOpen(true);
    };

    const onEdit = async (uuid: string) => {
        const r = rows.find((x) => x.uuid === uuid);

        setMode('edit');
        setEditing(
            r
                ? ({
                    uuid: r.uuid,
                    name: r.name,
                    code: r.code,
                    domain: r.domain,
                    description: r.description,
                    configJson: '{}',
                    retired: r.retired,
                } as DataTheme)
                : null,
        );

        setOpen(true);
    };

    const onDelete = async (uuid: string) => {
        await deleteTheme(uuid, false);
        const ac = new AbortController();
        await load(ac.signal);
    };

    const onSave = async (payload: DataTheme) => {
        if (mode === 'create') {
            await createTheme(payload);
        } else {
            if (!payload.uuid) throw new Error('Missing uuid for update');
            await updateTheme(payload.uuid, payload);
        }

        setOpen(false);
        const ac = new AbortController();
        await load(ac.signal);
    };

    return (
        <Stack gap={5}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '1rem' }}>
                <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Data Themes</div>
                    <div style={{ opacity: 0.85 }}>
                        Define reusable data sources (mamba_* tables/views) for indicators and reporting.
                    </div>
                </div>

                <Button size="sm" kind="primary" renderIcon={Add} onClick={onCreate}>
                    Create Theme
                </Button>
            </div>

            <Search
                size="lg"
                labelText="Search"
                placeholder="Search themes…"
                value={q}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
            />

            {loading ? <div>Loading…</div> : null}
            {!loading && error ? <div style={{ color: 'var(--cds-text-error, #da1e28)' }}>{error}</div> : null}

            <DataThemesTable rows={rows} onEdit={onEdit} onDelete={onDelete} />

            <DataThemeModal
                open={open}
                mode={mode}
                initial={editing}
                onClose={() => setOpen(false)}
                onSave={onSave}
            />
        </Stack>
    );
}
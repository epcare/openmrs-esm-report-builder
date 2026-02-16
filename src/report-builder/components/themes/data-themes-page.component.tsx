import React from 'react';
import { Button, Search, Stack, InlineLoading } from '@carbon/react';
import { Add } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';

import DataThemesTable from './data-themes-table.component';
import DataThemeModal from './data-theme-modal.component';

import { useDataThemes } from '../../hooks/theme/useDataThemes';
import type { DataTheme, DataThemeRow } from '../../types/theme/data-theme.types';
import { createTheme, deleteTheme, updateTheme } from '../../services/theme/data-theme.api';
import Header from '../header/header.component';

export default function DataThemesPage() {
    const { t } = useTranslation();
    const [q, setQ] = React.useState('');
    const { themes, loading, error, reload } = useDataThemes(q);

    const [open, setOpen] = React.useState(false);
    const [mode, setMode] = React.useState<'create' | 'edit'>('create');
    const [editing, setEditing] = React.useState<DataTheme | null>(null);

    const rows: DataThemeRow[] = React.useMemo(() => {
        return (themes ?? [])
            .filter((t) => t.uuid)
            .map((t) => ({
                uuid: t.uuid!,
                name: t.name,
                code: t.code,
                domain: t.domain,
                description: t.description,
                retired: t.retired,
            }));
    }, [themes]);

    const onCreate = () => {
        setMode('create');
        setEditing(null);
        setOpen(true);
    };

    const onEdit = (uuid: string) => {
        const found = themes.find((t) => t.uuid === uuid) ?? null;
        setMode('edit');
        setEditing(found);
        setOpen(true);
    };

    const onDelete = async (uuid: string) => {
        // keep simple for now (later: Carbon InlineNotification + confirm)
        // eslint-disable-next-line no-alert
        const ok = window.confirm('Delete this theme?');
        if (!ok) return;

        await deleteTheme(uuid, true);
        await reload();
    };

    const onSave = async (payload: DataTheme) => {
        if (mode === 'create') await createTheme(payload);
        else if (payload.uuid) await updateTheme(payload.uuid, payload);

        setOpen(false);
        setEditing(null);
        await reload();
    };

    return (
        <div style={{ padding: '1rem' }}>
            <Header
                title={t('dataTheme', 'Data Themes')}
                subtitle={t('dataThemeSubTiltle', 'Define reusable “theme configs” that power the Indicator Builder.')}
            />
            <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                <div>

                </div>

                <Button kind="primary" size="sm" renderIcon={Add} onClick={onCreate}>
                    Create Theme
                </Button>
            </div>

            <Stack gap={4}>
                <Search size="lg" labelText="Search" placeholder="Search themes" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} />

                {loading ? <InlineLoading description="Loading themes…" /> : null}
                {!loading && error ? <div style={{ color: 'var(--cds-text-error, #da1e28)' }}>{error}</div> : null}

                <DataThemesTable rows={rows} onEdit={onEdit} onDelete={onDelete} />
            </Stack>

            <DataThemeModal open={open} mode={mode} initial={editing} onClose={() => setOpen(false)} onSave={onSave} />
        </div>
    );
}
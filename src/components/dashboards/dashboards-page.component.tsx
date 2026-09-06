/**
 * Dashboards Admin Page
 * Thin CRUD page over ReportBuilderDashboard — list, create, edit, retire.
 * Decomposition follows the data-themes admin pattern: thin page + table +
 * form modal (with section sub-forms) + config validation helpers.
 */

import React from 'react';
import { Button, InlineNotification, Search, Stack } from '@carbon/react';
import { Add } from '@carbon/icons-react';
import Header from '../shared/header/header.component';
import DashboardsTable from './dashboards-table.component';
import DashboardFormModal from './dashboard-form-modal.component';
import {
    createDashboard,
    deleteDashboard,
    getDashboard,
    listDashboards,
    updateDashboard,
} from '../../resources/dashboard/dashboard.api';
import type { DashboardDto } from '../../types/dashboard/dashboard.types';
import { RB } from '../../constants/privileges';
import { useReportBuilderPrivileges } from '../../hooks/use-report-builder-privileges';

export default function DashboardsPage() {
    const { has: hasPrivilege } = useReportBuilderPrivileges();
    const canEditDashboard = hasPrivilege(RB.DASHBOARD_ADD, RB.DASHBOARD_EDIT);
    const canDeleteDashboard = hasPrivilege(RB.DASHBOARD_PURGE);
    const [q, setQ] = React.useState('');
    const [rows, setRows] = React.useState<DashboardDto[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [open, setOpen] = React.useState(false);
    const [mode, setMode] = React.useState<'create' | 'edit'>('create');
    const [editing, setEditing] = React.useState<DashboardDto | null>(null);

    const load = React.useCallback(
        (signal?: AbortSignal) => {
            setLoading(true);
            setError(null);

            return listDashboards({ q, v: 'default' }, signal)
                .then((data) => setRows((data ?? []).filter((d) => Boolean(d.uuid))))
                .catch((e: any) => {
                    if (e?.name !== 'AbortError') setError(e?.message ?? 'Failed to load dashboards');
                })
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
        try {
            setMode('edit');
            setError(null);
            setLoading(true);
            // Fetch the full record (v=full) so the modal can edit configJson
            const full = await getDashboard(uuid);
            setEditing(full);
            setOpen(true);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load dashboard for editing');
        } finally {
            setLoading(false);
        }
    };

    const onDelete = async (uuid: string) => {
        const dashboard = rows.find((r) => r.uuid === uuid);
        const yes = window.confirm(`Retire dashboard "${dashboard?.name ?? uuid}"?`);
        if (!yes) return;
        try {
            await deleteDashboard(uuid, false);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to retire dashboard');
        }
        const ac = new AbortController();
        await load(ac.signal);
    };

    const onSave = async (payload: Omit<DashboardDto, 'uuid' | 'retired' | 'dateCreated' | 'dateChanged'>) => {
        if (mode === 'create') {
            await createDashboard(payload);
        } else {
            if (!editing?.uuid) throw new Error('Missing uuid for update');
            await updateDashboard(editing.uuid, payload);
        }

        setOpen(false);
        const ac = new AbortController();
        await load(ac.signal);
    };

    return (
        <Stack gap={5}>
            <Header
                title="Dashboards"
                subtitle="Configure dashboards composed of sections and widgets (ETL monitors, reports)."
            />

            {canEditDashboard && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 1rem' }}>
                    <Button size="sm" kind="primary" renderIcon={Add} onClick={onCreate}>
                        Create Dashboard
                    </Button>
                </div>
            )}

            <div style={{ padding: '0 1rem', display: 'grid', gap: '1rem' }}>
                <Search
                    size="lg"
                    labelText="Search"
                    placeholder="Search dashboards…"
                    value={q}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
                />

                {error && (
                    <InlineNotification
                        lowContrast
                        kind="error"
                        title="Error"
                        subtitle={error}
                        onCloseButtonClick={() => setError(null)}
                    />
                )}

                <DashboardsTable rows={rows} loading={loading} onEdit={onEdit} onDelete={onDelete} canEdit={canEditDashboard} canDelete={canDeleteDashboard} />
            </div>

            <DashboardFormModal
                open={open}
                mode={mode}
                initial={editing}
                onClose={() => setOpen(false)}
                onSave={onSave}
            />
        </Stack>
    );
}

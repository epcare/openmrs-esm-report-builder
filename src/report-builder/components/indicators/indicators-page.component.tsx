import React from 'react';
import {
    Button,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Search,
    Stack,
    InlineLoading,
} from '@carbon/react';
import { Add, Download } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';

import Header from '../header/header.component';
import IndicatorsTable, { type IndicatorRow } from './indicators-table.component';
import CreateBaseIndicatorModal from './create-base-indicator-modal.component';

// keep these if they exist in your project
import CreateCompositeBaseIndicatorModal, {
    type BaseIndicatorOption,
} from './create-composite-base-indicator-modal.component';
import CreateFinalIndicatorModal from './create-final-indicator-modal.component';

import { listThemes } from '../../services/theme/data-theme.api';
import type { DataTheme } from '../../types/theme/data-theme.types';

import {
    listIndicators,
    getIndicator,
    createIndicator,
    updateIndicator,
    deleteIndicator,
    type IndicatorDto,
    type IndicatorKind,
} from '../../services/indicator/indicators.api';

type TabKey = 'base' | 'final';

type ThemeMeta = { metaJson?: { color?: string }; color?: string } | any;

function safeParse<T>(raw: string | undefined | null, fallback: T): T {
    try {
        if (!raw) return fallback;
        const p = JSON.parse(raw);
        return (p ?? fallback) as T;
    } catch {
        return fallback;
    }
}

function getThemeColor(theme: DataTheme | undefined): string | undefined {
    if (!theme?.metaJson) return undefined;
    const parsed = safeParse<ThemeMeta>(theme.metaJson, {});
    return parsed?.metaJson?.color ?? parsed?.color;
}

function toThemeLabel(theme: DataTheme | undefined): string | undefined {
    if (!theme) return undefined;
    const code = theme.code ? ` (${theme.code})` : '';
    return `${theme.name ?? 'Theme'}${code}`;
}

function toRow(ind: IndicatorDto, theme?: DataTheme): IndicatorRow {
    return {
        id: ind.uuid,
        code: ind.code ?? '',
        name: ind.name ?? '',
        kind: ind.kind ?? 'BASE',
        themeName: theme ? toThemeLabel(theme) : undefined,
        themeColor: theme ? getThemeColor(theme) : undefined,
        status: ind.retired ? 'Retired' : 'Draft',
    };
}

export default function IndicatorsPage() {
    const { t } = useTranslation();

    const [tab, setTab] = React.useState<TabKey>('base');
    const [q, setQ] = React.useState('');

    const [rows, setRows] = React.useState<IndicatorRow[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // modals
    const [openCreateBase, setOpenCreateBase] = React.useState(false);
    const [openCreateComposite, setOpenCreateComposite] = React.useState(false);
    const [openCreateFinal, setOpenCreateFinal] = React.useState(false);

    // edit base
    const [openEditBase, setOpenEditBase] = React.useState(false);
    const [editing, setEditing] = React.useState<IndicatorDto | null>(null);

    const kind: IndicatorKind = tab === 'base' ? 'BASE' : 'FINAL';

    const load = React.useCallback(
        async (signal?: AbortSignal) => {
            setLoading(true);
            setError(null);

            try {
                // 1) load themes once (for labels + colors)
                const themeList = await listThemes(undefined, signal);
                const themeMap = new Map<string, DataTheme>();
                for (const th of themeList ?? []) {
                    if (th?.uuid) themeMap.set(th.uuid, th);
                }

                // 2) load indicators by tab kind (BASE/FINAL), supports q but q not required
                const indicators = await listIndicators(
                    { q, kind, includeRetired: false, v: 'default' },
                    signal,
                );

                const mapped: IndicatorRow[] = (indicators ?? []).map((i) => {
                    const theme = i.themeUuid ? themeMap.get(i.themeUuid) : undefined;
                    return toRow(i, theme);
                });

                setRows(mapped);
            } catch (e: any) {
                setError(e?.message ?? 'Failed to load indicators');
            } finally {
                setLoading(false);
            }
        },
        [q, kind],
    );

    React.useEffect(() => {
        const ac = new AbortController();
        load(ac.signal);
        return () => ac.abort();
    }, [load]);

    const refresh = React.useCallback(async () => {
        const ac = new AbortController();
        await load(ac.signal);
    }, [load]);

    const onCreateBase = () => {
        setEditing(null);
        setOpenCreateBase(true);
    };

    const onEdit = async (uuid: string) => {
        const ac = new AbortController();
        try {
            setLoading(true);
            setError(null);
            const full = await getIndicator(uuid, ac.signal, 'full');
            setEditing(full);
            setOpenEditBase(true);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load indicator for editing');
        } finally {
            setLoading(false);
        }
    };

    const onDelete = async (uuid: string) => {
        try {
            await deleteIndicator(uuid, false, 'Retired via UI');
            await refresh();
        } catch (e: any) {
            setError(e?.message ?? 'Failed to delete indicator');
        }
    };

    const onRun = async (uuid: string) => {
        try {
            const full = await getIndicator(uuid, undefined, 'full');
            // eslint-disable-next-line no-console
            console.log('Run indicator (preview):', {
                uuid,
                sqlTemplate: full.sqlTemplate,
                configJson: full.configJson,
            });
            alert('Run is wired. Next step: connect to an evaluate endpoint to return results.');
        } catch (e: any) {
            setError(e?.message ?? 'Failed to run indicator');
        }
    };

    const onOpen = (uuid: string) => {
        // placeholder: open details drawer/page later
        // eslint-disable-next-line no-console
        console.log('Open indicator:', uuid);
    };

    // Composite modal options — must be strongly typed
    const baseIndicators: BaseIndicatorOption[] = React.useMemo(() => {
        if (tab !== 'base') return [];
        return (rows ?? []).map((r) => ({
            id: r.id,
            code: r.code ?? '',
            name: r.name ?? '',
            unit: 'Patients', // keep consistent until unit is derived from config/meta
        }));
    }, [rows, tab]);

    return (
        <div>
            <Header
                title={t('reportBuilder', 'Report builder')}
                subtitle={t('buildReport', 'Define reports and generate templates')}
                status={{ label: t('draft', 'Draft'), kind: 'warning' }}
            />

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'end',
                    gap: '1rem',
                    marginBottom: '1rem',
                }}
            >
                <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Indicators</div>
                    <div style={{ opacity: 0.85 }}>Create and manage report indicators.</div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button size="sm" kind="secondary" renderIcon={Download}>
                        CSV
                    </Button>

                    {tab === 'base' ? (
                        <>
                            <Button
                                size="sm"
                                kind="secondary"
                                renderIcon={Add}
                                onClick={() => setOpenCreateComposite(true)}
                            >
                                Create Composite Base
                            </Button>

                            <Button size="sm" kind="primary" renderIcon={Add} onClick={onCreateBase}>
                                Create Base Indicator
                            </Button>
                        </>
                    ) : (
                        <Button
                            size="sm"
                            kind="primary"
                            renderIcon={Add}
                            onClick={() => setOpenCreateFinal(true)}
                        >
                            Create Final Indicator
                        </Button>
                    )}
                </div>
            </div>

            <Stack gap={4}>
                <Search
                    size="lg"
                    labelText="Search"
                    placeholder="Search indicators…"
                    value={q}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
                />

                {loading ? <InlineLoading description="Loading…" /> : null}
                {!loading && error ? (
                    <div style={{ color: 'var(--cds-text-error, #da1e28)' }}>{error}</div>
                ) : null}

                <Tabs
                    selectedIndex={tab === 'base' ? 0 : 1}
                    onChange={({ selectedIndex }) => setTab(selectedIndex === 0 ? 'base' : 'final')}
                >
                    <TabList aria-label="Indicator tabs">
                        <Tab>Base Indicators</Tab>
                        <Tab>Final Indicators</Tab>
                    </TabList>

                    <TabPanels>
                        <TabPanel>
                            <IndicatorsTable
                                rows={rows}
                                onOpen={onOpen}
                                onEdit={onEdit}
                                onRun={onRun}
                                onDelete={onDelete}
                            />
                        </TabPanel>
                        <TabPanel>
                            <IndicatorsTable
                                rows={rows}
                                onOpen={onOpen}
                                onEdit={onEdit}
                                onRun={onRun}
                                onDelete={onDelete}
                            />
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </Stack>

            {/* Create Base */}
            <CreateBaseIndicatorModal
                open={openCreateBase}
                mode="create"
                initial={null}
                onClose={() => setOpenCreateBase(false)}
                onSaved={async () => {
                    setOpenCreateBase(false);
                    await refresh();
                }}
                onCreate={async (payload) => {
                    await createIndicator(payload);
                }}
                onUpdate={async () => {
                    // not used in create mode
                }}
            />

            {/* Edit Base */}
            <CreateBaseIndicatorModal
                open={openEditBase}
                mode="edit"
                initial={editing}
                onClose={() => {
                    setOpenEditBase(false);
                    setEditing(null);
                }}
                onSaved={async () => {
                    setOpenEditBase(false);
                    setEditing(null);
                    await refresh();
                }}
                onCreate={async () => {
                    // not used in edit mode
                }}
                onUpdate={async (uuid, payload) => {
                    await updateIndicator(uuid, payload);
                }}
            />

            {/* Composite + Final */}
            <CreateCompositeBaseIndicatorModal
                open={openCreateComposite}
                onClose={() => setOpenCreateComposite(false)}
                onSubmit={(data: any) => {
                    // keep existing behavior until wired
                    // eslint-disable-next-line no-console
                    console.log('Composite base indicator:', data);
                    setOpenCreateComposite(false);
                }}
                baseIndicators={baseIndicators}
            />

            <CreateFinalIndicatorModal
                open={openCreateFinal}
                onClose={() => setOpenCreateFinal(false)}
                onSubmit={(data: any) => {
                    // eslint-disable-next-line no-console
                    console.log('Final indicator:', data);
                    setOpenCreateFinal(false);
                }}
            />
        </div>
    );
}
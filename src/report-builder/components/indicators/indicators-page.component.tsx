// src/report-builder/components/indicators/indicators-page.component.tsx

import React from 'react';
import {
    Button,
    Search,
    Stack,
    InlineLoading,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
} from '@carbon/react';
import { Add, Download } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';

import Header from '../header/header.component';
import IndicatorsTable, { type IndicatorRow } from './indicators-table.component';

import CreateBaseIndicatorModal from './create-base-indicator-modal.component';
import type { QAUiState } from './types/condition-ui.types';

import CreateCompositeBaseIndicatorModal from './create-composite-base-indicator-modal.component';
import { type BaseIndicatorOption } from './types/composite-indicator.types';

import CreateFinalIndicatorModal from './create-final-indicator-modal.component';
import AiAssistButton from '../ai/ai-assist-button.component';

import {
    listIndicators,
    getIndicator,
    createIndicator,
    updateIndicator,
    deleteIndicator,
    type IndicatorDto,
} from '../../services/indicator/indicators.api';

import { getDataTheme } from '../../services/theme/data-theme.api';
import type { DataThemeConfig } from './types/data-theme-config.types';
import type { IndicatorCondition } from './types/indicator-types';
import { hydrateConditionUiState } from './utils/indicator-conditions-hydration.utils';
import type { SelectedConcept } from './handler/concept-search-multiselect.component';

type TabKey = 'base' | 'final';

type ThemeMeta = { color?: string };

function parseThemeColor(metaJson?: string | null): string | undefined {
    if (!metaJson) return undefined;
    try {
        const p = JSON.parse(metaJson);
        const inner: ThemeMeta = p?.metaJson ?? p ?? {};
        return inner?.color;
    } catch {
        return undefined;
    }
}

type BaseIndicatorAuthoringV1 = {
    version: 1;
    themeUuid: string;
    themeConfig: DataThemeConfig;
    conditions: IndicatorCondition[];
    sqlPreview: string;
};

function safeParse<T>(raw: string | undefined | null, fallback: T): T {
    try {
        if (!raw) return fallback;
        const p = JSON.parse(raw);
        return (p ?? fallback) as T;
    } catch {
        return fallback;
    }
}

function normalizeThemeConfig(rawConfigJson: string | undefined | null): DataThemeConfig | null {
    const base = safeParse<any>(rawConfigJson, null);
    if (!base || typeof base !== 'object') return null;
    if (base.configJson && typeof base.configJson === 'object') return base.configJson as DataThemeConfig;
    return base as DataThemeConfig;
}

function normalizeAuthoring(ind: IndicatorDto | null | undefined): BaseIndicatorAuthoringV1 | null {
    if (!ind?.configJson) return null;

    let parsed: any;
    try {
        parsed = JSON.parse(ind.configJson);
    } catch {
        return null;
    }
    if (!parsed || typeof parsed !== 'object') return null;

    // flat v1
    if (parsed.themeUuid && parsed.themeConfig) {
        return {
            version: 1,
            themeUuid: parsed.themeUuid,
            themeConfig: parsed.themeConfig,
            conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
            sqlPreview: parsed.sqlPreview || ind.sqlTemplate || '',
        };
    }

    // { base: {...} }
    if (parsed.base?.themeUuid && parsed.base?.themeConfig) {
        return {
            version: 1,
            themeUuid: parsed.base.themeUuid,
            themeConfig: parsed.base.themeConfig,
            conditions: Array.isArray(parsed.base.conditions) ? parsed.base.conditions : [],
            sqlPreview: parsed.base.sqlPreview || ind.sqlTemplate || '',
        };
    }

    // { authoring: { base: {...} } }
    if (parsed.authoring?.base?.themeUuid && parsed.authoring?.base?.themeConfig) {
        const b = parsed.authoring.base;
        return {
            version: 1,
            themeUuid: b.themeUuid,
            themeConfig: b.themeConfig,
            conditions: Array.isArray(b.conditions) ? b.conditions : [],
            sqlPreview: b.sqlPreview || ind.sqlTemplate || '',
        };
    }

    return null;
}

export default function IndicatorsPage() {
    const { t } = useTranslation();

    const [tab, setTab] = React.useState<TabKey>('base');
    const [q, setQ] = React.useState('');
    const [rows, setRows] = React.useState<IndicatorRow[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // modals
    const [openBase, setOpenBase] = React.useState(false);
    const [openComposite, setOpenComposite] = React.useState(false);
    const [openFinal, setOpenFinal] = React.useState(false);

    const [mode, setMode] = React.useState<'create' | 'edit'>('create');
    const [editing, setEditing] = React.useState<IndicatorDto | null>(null);

    // ✅ Preloaded UI state for base edit, built BEFORE opening modal
    const [editingConceptUi, setEditingConceptUi] = React.useState<Record<string, SelectedConcept[]>>({});
    const [editingQaUi, setEditingQaUi] = React.useState<Record<string, QAUiState>>({});

    // cache theme info so table can show name+color
    const themeCache = React.useRef<Record<string, { name: string; color?: string }>>({});

    // --------------------------------------------
    // LOAD INDICATORS (default view + theme name/color resolution)
    // --------------------------------------------
    const load = React.useCallback(
        async (signal?: AbortSignal) => {
            setLoading(true);
            setError(null);

            try {
                // Keep default view here (lighter + matches old working version)
                const indicators = await listIndicators({ q, v: 'default', includeRetired: false }, signal);

                const missingThemeUuids = Array.from(
                    new Set(indicators.map((x) => x.themeUuid || '').filter((u) => u && !themeCache.current[u])),
                );

                if (missingThemeUuids.length) {
                    await Promise.all(
                        missingThemeUuids.map(async (uuid) => {
                            try {
                                const full = await getDataTheme(uuid, signal);
                                const name = full?.name ? `${full.name}${full.code ? ` (${full.code})` : ''}` : uuid;
                                const color = parseThemeColor(full?.metaJson);
                                themeCache.current[uuid] = { name, color };
                            } catch {
                                themeCache.current[uuid] = { name: uuid };
                            }
                        }),
                    );
                }

                const mapped: IndicatorRow[] = indicators.map((x) => {
                    const themeUuid = x.themeUuid || '';
                    const themeInfo = themeUuid ? themeCache.current[themeUuid] : undefined;

                    return {
                        id: x.uuid,
                        code: x.code ?? '',
                        name: x.name ?? '',
                        kind: x.kind ?? 'BASE',
                        themeName: themeInfo?.name,
                        themeColor: themeInfo?.color,
                        status: x.retired ? 'Retired' : 'Draft',
                    };
                });

                setRows(mapped);
            } catch (e: any) {
                setError(e?.message ?? 'Failed to load indicators');
            } finally {
                setLoading(false);
            }
        },
        [q],
    );

    React.useEffect(() => {
        const ac = new AbortController();
        load(ac.signal);
        return () => ac.abort();
    }, [load]);

    // --------------------------------------------
    // FILTER BY TAB
    // --------------------------------------------
    const filteredRows = React.useMemo(() => {
        if (tab === 'base') return rows.filter((r) => r.kind === 'BASE' || r.kind === 'COMPOSITE');
        return rows.filter((r) => r.kind === 'FINAL');
    }, [rows, tab]);

    // Composite builder should only get BASE indicators
    const baseIndicators: BaseIndicatorOption[] = React.useMemo(() => {
        return rows
            .filter((r) => r.kind === 'BASE')
            .map((r) => ({
                id: r.id,
                code: r.code,
                name: r.name,
                unit: 'Patients',
            }));
    }, [rows]);

    // --------------------------------------------
    // ACTIONS
    // --------------------------------------------
    const onCreateBase = () => {
        setMode('create');
        setEditing(null);
        setEditingConceptUi({});
        setEditingQaUi({});
        setOpenBase(true);
    };

    const onEdit = async (uuid: string, kind?: string) => {
        const ac = new AbortController();

        try {
            setLoading(true);
            setError(null);

            const full = await getIndicator(uuid, ac.signal, 'full');

            const k = String(full.kind ?? kind ?? 'BASE').toUpperCase();

            // ✅ Composite edit routes to composite modal
            if (k === 'COMPOSITE') {
                setEditing(full);
                setMode('edit');
                setOpenComposite(true);
                return;
            }

            // block final edit for now
            if (k === 'FINAL') {
                setError('Editing final indicators is not yet supported.');
                return;
            }

            // ✅ BASE edit: restore hydration pipeline
            const authoring = normalizeAuthoring(full);

            let resolvedThemeUuid = full.themeUuid ?? '';
            let resolvedThemeConfig: DataThemeConfig | null = null;
            let pickedConditions: IndicatorCondition[] = [];

            if (authoring?.themeUuid && authoring?.themeConfig) {
                resolvedThemeUuid = authoring.themeUuid;
                resolvedThemeConfig = authoring.themeConfig;
                pickedConditions = authoring.conditions ?? [];
            } else {
                if (resolvedThemeUuid) {
                    const theme = await getDataTheme(resolvedThemeUuid, ac.signal);
                    resolvedThemeConfig = normalizeThemeConfig(theme?.configJson);
                }
                pickedConditions = [];
            }

            const { conceptUi, qaUi } = await hydrateConditionUiState(
                resolvedThemeConfig?.conditions ?? [],
                pickedConditions,
                {},
                {},
                ac.signal,
                { force: true, dedupe: true },
            );

            setEditing(full);
            setEditingConceptUi(conceptUi);
            setEditingQaUi(qaUi);

            setMode('edit');
            setOpenBase(true);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load indicator for editing');
        } finally {
            setLoading(false);
        }
    };

    const onDelete = async (uuid: string) => {
        try {
            await deleteIndicator(uuid, false, 'Retired via UI');
            const ac = new AbortController();
            await load(ac.signal);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to delete indicator');
        }
    };

    const onRun = (uuid: string) => console.log('Run indicator:', uuid);
    const onOpen = (uuid: string) => console.log('Open indicator:', uuid);

    // --------------------------------------------
    // RENDER
    // --------------------------------------------
    return (
        <Stack gap={5}>
            <Header title={t('indicators', 'Indicators')} subtitle="Create and manage report indicators." />

            {/* Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                <Search
                    size="lg"
                    labelText="Search"
                    placeholder="Search indicators…"
                    value={q}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
                />

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <AiAssistButton context={{ page: 'Indicators' }} size="sm" kind="secondary" />

                    <Button size="sm" kind="secondary" renderIcon={Download}>
                        CSV
                    </Button>

                    {tab === 'base' ? (
                        <>
                            <Button
                                size="sm"
                                kind="secondary"
                                renderIcon={Add}
                                onClick={() => {
                                    setMode('create');
                                    setEditing(null);
                                    setOpenComposite(true);
                                }}
                            >
                                Create Composite Base
                            </Button>

                            <Button size="sm" kind="primary" renderIcon={Add} onClick={onCreateBase}>
                                Create Base Indicator
                            </Button>
                        </>
                    ) : (
                        <Button size="sm" kind="primary" renderIcon={Add} onClick={() => setOpenFinal(true)}>
                            Create Final Indicator
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
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
                        {loading ? <InlineLoading description="Loading…" /> : null}
                        {!loading && error ? <div style={{ color: 'var(--cds-text-error, #da1e28)' }}>{error}</div> : null}

                        <IndicatorsTable rows={filteredRows} onOpen={onOpen} onEdit={onEdit} onRun={onRun} onDelete={onDelete} />
                    </TabPanel>

                    <TabPanel>
                        {loading ? <InlineLoading description="Loading…" /> : null}
                        {!loading && error ? <div style={{ color: 'var(--cds-text-error, #da1e28)' }}>{error}</div> : null}

                        <IndicatorsTable rows={filteredRows} onOpen={onOpen} onEdit={onEdit} onRun={onRun} onDelete={onDelete} />
                    </TabPanel>
                </TabPanels>
            </Tabs>

            {/* Modals */}
            <CreateBaseIndicatorModal
                open={openBase}
                mode={mode}
                initial={editing}
                initialConceptUi={mode === 'edit' ? editingConceptUi : undefined}
                initialQaUi={mode === 'edit' ? editingQaUi : undefined}
                onClose={() => {
                    setOpenBase(false);
                    setEditing(null);
                    setEditingConceptUi({});
                    setEditingQaUi({});
                    setMode('create');
                }}
                onSaved={async () => {
                    setOpenBase(false);
                    setEditing(null);
                    setEditingConceptUi({});
                    setEditingQaUi({});
                    setMode('create');
                    const ac = new AbortController();
                    await load(ac.signal);
                }}
                onCreate={async (payload) => {
                    await createIndicator(payload);
                }}
                onUpdate={async (id, payload) => {
                    await updateIndicator(id, payload);
                }}
            />

            <CreateCompositeBaseIndicatorModal
                open={openComposite}
                mode={mode}
                initial={editing}
                onClose={() => {
                    setOpenComposite(false);
                    setEditing(null);
                    setMode('create');
                }}
                baseIndicators={baseIndicators}
                onCreate={async (payload) => {
                    await createIndicator(payload);
                }}
                onUpdate={async (uuid, payload) => {
                    await updateIndicator(uuid, payload);
                }}
                onSaved={async () => {
                    setOpenComposite(false);
                    setEditing(null);
                    setMode('create');
                    const ac = new AbortController();
                    await load(ac.signal);
                }}
            />

            {/* Final indicator is still stubbed in your project; keep it create-only for now */}
            <CreateFinalIndicatorModal
                open={openFinal}
                mode="create"
                initial={null}
                baseIndicators={baseIndicators}
                onClose={() => setOpenFinal(false)}
                onCreate={async (payload) => {
                    await createIndicator(payload);
                }}
                onSaved={async () => {
                    setOpenFinal(false);
                    const ac = new AbortController();
                    await load(ac.signal);
                }}
            />
        </Stack>
    );
}
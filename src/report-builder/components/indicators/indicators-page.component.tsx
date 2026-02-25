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
import CreateCompositeBaseIndicatorModal, {
    type BaseIndicatorOption,
    type CreateCompositeBaseIndicatorPayload,
} from './create-composite-base-indicator-modal.component';
import CreateFinalIndicatorModal from './create-final-indicator-modal.component';

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
import type { QAUiState } from './types/condition-ui.types';
import type { SelectedConcept } from './handler/concept-search-multiselect.component';

type TabKey = 'base' | 'final';

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

/**
 * Supports multiple historical shapes of configJson:
 * - v1 flat: { themeUuid, themeConfig, conditions, sqlPreview }
 * - { base: { ... } }
 * - { authoring: { base: { ... } } }
 */
function normalizeAuthoring(ind: IndicatorDto | null | undefined): BaseIndicatorAuthoringV1 | null {
    if (!ind?.configJson) return null;

    const parsed = safeParse<any>(ind.configJson, null);
    if (!parsed || typeof parsed !== 'object') return null;

    // flat v1
    if (parsed.themeUuid && parsed.themeConfig) {
        return {
            version: 1,
            themeUuid: parsed.themeUuid,
            themeConfig: parsed.themeConfig,
            conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
            sqlPreview: parsed.sqlPreview ?? ind.sqlTemplate ?? '',
        };
    }

    // { base: {...} }
    if (parsed.base?.themeUuid && parsed.base?.themeConfig) {
        return {
            version: 1,
            themeUuid: parsed.base.themeUuid,
            themeConfig: parsed.base.themeConfig,
            conditions: Array.isArray(parsed.base.conditions) ? parsed.base.conditions : [],
            sqlPreview: parsed.base.sqlPreview ?? ind.sqlTemplate ?? '',
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
            sqlPreview: b.sqlPreview ?? ind.sqlTemplate ?? '',
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

    // ✅ preloaded edit UI maps (used by CreateBaseIndicatorModal)
    const [editingConceptUi, setEditingConceptUi] = React.useState<Record<string, SelectedConcept[]>>({});
    const [editingQaUi, setEditingQaUi] = React.useState<Record<string, QAUiState>>({});

    // --------------------------------------------
    // LOAD INDICATORS
    // --------------------------------------------
    const load = React.useCallback(
        async (signal?: AbortSignal) => {
            setLoading(true);
            setError(null);

            try {
                const indicators = await listIndicators({ q, v: 'default', includeRetired: false }, signal);

                const mapped: IndicatorRow[] = indicators.map((x) => ({
                    id: x.uuid,
                    code: x.code ?? '',
                    name: x.name ?? '',
                    kind: x.kind ?? 'BASE',
                    status: x.retired ? 'Retired' : 'Draft',
                }));

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

    const onEdit = async (uuid: string) => {
        const ac = new AbortController();

        try {
            setLoading(true);
            setError(null);

            const full = await getIndicator(uuid, ac.signal, 'full');
            const authoring = normalizeAuthoring(full);

            // Resolve theme config + picked conditions
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

            // ✅ Hydrate UI state before opening modal
            const hydrated = await hydrateConditionUiState(
                resolvedThemeConfig?.conditions ?? [],
                pickedConditions,
                {},
                {},
                ac.signal,
                { force: true, dedupe: true },
            );

            setEditing(full);
            setEditingConceptUi(hydrated.conceptUi);
            setEditingQaUi(hydrated.qaUi);

            setMode('edit');
            setOpenBase(true);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load indicator');
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

    // Composite modal wants a list of base indicators
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
    // RENDER
    // --------------------------------------------
    return (
        <Stack gap={5}>
            <Header title={t('indicators', 'Indicators')} subtitle="Create and manage report indicators." />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '1rem' }}>
                <Search
                    size="lg"
                    labelText="Search"
                    placeholder="Search indicators…"
                    value={q}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
                />

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button size="sm" kind="secondary" renderIcon={Download}>
                        CSV
                    </Button>

                    {tab === 'base' ? (
                        <>
                            <Button size="sm" kind="secondary" renderIcon={Add} onClick={() => setOpenComposite(true)}>
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
                }}
                onSaved={async () => {
                    setOpenBase(false);
                    setEditing(null);
                    setEditingConceptUi({});
                    setEditingQaUi({});
                    const ac = new AbortController();
                    await load(ac.signal);
                }}
                onCreate={async (payload) => {
                    await createIndicator(payload); // ✅ wrapper keeps Promise<void>
                }}
                onUpdate={async (uuid, payload) => {
                    await updateIndicator(uuid, payload); // ✅ wrapper keeps Promise<void>
                }}
            />

            <CreateCompositeBaseIndicatorModal
                open={openComposite}
                onClose={() => setOpenComposite(false)}
                baseIndicators={baseIndicators}
                onSubmit={async (data: CreateCompositeBaseIndicatorPayload) => {
                    console.log('Composite submit:', data);
                    setOpenComposite(false);
                    const ac = new AbortController();
                    await load(ac.signal);
                }}
            />

            <CreateFinalIndicatorModal
                open={openFinal}
                onClose={() => setOpenFinal(false)}
                onSubmit={async (data) => {
                    console.log('Final submit:', data);
                    setOpenFinal(false);
                    const ac = new AbortController();
                    await load(ac.signal);
                }}
            />
        </Stack>
    );
}
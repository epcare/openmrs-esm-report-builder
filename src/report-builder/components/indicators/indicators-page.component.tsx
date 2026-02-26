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
import CreateCompositeBaseIndicatorModal from './create-composite-base-indicator-modal.component';
import { type BaseIndicatorOption } from './types/composite-indicator.types';
import CreateFinalIndicatorModal from './create-final-indicator-modal.component';

import {
    listIndicators,
    getIndicator,
    createIndicator,
    updateIndicator,
    deleteIndicator,
    type IndicatorDto,
} from '../../services/indicator/indicators.api';

type TabKey = 'base' | 'final';

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
        setOpenBase(true);
    };

    const onEdit = async (uuid: string) => {
        try {
            setLoading(true);
            const full = await getIndicator(uuid, undefined, 'full');
            setEditing(full);
            setMode('edit');
            setOpenBase(true);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load indicator');
        } finally {
            setLoading(false);
        }
    };

    const onDelete = async (uuid: string) => {
        await deleteIndicator(uuid, false, 'Retired via UI');
        const ac = new AbortController();
        await load(ac.signal);
    };

    const onRun = (uuid: string) => console.log('Run indicator:', uuid);
    const onOpen = (uuid: string) => console.log('Open indicator:', uuid);

    // ✅ Composite builder should only get BASE indicators
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

            {/* Tabs */}
            <Tabs selectedIndex={tab === 'base' ? 0 : 1} onChange={({ selectedIndex }) => setTab(selectedIndex === 0 ? 'base' : 'final')}>
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
                onClose={() => {
                    setOpenBase(false);
                    setEditing(null);
                }}
                onSaved={async () => {
                    setOpenBase(false);
                    setEditing(null);
                    const ac = new AbortController();
                    await load(ac.signal);
                }}
                // ✅ match modal signature Promise<void>
                onCreate={async (payload) => {
                    await createIndicator(payload);
                }}
                onUpdate={async (uuid, payload) => {
                    await updateIndicator(uuid, payload);
                }}
            />

            <CreateCompositeBaseIndicatorModal
                open={openComposite}
                onClose={() => setOpenComposite(false)}
                baseIndicators={baseIndicators}
                onSubmit={async (data) => {
                    // TODO: wire composite create endpoint when ready.
                    // For now, log + close + reload.
                    // eslint-disable-next-line no-console
                    console.log('Composite submit:', data);
                    setOpenComposite(false);
                    const ac = new AbortController();
                    await load(ac.signal);
                }}
                onCreate={async (payload) => {
                    await createIndicator(payload);
                }} mode={'create'} onUpdate={function (uuid: string, payload: Partial<IndicatorDto>): Promise<void> {
                throw new Error('Function not implemented.');
            }} onSaved={function (): void {
                throw new Error('Function not implemented.');
            }}            />

            <CreateFinalIndicatorModal
                open={openFinal}
                onClose={() => setOpenFinal(false)}
                onSubmit={async (data) => {
                    // TODO: wire final create endpoint when ready.
                    // eslint-disable-next-line no-console
                    console.log('Final submit:', data);
                    setOpenFinal(false);
                    const ac = new AbortController();
                    await load(ac.signal);
                }}
            />
        </Stack>
    );
}
import React from 'react';
import { Button, Tabs, TabList, Tab, TabPanels, TabPanel, Search, Stack } from '@carbon/react';
import { Add, Download } from '@carbon/icons-react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Header from '../header/header.component';
import IndicatorsTable, { IndicatorRow } from './indicators-table.component';
import CreateBaseIndicatorModal from './create-base-indicator-modal.component';
import CreateCompositeBaseIndicatorModal, {
    BaseIndicatorOption,
} from './create-composite-base-indicator-modal.component';
import styles from './indicators-page.scss';

const mockRows: IndicatorRow[] = [
    { id: '1', code: 'MAL_PREG', name: 'Pregnant Women with Malaria', theme: 'Diagnosis Data', unit: 'Patients', status: 'Draft' },
    { id: '2', code: 'HIV_ART', name: 'HIV Patients on ART', theme: 'Observations', unit: 'Patients', status: 'Published' },
    { id: '3', code: 'MAL_CASES', name: 'Malaria Cases', theme: 'Diagnosis Data', unit: 'Patients', status: 'Draft' },
];

type TabKey = 'base' | 'final';

const IndicatorsPage: React.FC = () => {
    const location = useLocation();
    const { t } = useTranslation();

    const [tab, setTab] = React.useState<TabKey>('base');
    const [q, setQ] = React.useState('');
    const [openCreateBase, setOpenCreateBase] = React.useState(false);
    const [openComposite, setOpenComposite] = React.useState(false); // ✅ NEW

    React.useEffect(() => {
        const params = new URLSearchParams(location.search);

        if (params.get('create') === 'base') {
            setOpenCreateBase(true);
            setTab('base');
        }

        // ✅ NEW: /indicators?create=composite
        if (params.get('create') === 'composite') {
            setOpenComposite(true);
            setTab('base');
        }
    }, [location.search]);

    const rows = React.useMemo(() => {
        const s = q.trim().toLowerCase();
        return mockRows.filter(
            (r) =>
                !s ||
                r.name.toLowerCase().includes(s) ||
                r.theme.toLowerCase().includes(s) ||
                r.code.toLowerCase().includes(s),
        );
    }, [q]);

    // ✅ options for composite modal (use only base indicators later; for now use current rows)
    const baseOptions: BaseIndicatorOption[] = React.useMemo(
        () =>
            rows.map((r) => ({
                id: r.id,
                code: r.code,
                name: r.name,
            })),
        [rows],
    );

    const onSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setQ(e.target.value);
    }, []);

    const renderPanel = (kind: TabKey) => (
        <div className={styles.panel}>
            <Stack gap={4}>
                <Search size="lg" labelText="Search" placeholder="Search" value={q} onChange={onSearchChange} />
                <IndicatorsTable rows={rows} onOpen={(id) => console.log(`open ${kind} indicator`, id)} />
            </Stack>
        </div>
    );

    const selectedIndex = tab === 'base' ? 0 : 1;

    return (
        <div className={styles.page}>
            <Header
                title={t('reportIndicator', 'Manage Report Indicators')}
                subtitle={t('buildReportIndicator', 'Manage report indicators and create report indicators.')}
                status={{ label: t('draft', 'Draft'), kind: 'warning' }}
            />

            <div className={styles.indicatorsPage}>
                <div className={styles.headerRow}>
                    <h3 className={styles.title}>Indicators</h3>

                    <div className={styles.headerActions}>
                        <Button size="sm" kind="secondary" renderIcon={Download}>
                            CSV
                        </Button>

                        {/* ✅ NEW button */}
                        <Button size="sm" kind="tertiary" onClick={() => setOpenComposite(true)}>
                            Create Composite Base Indicator
                        </Button>

                        <Button size="sm" kind="primary" renderIcon={Add} onClick={() => setOpenCreateBase(true)}>
                            Create Base Indicator
                        </Button>
                    </div>
                </div>

                <Tabs selectedIndex={selectedIndex} onChange={({ selectedIndex }) => setTab(selectedIndex === 0 ? 'base' : 'final')}>
                    <TabList aria-label="Indicator tabs">
                        <Tab>Base Indicators</Tab>
                        <Tab>Final Indicators</Tab>
                    </TabList>

                    <TabPanels>
                        <TabPanel>{renderPanel('base')}</TabPanel>
                        <TabPanel>{renderPanel('final')}</TabPanel>
                    </TabPanels>
                </Tabs>

                <CreateBaseIndicatorModal
                    open={openCreateBase}
                    onClose={() => setOpenCreateBase(false)}
                    onSubmit={(data) => console.log('create base', data)}
                />

                {/* ✅ NEW: Composite modal plugged in */}
                <CreateCompositeBaseIndicatorModal
                    open={openComposite}
                    onClose={() => setOpenComposite(false)}
                    baseIndicators={baseOptions}
                    previewCount={124}
                    onSubmit={(data) => console.log('create composite', data)}
                />
            </div>
        </div>
    );
};

export default IndicatorsPage;
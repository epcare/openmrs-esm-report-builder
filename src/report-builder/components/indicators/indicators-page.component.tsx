import React from 'react';
import { Button, Tabs, TabList, Tab, TabPanels, TabPanel, Search, Stack } from '@carbon/react';
import { Add, Download } from '@carbon/icons-react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Header from '../header/header.component';
import IndicatorsTable, { IndicatorRow } from './indicators-table.component';
import CreateBaseIndicatorModal, { CreateBaseIndicatorPayload } from './create-base-indicator-modal.component';
import CreateCompositeBaseIndicatorModal, {
  type BaseIndicatorOption,
  type CreateCompositeBaseIndicatorPayload,
} from './create-composite-base-indicator-modal.component';
import CreateFinalIndicatorModal from './create-final-indicator-modal.component';
import styles from './indicators-page.scss';

const initialRows: IndicatorRow[] = [
  { id: '1', code: 'MAL_PREG', name: 'Pregnant Women with Malaria', theme: 'Diagnosis Data', unit: 'Patients', status: 'Draft' },
  { id: '2', code: 'HIV_ART', name: 'HIV Patients on ART', theme: 'Observations', unit: 'Patients', status: 'Published' },
  { id: '3', code: 'MAL_CASES', name: 'Malaria Cases', theme: 'Diagnosis Data', unit: 'Patients', status: 'Draft' },
];

const THEME_LABELS: Record<string, string> = {
  DIAGNOSIS: 'Diagnosis Data',
  OBSERVATIONS: 'Observations',
  MEDICATIONS: 'Medications',
  LAB: 'Laboratory',
  VISITS: 'Visits',
  ENCOUNTERS: 'Encounters',
};

const toThemeLabel = (theme: string) => THEME_LABELS[theme] ?? theme;

type TabKey = 'base' | 'final';

const IndicatorsPage: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const [tab, setTab] = React.useState<TabKey>('base');
  const [q, setQ] = React.useState('');
  const [rowsState, setRowsState] = React.useState<IndicatorRow[]>(() => initialRows);

  const [openCreateBase, setOpenCreateBase] = React.useState(false);
  const [openCreateComposite, setOpenCreateComposite] = React.useState(false);
  const [openCreateFinal, setOpenCreateFinal] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const create = params.get('create');

    if (create === 'base') {
      setTab('base');
      setOpenCreateBase(true);
    } else if (create === 'composite') {
      setTab('base');
      setOpenCreateComposite(true);
    } else if (create === 'final') {
      setTab('final');
      setOpenCreateFinal(true);
    }
  }, [location.search]);

  const filteredRows = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    return rowsState.filter(
        (r) =>
            !s ||
            r.name.toLowerCase().includes(s) ||
            r.theme.toLowerCase().includes(s) ||
            r.unit.toLowerCase().includes(s) ||
            r.code.toLowerCase().includes(s),
    );
  }, [q, rowsState]);

  const onSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value), []);

  const selectedIndex = tab === 'base' ? 0 : 1;

  const renderPanel = (kind: TabKey) => (
      <div className={styles.panel}>
        <Stack gap={4}>
          <Search size="lg" labelText="Search" placeholder="Search" value={q} onChange={onSearchChange} />
          <IndicatorsTable rows={filteredRows} onOpen={(id) => console.log(`open ${kind} indicator`, id)} />
        </Stack>
      </div>
  );

  // ✅ Provide base indicators for composite modal
  const baseIndicators: BaseIndicatorOption[] = React.useMemo(() => {
    // For now, treat ALL rows as "base" since we don't yet persist types.
    // Later: filter by a real flag/type (base vs composite vs final).
    return rowsState.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      unit: r.unit, // Patients | Encounters
      // populationSqlTemplate: (optional) wire later from backend storage
    }));
  }, [rowsState]);

  const handleCreateBase = (data: CreateBaseIndicatorPayload) => {
    const inferredName =
        data.name?.trim() ||
        (data.diagnosis?.conceptLabels?.length
            ? `${data.diagnosis.conceptLabels.join(', ')} Indicator`
            : 'New Indicator');

    setRowsState((prev) => [
      {
        id: crypto.randomUUID(),
        code: data.code,
        name: inferredName,
        theme: toThemeLabel(data.theme),
        unit: data.unit,
        status: 'Draft',
      },
      ...prev,
    ]);

    setOpenCreateBase(false);
    // eslint-disable-next-line no-console
    console.log('Base indicator payload:', data);
  };

  const handleCreateComposite = (data: CreateCompositeBaseIndicatorPayload) => {
    // For now we just add it as another row so it appears in the table.
    // Later: mark it as composite + store SQL template, etc.
    setRowsState((prev) => [
      {
        id: crypto.randomUUID(),
        code: data.code,
        name: data.name,
        theme: 'Composite', // or keep "Diagnosis Data" depending on your preference
        unit: (data.unit ?? 'Patients') as IndicatorRow['unit'],
        status: 'Draft',
      },
      ...prev,
    ]);

    setOpenCreateComposite(false);
    // eslint-disable-next-line no-console
    console.log('Composite base indicator payload:', data);
  };

  return (
      <div className={styles.page}>
        <Header
            title={t('reportBuilder', 'Report builder')}
            subtitle={t('buildReport', 'Define reports and generate templates')}
            status={{ label: t('draft', 'Draft'), kind: 'warning' }}
        />

        <div className={styles.indicatorsPage}>
          <div className={styles.headerRow}>
            <h3 className={styles.title}>Indicators</h3>

            <div className={styles.headerActions}>
              <Button size="sm" kind="secondary" renderIcon={Download}>
                CSV
              </Button>

              {tab === 'base' ? (
                  <>
                    <Button size="sm" kind="secondary" renderIcon={Add} onClick={() => setOpenCreateComposite(true)}>
                      Create Composite Base
                    </Button>
                    <Button size="sm" kind="primary" renderIcon={Add} onClick={() => setOpenCreateBase(true)}>
                      Create Base Indicator
                    </Button>
                  </>
              ) : (
                  <Button size="sm" kind="primary" renderIcon={Add} onClick={() => setOpenCreateFinal(true)}>
                    Create Final Indicator
                  </Button>
              )}
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
              onSubmit={handleCreateBase}
          />

          <CreateCompositeBaseIndicatorModal
              open={openCreateComposite}
              onClose={() => setOpenCreateComposite(false)}
              onSubmit={handleCreateComposite}
              baseIndicators={baseIndicators}
              // previewCount={null} // optional
              // onPreview={(x) => console.log('preview request', x)} // optional
          />

          <CreateFinalIndicatorModal
              open={openCreateFinal}
              onClose={() => setOpenCreateFinal(false)}
              onSubmit={(data) => {
                // eslint-disable-next-line no-console
                console.log('final indicator', data);
                setOpenCreateFinal(false);
              }}
          />
        </div>
      </div>
  );
};

export default IndicatorsPage;
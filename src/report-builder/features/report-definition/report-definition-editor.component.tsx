import React from 'react';
import {
  Button,
  Search,
  TextInput,
  Toggle,
  Select,
  SelectItem,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Tag,
  Checkbox,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  OverflowMenu,
  OverflowMenuItem,
} from '@carbon/react';
import { Add, ChevronDown, ChevronRight, Close, Folder, Document } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';

import styles from '../../app/report-builder/report-builder.scss';

type IndicatorKind = 'base' | 'final';

type Indicator = {
  id: string;
  code: string;
  name: string;
  kind: IndicatorKind;
  description?: string;
};

type Section = {
  id: string;
  name: string;
  description?: string;
  indicators: Indicator[];
  disaggregationEnabled: boolean;
  ageCategory: string;
};

type ReportDefinitionModel = {
  name: string;
  description: string;
  sections: Section[];
  standaloneIndicators: Indicator[];
};

const mockIndicators: Indicator[] = [
  { id: 'i-1', code: 'OPD_NEW', name: 'New OPD Visits', kind: 'base' },
  { id: 'i-2', code: 'OPD_REV', name: 'Revisits', kind: 'base' },
  { id: 'i-3', code: 'ANC_1ST', name: 'ANC First Visit', kind: 'base' },
  { id: 'i-4', code: 'MAL_CASES', name: 'Malaria Cases', kind: 'final' },
  { id: 'i-5', code: 'TOT_ADM', name: 'Total Admissions', kind: 'base' },
];

const ageCategoryOptions = [
  { value: 'standard_hmis', label: 'Standard HMIS' },
  { value: 'moh_105_opd_diag', label: 'MOH 105 OPD Diagnoses' },
  { value: 'moh_mch', label: 'MOH MCH' },
];

const ReportDefinitionEditor: React.FC = () => {
  const { t } = useTranslation();

  const [model, setModel] = React.useState<ReportDefinitionModel>(() => ({
    name: 'OPD Summary',
    description: '',
    sections: [
      {
        id: 'sec-root',
        name: 'OPD Summary',
        description: 'OPD monthly summary',
        disaggregationEnabled: true,
        ageCategory: 'standard_hmis',
        indicators: [],
      },
      {
        id: 'sec-opd',
        name: 'OPD Attendance',
        description: 'A summary of outpatient clinic attendance',
        disaggregationEnabled: true,
        ageCategory: 'standard_hmis',
        indicators: [
          { id: 'i-1', code: 'OPD_NEW', name: 'New OPD Visits', kind: 'base' },
          { id: 'i-2', code: 'OPD_REV', name: 'Revisits', kind: 'base' },
        ],
      },
      {
        id: 'sec-mat',
        name: 'Maternal Health',
        description: 'Indicators related to maternal health services',
        disaggregationEnabled: true,
        ageCategory: 'standard_hmis',
        indicators: [{ id: 'i-3', code: 'ANC_1ST', name: 'ANC First Visit', kind: 'base' }],
      },
    ],
    standaloneIndicators: [{ id: 'i-5', code: 'TOT_ADM', name: 'Total Admissions', kind: 'base' }],
  }));

  const [leftSearch, setLeftSearch] = React.useState('');
  const [midSearch, setMidSearch] = React.useState('');
  const [activeMidTab, setActiveMidTab] = React.useState<'sections' | 'finalIndicators'>('sections');

  // ✅ FIXED: keys quoted
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>(() => ({
    'sec-root': true,
    'sec-opd': true,
    'sec-mat': true,
  }));

  const [selectedSectionId, setSelectedSectionId] = React.useState<string>('sec-opd');

  const selectedSection = React.useMemo(
      () => model.sections.find((s) => s.id === selectedSectionId) ?? null,
      [model.sections, selectedSectionId],
  );

  const filteredLeftSections = React.useMemo(() => {
    const q = leftSearch.trim().toLowerCase();
    if (!q) return model.sections;
    return model.sections.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q),
    );
  }, [leftSearch, model.sections]);

  const filteredStandalone = React.useMemo(() => {
    const q = leftSearch.trim().toLowerCase();
    if (!q) return model.standaloneIndicators;
    return model.standaloneIndicators.filter((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
  }, [leftSearch, model.standaloneIndicators]);

  const midListSections = React.useMemo(() => {
    const q = midSearch.trim().toLowerCase();
    const all = model.sections.filter((s) => s.id !== 'sec-root');
    if (!q) return all;
    return all.filter((s) => s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q));
  }, [midSearch, model.sections]);

  const midFinalIndicators = React.useMemo(() => {
    const q = midSearch.trim().toLowerCase();
    const all = mockIndicators.filter((i) => i.kind === 'final');
    if (!q) return all;
    return all.filter((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
  }, [midSearch]);

  const toggleExpand = (id: string) => {
    setExpandedSections((p) => ({ ...p, [id]: !p[id] }));
  };

  const updateSelectedSection = (patch: Partial<Section>) => {
    if (!selectedSection) return;
    setModel((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === selectedSection.id ? { ...s, ...patch } : s)),
    }));
  };

  const toggleIndicatorInSection = (indicator: Indicator) => {
    if (!selectedSection) return;

    const exists = selectedSection.indicators.some((x) => x.id === indicator.id);

    setModel((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== selectedSection.id) return s;
        const nextIndicators = exists ? s.indicators.filter((x) => x.id !== indicator.id) : [...s.indicators, indicator];
        return { ...s, indicators: nextIndicators };
      }),
    }));
  };

  const removeIndicatorFromSection = (indicatorId: string) => {
    if (!selectedSection) return;
    setModel((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
          s.id === selectedSection.id ? { ...s, indicators: s.indicators.filter((x) => x.id !== indicatorId) } : s,
      ),
    }));
  };

  const panelStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid var(--cds-border-subtle, #e0e0e0)',
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 560,
  };

  const panelHeaderStyle: React.CSSProperties = {
    padding: '0.9rem 1rem',
    borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
  };

  const panelBodyStyle: React.CSSProperties = {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    flex: 1,
  };

  const bottomBarStyle: React.CSSProperties = {
    padding: '0.9rem 1rem',
    borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
  };

  const TreeRow: React.FC<{
    level?: number;
    selected?: boolean;
    onClick?: () => void;
    leftIcon?: React.ReactNode;
    label: string;
    right?: React.ReactNode;
  }> = ({ level = 0, selected, onClick, leftIcon, label, right }) => (
      <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.55rem 0.6rem',
            borderRadius: 8,
            cursor: onClick ? 'pointer' : 'default',
            background: selected ? 'rgba(0,0,0,0.04)' : 'transparent',
            marginLeft: level * 14,
          }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
          {leftIcon}
          <div style={{ fontWeight: selected ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </div>
        </div>
        {right}
      </div>
  );

  return (
      <div className={styles.designWorkspace}>
        <div style={{ marginBottom: '1rem' }}>
          <h3 className={styles.workspaceTitle}>
            {t('buildReport', 'Build Report')}: {model.name}
          </h3>
          <p className={styles.workspaceHint}>{t('draftHint', 'Draft • Define reports and generate templates')}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.2fr 0.9fr', gap: '1rem' }}>
          {/* LEFT */}
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={{ fontWeight: 600 }}>{t('reportStructure', 'Report Structure')}</div>
              <OverflowMenu size="sm" aria-label="report structure menu">
                <OverflowMenuItem itemText="Collapse all" onClick={() => setExpandedSections({})} />
                <OverflowMenuItem
                    itemText="Expand all"
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      model.sections.forEach((s) => (all[s.id] = true));
                      setExpandedSections(all);
                    }}
                />
              </OverflowMenu>
            </div>

            <div style={panelBodyStyle}>
              <Search
                  size="lg"
                  labelText={t('search', 'Search')}
                  placeholder={t('search', 'Search')}
                  value={leftSearch}
                  onChange={(e) => setLeftSearch((e.target as HTMLInputElement).value)}
              />

              <div style={{ border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 10, padding: '0.5rem' }}>
                {filteredLeftSections.map((s) => {
                  const isExpanded = !!expandedSections[s.id];
                  const isSelected = selectedSectionId === s.id;
                  const hasChildren = s.indicators.length > 0;

                  return (
                      <div key={s.id}>
                        <TreeRow
                            selected={isSelected}
                            onClick={() => setSelectedSectionId(s.id)}
                            leftIcon={
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                {hasChildren ? (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleExpand(s.id);
                                        }}
                                        style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer' }}
                                        aria-label={isExpanded ? 'collapse' : 'expand'}
                                    >
                                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>
                                ) : (
                                    <span style={{ width: 16, display: 'inline-block' }} />
                                )}
                                <Folder size={16} />
                              </div>
                            }
                            label={s.name}
                            right={
                              s.id !== 'sec-root' ? (
                                  <Tag size="sm" type="gray">
                                    {s.indicators.length}
                                  </Tag>
                              ) : null
                            }
                        />

                        {hasChildren && isExpanded ? (
                            <div style={{ marginTop: 2, marginBottom: 6 }}>
                              {s.indicators.map((ind) => (
                                  <TreeRow
                                      key={ind.id}
                                      level={1}
                                      onClick={() => setSelectedSectionId(s.id)}
                                      leftIcon={<Checkbox id={`${s.id}-${ind.id}`} checked readOnly labelText="" />}
                                      label={ind.name}
                                      right={
                                        <Tag size="sm" type="blue">
                                          {ind.kind === 'base' ? 'Base' : 'Final'}
                                        </Tag>
                                      }
                                  />
                              ))}
                            </div>
                        ) : null}
                      </div>
                  );
                })}

                <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)', paddingTop: '0.5rem' }}>
                  <TreeRow leftIcon={<ChevronDown size={16} />} label="Standalone Indicators" />
                  {filteredStandalone.map((i) => (
                      <TreeRow
                          key={i.id}
                          level={1}
                          leftIcon={<Document size={16} />}
                          label={i.name}
                          right={<Tag size="sm" type="blue">{i.kind === 'base' ? 'Base' : 'Final'}</Tag>}
                      />
                  ))}
                </div>
              </div>
            </div>

            <div style={bottomBarStyle}>
              <Button size="sm" kind="secondary" renderIcon={Add} onClick={() => console.log('add section')}>
                Add Section
              </Button>
              <Button size="sm" kind="secondary" renderIcon={Add} onClick={() => console.log('add standalone')}>
                Add Standalone Indicator
              </Button>
            </div>
          </div>

          {/* MIDDLE */}
          <div style={panelStyle}>
            <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)' }}>
              <Tabs
                  selectedIndex={activeMidTab === 'sections' ? 0 : 1}
                  onChange={({ selectedIndex }) => setActiveMidTab(selectedIndex === 0 ? 'sections' : 'finalIndicators')}
              >
                <TabList aria-label="select tabs">
                  <Tab>{t('selectSections', 'Select Sections')}</Tab>
                  <Tab>{t('selectFinalIndicators', 'Select Final Indicators')}</Tab>
                </TabList>

                <TabPanels>
                  <TabPanel>
                    <div style={{ paddingTop: '1rem' }}>
                      <Search
                          size="lg"
                          labelText={t('search', 'Search')}
                          placeholder={t('search', 'Search')}
                          value={midSearch}
                          onChange={(e) => setMidSearch((e.target as HTMLInputElement).value)}
                      />

                      <div style={{ marginTop: '0.75rem', border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 10, overflow: 'hidden' }}>
                        {midListSections.map((s) => (
                            <div
                                key={s.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedSectionId(s.id)}
                                onKeyDown={(e) => e.key === 'Enter' && setSelectedSectionId(s.id)}
                                style={{
                                  padding: '0.75rem 0.9rem',
                                  borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)',
                                  background: selectedSectionId === s.id ? 'rgba(0,0,0,0.03)' : '#fff',
                                  cursor: 'pointer',
                                }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                                  <Folder size={16} />
                                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {s.name}
                                  </div>
                                </div>
                                <Tag size="sm" type="gray">{s.indicators.length}</Tag>
                              </div>
                              {s.description ? <div style={{ opacity: 0.8, marginTop: 4 }}>{s.description}</div> : null}
                            </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ ...bottomBarStyle, marginTop: 'auto' }}>
                      <span />
                      <Button size="sm" kind="primary" renderIcon={Add} onClick={() => console.log('add sections')}>
                        Add Sections
                      </Button>
                    </div>
                  </TabPanel>

                  <TabPanel>
                    <div style={{ paddingTop: '1rem' }}>
                      <Search
                          size="lg"
                          labelText={t('search', 'Search')}
                          placeholder={t('search', 'Search')}
                          value={midSearch}
                          onChange={(e) => setMidSearch((e.target as HTMLInputElement).value)}
                      />

                      <div style={{ marginTop: '0.75rem', border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 10, overflow: 'hidden' }}>
                        {midFinalIndicators.map((i) => (
                            <div
                                key={i.id}
                                style={{
                                  padding: '0.75rem 0.9rem',
                                  borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  gap: '0.75rem',
                                }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                                <Checkbox
                                    id={`mid-final-${i.id}`}
                                    checked={selectedSection?.indicators.some((x) => x.id === i.id) ?? false}
                                    labelText=""
                                    onChange={(checked) => {
                                      if (checked) toggleIndicatorInSection(i);
                                      else removeIndicatorFromSection(i.id);
                                    }}
                                />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {i.name}
                                  </div>
                                  <div style={{ opacity: 0.75, fontSize: '0.875rem' }}>{i.code}</div>
                                </div>
                              </div>

                              <Tag size="sm" type="blue">Final</Tag>
                            </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ ...bottomBarStyle, marginTop: 'auto' }}>
                      <span />
                      <Button size="sm" kind="primary" renderIcon={Add} onClick={() => console.log('add final indicators')}>
                        Add Sections
                      </Button>
                    </div>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </div>
          </div>

          {/* RIGHT */}
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div style={{ fontWeight: 600 }}>{t('properties', 'Properties')}</div>
              <button
                  type="button"
                  aria-label="close properties"
                  style={{ border: 0, background: 'transparent', cursor: 'pointer' }}
                  onClick={() => console.log('close properties')}
              >
                <Close size={18} />
              </button>
            </div>

            <div style={panelBodyStyle}>
              {selectedSection ? (
                  <>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{selectedSection.name}</div>

                    <TextInput
                        id="section-name"
                        labelText={t('sectionName', 'Section Name')}
                        value={selectedSection.name}
                        onChange={(e) => updateSelectedSection({ name: (e.target as HTMLInputElement).value })}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.25rem' }}>
                      <div style={{ fontWeight: 600 }}>{t('disaggregation', 'Disaggregation')}</div>
                      <Toggle
                          id="disagg-toggle"
                          labelText=""
                          toggled={selectedSection.disaggregationEnabled}
                          onToggle={(toggled) => updateSelectedSection({ disaggregationEnabled: toggled })}
                      />
                    </div>

                    <Select
                        id="age-category"
                        labelText={t('ageCategory', 'Age Category')}
                        value={selectedSection.ageCategory}
                        disabled={!selectedSection.disaggregationEnabled}
                        onChange={(e) => updateSelectedSection({ ageCategory: (e.target as HTMLSelectElement).value })}
                    >
                      {ageCategoryOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value} text={o.label} />
                      ))}
                    </Select>

                    <div style={{ border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 10, overflow: 'hidden', marginTop: '0.5rem' }}>
                      <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)', fontWeight: 600 }}>
                        {t('baseIndicators', 'Base Indicators')}
                      </div>

                      {selectedSection.indicators.length === 0 ? (
                          <div style={{ padding: '0.75rem', opacity: 0.8 }}>
                            {t('noIndicators', 'No indicators selected for this section.')}
                          </div>
                      ) : (
                          <Table size="sm" useZebraStyles>
                            <TableHead>
                              <TableRow>
                                <TableHeader style={{ width: 40 }} />
                                <TableHeader>{t('indicator', 'Indicator')}</TableHeader>
                                <TableHeader style={{ width: 100 }}>{t('type', 'Type')}</TableHeader>
                                <TableHeader style={{ width: 56 }} />
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedSection.indicators.map((i) => (
                                  <TableRow key={i.id}>
                                    <TableCell>
                                      <Checkbox
                                          id={`sel-${selectedSection.id}-${i.id}`}
                                          checked
                                          labelText=""
                                          onChange={(checked) => {
                                            if (!checked) removeIndicatorFromSection(i.id);
                                          }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <div style={{ fontWeight: 600 }}>{i.name}</div>
                                      <div style={{ opacity: 0.75, fontSize: '0.85rem' }}>{i.code}</div>
                                    </TableCell>
                                    <TableCell>
                                      <Tag size="sm" type="blue">
                                        {i.kind === 'base' ? 'Base' : 'Final'}
                                      </Tag>
                                    </TableCell>
                                    <TableCell>
                                      <OverflowMenu size="sm" aria-label="indicator actions">
                                        <OverflowMenuItem itemText="View" onClick={() => console.log('view', i.id)} />
                                        <OverflowMenuItem itemText="Remove" onClick={() => removeIndicatorFromSection(i.id)} />
                                      </OverflowMenu>
                                    </TableCell>
                                  </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                      )}
                    </div>

                    <Button size="sm" kind="tertiary" renderIcon={Add} onClick={() => console.log('create indicator')} style={{ marginTop: '0.5rem', width: '100%' }}>
                      Create Indicator
                    </Button>
                  </>
              ) : (
                  <div style={{ opacity: 0.8 }}>{t('selectSection', 'Select a section to view properties.')}</div>
              )}
            </div>

            <div style={bottomBarStyle}>
              <Button size="sm" kind="secondary" onClick={() => console.log('cancel')}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button size="sm" kind="primary" renderIcon={Add} onClick={() => console.log('add sections from properties')}>
                {t('addSections', 'Add Sections')}
              </Button>
            </div>
          </div>
        </div>
      </div>
  );
};

export default ReportDefinitionEditor;
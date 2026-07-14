import React from 'react';
import {
  Button,
  Tile,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  Tag,
  Stack,
  Modal,
  ModalBody,
  ModalFooter,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  FormGroup,
  InlineNotification,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Accordion,
  AccordionItem,
} from '@carbon/react';
import { Add, TrashCan, Edit, Code, Calculator, Time } from '@carbon/icons-react';
import type { LegacyReportConfig } from '../legacy-report-editor-page.component';

type Indicator = {
  key: string;
  type: 'BASE' | 'COMPOSITE' | 'TEMPORAL';
  sqlQuery?: string;
  formula?: string;
  baseIndicator?: string;
  timePeriods?: string[];
  disaggregation: string[];
};

type Props = {
  report: LegacyReportConfig;
  onChange: (report: LegacyReportConfig) => void;
};

const indicatorTypes = [
  { value: 'BASE', label: 'Base Indicator', icon: Code, description: 'Direct SQL query indicator' },
  { value: 'COMPOSITE', label: 'Composite Indicator', icon: Calculator, description: 'Calculated from other indicators' },
  { value: 'TEMPORAL', label: 'Temporal Indicator', icon: Time, description: 'Time-based analysis of base indicators' },
];

const LegacyReportIndicatorsTab: React.FC<Props> = ({ report, onChange }) => {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'BASE' | 'COMPOSITE' | 'TEMPORAL'>('BASE');
  const [currentIndicator, setCurrentIndicator] = React.useState<Indicator>({
    key: '',
    type: 'BASE',
    disaggregation: [],
  });
  const [error, setError] = React.useState<string | null>(null);

  const indicators = React.useMemo(
    () => report.advancedFeatures?.indicatorDataSet?.indicators || [],
    [report.advancedFeatures?.indicatorDataSet?.indicators]
  );
  const dimensions = React.useMemo(
    () => report.advancedFeatures?.indicatorDataSet?.dimensionDefinitions || [],
    [report.advancedFeatures?.indicatorDataSet?.dimensionDefinitions]
  );

  const getAvailableBaseIndicators = () => {
    return indicators.filter((ind) => ind.type === 'BASE');
  };

  const getDimensionOptions = () => {
    return dimensions.map((dim) => dim.name);
  };

  const handleAdd = (type: 'BASE' | 'COMPOSITE' | 'TEMPORAL') => {
    setCurrentIndicator({
      key: '',
      type,
      disaggregation: [],
      ...(type === 'TEMPORAL' && { timePeriods: ['current', 'q-1', 'q-2', 'q-3', 'q-4'] }),
    });
    setEditingIndex(null);
    setShowModal(true);
    setError(null);
  };

  const handleEdit = (index: number) => {
    const indicator = indicators[index];
    setCurrentIndicator({ ...indicator });
    setActiveTab(indicator.type);
    setEditingIndex(index);
    setShowModal(true);
    setError(null);
  };

  const handleDelete = (index: number) => {
    if (confirm('Are you sure you want to delete this indicator?')) {
      const updatedIndicators = indicators.filter((_, i) => i !== index);
      onChange({
        ...report,
        advancedFeatures: {
          ...report.advancedFeatures,
          indicatorDataSet: {
            ...report.advancedFeatures.indicatorDataSet,
            indicators: updatedIndicators,
          },
        },
      });
    }
  };

  const handleSave = () => {
    if (!currentIndicator.key.trim()) {
      setError('Indicator key is required');
      return;
    }

    // Check for duplicate keys
    const isDuplicate = indicators.some((ind, index) =>
      ind.key === currentIndicator.key && index !== editingIndex
    );

    if (isDuplicate) {
      setError('An indicator with this key already exists');
      return;
    }

    // Validate based on type
    if (currentIndicator.type === 'BASE' && !currentIndicator.sqlQuery?.trim()) {
      setError('SQL query is required for base indicators');
      return;
    }

    if (currentIndicator.type === 'COMPOSITE' && !currentIndicator.formula?.trim()) {
      setError('Formula is required for composite indicators');
      return;
    }

    if (currentIndicator.type === 'TEMPORAL' && !currentIndicator.baseIndicator?.trim()) {
      setError('Base indicator reference is required for temporal indicators');
      return;
    }

    let updatedIndicators;
    if (editingIndex !== null) {
      updatedIndicators = indicators.map((ind, index) =>
        index === editingIndex ? currentIndicator : ind
      );
    } else {
      updatedIndicators = [...indicators, currentIndicator];
    }

    onChange({
      ...report,
      advancedFeatures: {
        ...report.advancedFeatures,
        indicatorDataSet: {
          ...report.advancedFeatures.indicatorDataSet,
          indicators: updatedIndicators,
        },
      },
    });

    setShowModal(false);
    setCurrentIndicator({
      key: '',
      type: 'BASE',
      disaggregation: [],
    });
    setEditingIndex(null);
    setError(null);
  };

  const getIndicatorTypeIcon = (type: string) => {
    switch (type) {
      case 'BASE': return Code;
      case 'COMPOSITE': return Calculator;
      case 'TEMPORAL': return Time;
      default: return Code;
    }
  };

  const filteredIndicators = React.useMemo(() => {
    return indicators.filter((ind) => ind.type === activeTab);
  }, [indicators, activeTab]);

  return (
    <Stack gap={6}>
      <Tile>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ marginTop: 0 }}>Report Indicators</h4>
            <p style={{ opacity: 0.7, margin: 0 }}>
              Define and configure indicators for this report ({indicators.length} total)
            </p>
          </div>
        </div>
      </Tile>

      {/* Indicator Type Tabs */}
      <Tabs
        selectedIndex={activeTab === 'BASE' ? 0 : activeTab === 'COMPOSITE' ? 1 : 2}
        onChange={({ selectedIndex }) => {
          setActiveTab(selectedIndex === 0 ? 'BASE' : selectedIndex === 1 ? 'COMPOSITE' : 'TEMPORAL');
        }}
      >
        <TabList aria-label="Indicator type tabs">
          <Tab>Base Indicators ({indicators.filter((i) => i.type === 'BASE').length})</Tab>
          <Tab>Composite Indicators ({indicators.filter((i) => i.type === 'COMPOSITE').length})</Tab>
          <Tab>Temporal Indicators ({indicators.filter((i) => i.type === 'TEMPORAL').length})</Tab>
        </TabList>

        <TabPanels>
          {(['BASE', 'COMPOSITE', 'TEMPORAL'] as const).map((type) => (
            <TabPanel key={type}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h5 style={{ margin: 0 }}>
                    {indicatorTypes.find((t) => t.value === type)?.label}
                  </h5>
                  <p style={{ opacity: 0.7, fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
                    {indicatorTypes.find((t) => t.value === type)?.description}
                  </p>
                </div>
                <Button size="sm" kind="primary" renderIcon={Add} onClick={() => handleAdd(type)}>
                  Add {type === 'BASE' ? 'Base' : type === 'COMPOSITE' ? 'Composite' : 'Temporal'} Indicator
                </Button>
              </div>

              {filteredIndicators.length === 0 ? (
                <Tile style={{ textAlign: 'center', padding: '3rem' }}>
                  <p style={{ opacity: 0.7 }}>
                    No {type.toLowerCase()} indicators defined yet. Click "Add {type === 'BASE' ? 'Base' : type === 'COMPOSITE' ? 'Composite' : 'Temporal'} Indicator" to create one.
                  </p>
                </Tile>
              ) : (
                <TableContainer>
                  <Table size="lg">
                    <TableHead>
                      <TableRow>
                        <TableHeader>Indicator Key</TableHeader>
                        <TableHeader>Configuration</TableHeader>
                        <TableHeader>Disaggregation</TableHeader>
                        <TableHeader>Actions</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredIndicators.map((indicator) => {
                        const originalIndex = indicators.indexOf(indicator);
                        const IconComponent = getIndicatorTypeIcon(indicator.type);

                        return (
                          <TableRow key={originalIndex}>
                            <TableCell>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <IconComponent size={16} />
                                <code>{indicator.key}</code>
                              </div>
                            </TableCell>
                            <TableCell>
                              {indicator.type === 'BASE' && (
                                <Accordion>
                                  <AccordionItem title="View SQL Query">
                                    <pre
                                      style={{
                                        background: 'var(--cds-field-01)',
                                        padding: '0.75rem',
                                        borderRadius: '4px',
                                        fontSize: '0.85rem',
                                        maxHeight: '200px',
                                        overflow: 'auto',
                                        margin: 0
                                      }}
                                    >
                                      {indicator.sqlQuery}
                                    </pre>
                                  </AccordionItem>
                                </Accordion>
                              )}

                              {indicator.type === 'COMPOSITE' && (
                                <code style={{ fontSize: '0.9em' }}>
                                  {indicator.formula}
                                </code>
                              )}

                              {indicator.type === 'TEMPORAL' && (
                                <div>
                                  <div>Base: <strong>{indicator.baseIndicator}</strong></div>
                                  <div style={{ fontSize: '0.85em', opacity: 0.7, marginTop: '0.25rem' }}>
                                    Periods: {indicator.timePeriods?.join(', ') || 'Not configured'}
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {indicator.disaggregation.length > 0 ? (
                                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                  {indicator.disaggregation.map((dim) => (
                                    <Tag key={dim} size="sm" type="blue">
                                      {dim}
                                    </Tag>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ opacity: 0.5 }}>None</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <Button
                                  size="sm"
                                  kind="ghost"
                                  renderIcon={Edit}
                                  hasIconOnly
                                  iconDescription="Edit"
                                  onClick={() => handleEdit(originalIndex)}
                                />
                                <Button
                                  size="sm"
                                  kind="ghost"
                                  renderIcon={TrashCan}
                                  hasIconOnly
                                  iconDescription="Delete"
                                  onClick={() => handleDelete(originalIndex)}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        modalHeading={editingIndex !== null ? 'Edit Indicator' : 'Add Indicator'}
        size="lg"
      >
        <ModalBody>
          {error && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={error}
              style={{ marginBottom: '1rem' }}
              onCloseButtonClick={() => setError(null)}
            />
          )}

          <FormGroup legendText="">
            <TextInput
              id="indicator-key"
              labelText="Indicator Key"
              placeholder="e.g., ANC_FIRST_VISIT"
              value={currentIndicator.key}
              onChange={(e) => setCurrentIndicator({ ...currentIndicator, key: e.target.value.toUpperCase().replace(/\s/g, '_') })}
              style={{ marginBottom: '1rem' }}
              disabled={editingIndex !== null}
            />
          </FormGroup>

          {currentIndicator.type === 'BASE' && (
            <>
              <FormGroup legendText="">
                <TextArea
                  id="sql-query"
                  labelText="SQL Query"
                  placeholder="SELECT COUNT(*) FROM encounter WHERE..."
                  value={currentIndicator.sqlQuery || ''}
                  onChange={(e) => setCurrentIndicator({ ...currentIndicator, sqlQuery: e.target.value })}
                  rows={8}
                  style={{ marginBottom: '1rem', fontFamily: 'monospace' }}
                />
              </FormGroup>

              <FormGroup legendText="">
                <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
                  Disaggregation Dimensions
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {getDimensionOptions().map((dim) => (
                    <Button
                      key={dim}
                      size="sm"
                      kind={currentIndicator.disaggregation.includes(dim) ? 'primary' : 'secondary'}
                      onClick={() => {
                        const updatedDisaggregation = currentIndicator.disaggregation.includes(dim)
                          ? currentIndicator.disaggregation.filter((d) => d !== dim)
                          : [...currentIndicator.disaggregation, dim];
                        setCurrentIndicator({ ...currentIndicator, disaggregation: updatedDisaggregation });
                      }}
                    >
                      {dim}
                    </Button>
                  ))}
                </div>
              </FormGroup>
            </>
          )}

          {currentIndicator.type === 'COMPOSITE' && (
            <FormGroup legendText="">
              <TextInput
                id="formula"
                labelText="Formula"
                placeholder="e.g., INDICATOR_A / INDICATOR_B * 100"
                value={currentIndicator.formula || ''}
                onChange={(e) => setCurrentIndicator({ ...currentIndicator, formula: e.target.value })}
                style={{ marginBottom: '1rem', fontFamily: 'monospace' }}
              />
              <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: 0 }}>
                Use indicator keys in your formula. Available indicators: {getAvailableBaseIndicators().map((i) => i.key).join(', ')}
              </p>
            </FormGroup>
          )}

          {currentIndicator.type === 'TEMPORAL' && (
            <>
              <FormGroup legendText="">
                <Select
                  id="base-indicator"
                  labelText="Base Indicator"
                  value={currentIndicator.baseIndicator || ''}
                  onChange={(e) => setCurrentIndicator({ ...currentIndicator, baseIndicator: e.target.value })}
                  style={{ marginBottom: '1rem' }}
                >
                  <SelectItem value="" text="Select base indicator" />
                  {getAvailableBaseIndicators().map((ind) => (
                    <SelectItem key={ind.key} value={ind.key} text={ind.key} />
                  ))}
                </Select>
              </FormGroup>

              <FormGroup legendText="">
                <label style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>
                  Time Periods
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['current', 'm-1', 'm-2', 'm-3', 'q-1', 'q-2', 'q-3', 'q-4', 'y-1'].map((period) => (
                    <Button
                      key={period}
                      size="sm"
                      kind={currentIndicator.timePeriods?.includes(period) ? 'primary' : 'secondary'}
                      onClick={() => {
                        const updatedPeriods = currentIndicator.timePeriods?.includes(period)
                          ? currentIndicator.timePeriods.filter((p) => p !== period)
                          : [...(currentIndicator.timePeriods || []), period];
                        setCurrentIndicator({ ...currentIndicator, timePeriods: updatedPeriods });
                      }}
                    >
                      {period}
                    </Button>
                  ))}
                </div>
              </FormGroup>
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <Button kind="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button kind="primary" onClick={handleSave}>
            {editingIndex !== null ? 'Update' : 'Add'} Indicator
          </Button>
        </ModalFooter>
      </Modal>
    </Stack>
  );
};

export default LegacyReportIndicatorsTab;

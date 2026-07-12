import React from 'react';
import {
  Button,
  Tile,
  Stack,
  Modal,
  ModalBody,
  ModalFooter,
  TextInput,
  Select,
  SelectItem,
  FormGroup,
  TextArea,
  InlineNotification,
  Accordion,
  AccordionItem,
} from '@carbon/react';
import { Add, TrashCan, Edit, Code } from '@carbon/icons-react';
import type { LegacyReportConfig } from '../legacy-report-editor-page.component';

type DatasetDefinition = {
  name: string;
  type: string;
  config: {
    sql: string;
  };
};

type Props = {
  report: LegacyReportConfig;
  onChange: (report: LegacyReportConfig) => void;
};

const datasetTypes = [
  { value: 'SQL_DATA_SET', label: 'SQL Dataset' },
  { value: 'INDICATOR_DATA_SET', label: 'Indicator Dataset' },
  { value: 'COHORT_DATA_SET', label: 'Cohort Dataset' },
];

const LegacyReportDatasetsTab: React.FC<Props> = ({ report, onChange }) => {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [currentDataset, setCurrentDataset] = React.useState<DatasetDefinition>({
    name: '',
    type: 'SQL_DATA_SET',
    config: { sql: '' },
  });
  const [error, setError] = React.useState<string | null>(null);

  const datasets = report.dataSetDefinitions || [];

  const handleAdd = () => {
    setCurrentDataset({
      name: '',
      type: 'SQL_DATA_SET',
      config: { sql: '' },
    });
    setEditingIndex(null);
    setShowModal(true);
    setError(null);
  };

  const handleEdit = (index: number) => {
    setCurrentDataset(JSON.parse(JSON.stringify(datasets[index])));
    setEditingIndex(index);
    setShowModal(true);
    setError(null);
  };

  const handleDelete = (index: number) => {
    if (confirm('Are you sure you want to delete this dataset?')) {
      const updatedDatasets = datasets.filter((_, i) => i !== index);
      onChange({
        ...report,
        dataSetDefinitions: updatedDatasets,
      });
    }
  };

  const handleSave = () => {
    if (!currentDataset.name.trim()) {
      setError('Dataset name is required');
      return;
    }

    // Check for duplicate names
    const isDuplicate = datasets.some((ds, index) =>
      ds.name === currentDataset.name && index !== editingIndex
    );

    if (isDuplicate) {
      setError('A dataset with this name already exists');
      return;
    }

    if (currentDataset.type === 'SQL_DATA_SET' && !currentDataset.config.sql.trim()) {
      setError('SQL query is required for SQL datasets');
      return;
    }

    let updatedDatasets;
    if (editingIndex !== null) {
      updatedDatasets = datasets.map((ds, index) =>
        index === editingIndex ? currentDataset : ds
      );
    } else {
      updatedDatasets = [...datasets, currentDataset];
    }

    onChange({
      ...report,
      dataSetDefinitions: updatedDatasets,
    });

    setShowModal(false);
    setCurrentDataset({
      name: '',
      type: 'SQL_DATA_SET',
      config: { sql: '' },
    });
    setEditingIndex(null);
    setError(null);
  };

  const formatSQL = (sql: string) => {
    // Basic SQL formatting - capitalize keywords
    const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN',
                     'UNION', 'UNION ALL', 'GROUP BY', 'ORDER BY', 'HAVING', 'INSERT', 'UPDATE',
                     'DELETE', 'CREATE', 'ALTER', 'DROP', 'AS', 'ON', 'IN', 'IS', 'NULL'];

    let formatted = sql;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, keyword);
    });

    return formatted;
  };

  return (
    <Stack gap={6}>
      <Tile>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ marginTop: 0 }}>Dataset Definitions</h4>
            <p style={{ opacity: 0.7, margin: 0 }}>
              Define SQL datasets for summary tables and report outputs
            </p>
          </div>
          <Button size="sm" kind="primary" renderIcon={Add} onClick={handleAdd}>
            Add Dataset
          </Button>
        </div>
      </Tile>

      {datasets.length === 0 ? (
        <Tile style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ opacity: 0.7 }}>No datasets defined yet. Click "Add Dataset" to create one.</p>
        </Tile>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {datasets.map((dataset, index) => (
            <Tile key={index}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Code size={16} />
                    <h5 style={{ margin: 0 }}>{dataset.name}</h5>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'var(--cds-tag-gray)',
                      fontSize: '0.85em',
                      fontWeight: 500
                    }}>
                      {dataset.type}
                    </span>
                  </div>

                  {dataset.type === 'SQL_DATA_SET' && (
                    <Accordion>
                      <AccordionItem title={`View SQL Query (${dataset.config.sql.length} characters)`}>
                        <pre
                          style={{
                            background: 'var(--cds-field-01)',
                            padding: '1rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            maxHeight: '300px',
                            overflow: 'auto',
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}
                        >
                          {formatSQL(dataset.config.sql)}
                        </pre>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                  <Button
                    size="sm"
                    kind="ghost"
                    renderIcon={Edit}
                    hasIconOnly
                    iconDescription="Edit"
                    onClick={() => handleEdit(index)}
                  />
                  <Button
                    size="sm"
                    kind="ghost"
                    renderIcon={TrashCan}
                    hasIconOnly
                    iconDescription="Delete"
                    onClick={() => handleDelete(index)}
                  />
                </div>
              </div>
            </Tile>
          ))}
        </div>
      )}

      <Tile style={{ background: 'var(--cds-background-information)' }}>
        <h5 style={{ marginTop: 0 }}>About Dataset Definitions</h5>
        <p style={{ opacity: 0.85, margin: '0.5rem 0' }}>
          Dataset definitions define the data sources and SQL queries used to generate report output.
          SQL datasets typically use UNION ALL queries to combine multiple indicators into summary tables.
        </p>
        <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem', opacity: 0.85 }}>
          <li><strong>SQL Dataset:</strong> Custom SQL queries with parameters</li>
          <li><strong>Indicator Dataset:</strong> Generated from indicator definitions</li>
          <li><strong>Cohort Dataset:</strong> Patient cohort definitions</li>
        </ul>
      </Tile>

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        modalHeading={editingIndex !== null ? 'Edit Dataset' : 'Add Dataset'}
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
              id="dataset-name"
              labelText="Dataset Name"
              placeholder="e.g., ANC_SUMMARY_TABLE"
              value={currentDataset.name}
              onChange={(e) => setCurrentDataset({ ...currentDataset, name: e.target.value })}
              style={{ marginBottom: '1rem' }}
            />
          </FormGroup>

          <FormGroup legendText="">
            <Select
              id="dataset-type"
              labelText="Dataset Type"
              value={currentDataset.type}
              onChange={(e) => setCurrentDataset({
                ...currentDataset,
                type: e.target.value,
                config: { sql: '' }, // Reset config when type changes
              })}
              style={{ marginBottom: '1rem' }}
            >
              {datasetTypes.map((type) => (
                <SelectItem key={type.value} value={type.value} text={type.label} />
              ))}
            </Select>
          </FormGroup>

          {currentDataset.type === 'SQL_DATA_SET' && (
            <FormGroup legendText="">
              <TextArea
                id="sql-query"
                labelText="SQL Query"
                placeholder="SELECT 'Indicator 1' as indicator, (SELECT COUNT(*) FROM...) as value UNION ALL SELECT 'Indicator 2' as indicator, (SELECT COUNT(*) FROM...) as value"
                value={currentDataset.config.sql}
                onChange={(e) => setCurrentDataset({
                  ...currentDataset,
                  config: { ...currentDataset.config, sql: e.target.value }
                })}
                rows={12}
                style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              />
              <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.5rem', margin: 0 }}>
                Use UNION ALL to combine multiple indicators into a single result set. Reference parameters using :parameterName syntax.
              </p>
            </FormGroup>
          )}

          {currentDataset.type === 'INDICATOR_DATA_SET' && (
            <Tile style={{ background: 'var(--cds-field-01)', padding: '1rem' }}>
              <p style={{ margin: 0 }}>
                <strong>Indicator Dataset Configuration</strong>
              </p>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.7 }}>
                This dataset will be automatically generated from the indicator definitions.
                Configure which indicators to include and their display format.
              </p>
            </Tile>
          )}

          {currentDataset.type === 'COHORT_DATA_SET' && (
            <Tile style={{ background: 'var(--cds-field-01)', padding: '1rem' }}>
              <p style={{ margin: 0 }}>
                <strong>Cohort Dataset Configuration</strong>
              </p>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.7 }}>
                Define patient cohort criteria and the data elements to include in the cohort dataset.
              </p>
            </Tile>
          )}
        </ModalBody>

        <ModalFooter>
          <Button kind="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button kind="primary" onClick={handleSave}>
            {editingIndex !== null ? 'Update' : 'Add'} Dataset
          </Button>
        </ModalFooter>
      </Modal>
    </Stack>
  );
};

export default LegacyReportDatasetsTab;

import React from 'react';
import { TextArea, TextInput, Stack, Tag, Button } from '@carbon/react';

import SqlPreview from '../sql-preview.component';

const DATA_SOURCE_SUGGESTIONS = [
  'obs',
  'person',
  'patient',
  'patient_identifier',
  'encounter',
  'programs',
  'visit',
  'provider',
];

type Props = {
  sql: string;
  businessLogic: string;
  dataSources: string[];
  dataSourceInput: string;
  onChangeBusinessLogic: (value: string) => void;
  onDataSourceInputChange: (value: string) => void;
  onAddDataSource: () => void;
  onRemoveDataSource: (source: string) => void;
};

export default function CustomIndicatorSqlPreviewSection({
  sql,
  businessLogic,
  dataSources,
  dataSourceInput,
  onChangeBusinessLogic,
  onDataSourceInputChange,
  onAddDataSource,
  onRemoveDataSource,
}: Props) {
  return (
    <Stack gap={4}>
      <h4 style={{ margin: 0 }}>SQL Preview & Metadata</h4>

      <SqlPreview value={sql} />

      <TextArea
        id="business-logic"
        labelText="Business Logic Description"
        value={businessLogic}
        rows={4}
        onChange={(e) => onChangeBusinessLogic((e.target as HTMLTextAreaElement).value)}
        placeholder="Describe what this indicator does, any special business rules, and how it should be interpreted..."
      />

      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Data Sources
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <TextInput
            id="data-source-input"
            labelText=""
            hideLabel
            value={dataSourceInput}
            onChange={(e) => onDataSourceInputChange((e.target as HTMLInputElement).value)}
            placeholder="Enter table name (e.g., obs)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddDataSource();
              }
            }}
          />
          <Button onClick={onAddDataSource} disabled={!dataSourceInput.trim()}>
            Add
          </Button>
        </div>

        <div style={{ marginTop: '0.5rem' }}>
          {dataSources.map((source) => (
            <Tag key={source} type="blue" style={{ marginRight: '0.25rem' }}>
              {source}
              <button
                type="button"
                onClick={() => onRemoveDataSource(source)}
                style={{
                  marginLeft: '0.5rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  color: 'inherit',
                }}
              >
                ×
              </button>
            </Tag>
          ))}
          {dataSources.length === 0 && (
            <Tag type="gray">No data sources specified</Tag>
          )}
        </div>

        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--cds-text-secondary, #666)' }}>
          Suggested: {DATA_SOURCE_SUGGESTIONS.join(', ')}
        </div>
      </div>
    </Stack>
  );
}

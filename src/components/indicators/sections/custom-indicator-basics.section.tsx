import React from 'react';
import { TextInput, TextArea } from '@carbon/react';

type Value = {
  name: string;
  code: string;
  description: string;
};

type Props = {
  value: Value;
  sqlTemplate: string;
  onChange: (next: Value) => void;
  onSqlChange: (sql: string) => void;
};

export default function CustomIndicatorBasicsSection({
  value,
  sqlTemplate,
  onChange,
  onSqlChange,
}: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <TextInput
        id="custom-name"
        labelText="Custom indicator name"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: (e.target as HTMLInputElement).value })}
        placeholder="e.g., RTT Treatment Outcomes"
      />

      <TextInput
        id="custom-code"
        labelText="Code (optional)"
        value={value.code}
        onChange={(e) => onChange({ ...value, code: (e.target as HTMLInputElement).value })}
        placeholder="AUTO_GENERATED"
      />

      <div style={{ gridColumn: '1 / -1' }}>
        <TextArea
          id="custom-desc"
          labelText="Description (optional)"
          value={value.description}
          rows={2}
          onChange={(e) => onChange({ ...value, description: (e.target as HTMLTextAreaElement).value })}
          placeholder="Short description of what this custom indicator represents."
        />
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <TextArea
          id="custom-sql"
          labelText="SQL Template"
          value={sqlTemplate}
          rows={10}
          onChange={(e) => onSqlChange((e.target as HTMLTextAreaElement).value)}
          placeholder="Enter your complex SQL query here. This can include multiple JOINs, subqueries, and custom business logic."
          style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
        />
      </div>
    </div>
  );
}

import React from 'react';
import { Button, TextInput, Select, SelectItem } from '@carbon/react';
import { Add, TrashCan } from '@carbon/icons-react';

import type { DataThemeConfig, ThemeField, FieldType } from '../../../types/theme/data-theme.types';

type Props = {
  config: DataThemeConfig;
  onChange: (next: DataThemeConfig) => void;
  open: boolean;
};

const FIELD_TYPES: FieldType[] = ['string', 'number', 'date', 'datetime', 'boolean', 'coded', 'json'];

function makeKey(label: string) {
  return (label ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export default function DataThemeFieldsEditorSection({ config, onChange }: Props) {
  const fields = config.fields ?? [];

  const addField = () => {
    const next: ThemeField = { key: `field_${fields.length + 1}`, label: '', expr: '', type: 'string' };
    onChange({ ...config, fields: [...fields, next] });
  };

  const updateField = (idx: number, patch: Partial<ThemeField>) => {
    const next = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f));
    onChange({ ...config, fields: next });
  };

  const removeField = (idx: number) => {
    const next = fields.filter((_, i) => i !== idx);
    onChange({ ...config, fields: next });
  };

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Fields</div>

      <div style={{ marginBottom: '0.75rem', opacity: 0.85, fontSize: '0.875rem' }}>
        Define the fields exposed by this theme. <b>expr</b> can be a column name or a SQL expression.
      </div>

      {fields.length === 0 ? (
        <div style={{ marginBottom: '0.75rem', opacity: 0.8 }}>No fields yet. Add at least one field.</div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 2fr 1fr auto', gap: '0.75rem' }}>
        <div style={{ fontWeight: 600 }}>Key</div>
        <div style={{ fontWeight: 600 }}>Label</div>
        <div style={{ fontWeight: 600 }}>Expression</div>
        <div style={{ fontWeight: 600 }}>Type</div>
        <div />

        {fields.map((f, idx) => (
          <React.Fragment key={idx}>
            <TextInput
              id={`theme-field-key-${idx}`}
              labelText=""
              hideLabel
              value={f.key}
              placeholder="field_key"
              onChange={(e) => updateField(idx, { key: (e.target as HTMLInputElement).value })}
            />

            <TextInput
              id={`theme-field-label-${idx}`}
              labelText=""
              hideLabel
              value={f.label}
              placeholder="Field label"
              onBlur={() => {
                // auto-fill key if empty
                if (!f.key && f.label) updateField(idx, { key: makeKey(f.label) });
              }}
              onChange={(e) => updateField(idx, { label: (e.target as HTMLInputElement).value })}
            />

            <TextInput
              id={`theme-field-expr-${idx}`}
              labelText=""
              hideLabel
              value={f.expr}
              placeholder="column_name or SQL expression"
              onChange={(e) => updateField(idx, { expr: (e.target as HTMLInputElement).value })}
            />

            <Select
              id={`theme-field-type-${idx}`}
              labelText=""
              hideLabel
              value={f.type}
              onChange={(e) => updateField(idx, { type: (e.target as HTMLSelectElement).value as FieldType })}
            >
              {FIELD_TYPES.map((t) => (
                <SelectItem key={t} value={t} text={t} />
              ))}
            </Select>

            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              iconDescription="Remove field"
              renderIcon={TrashCan}
              onClick={() => removeField(idx)}
            />
          </React.Fragment>
        ))}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <Button kind="secondary" size="sm" renderIcon={Add} onClick={addField}>
          Add field
        </Button>
      </div>
    </div>
  );
}

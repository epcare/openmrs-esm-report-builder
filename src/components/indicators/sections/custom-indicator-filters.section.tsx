import React, { useState } from 'react';
import {
  Stack,
  TextInput,
  Toggle,
  Button,
  Tag,
} from '@carbon/react';

import type { FilterPreservationRule } from '../types/custom-indicator.types';

type Props = {
  preserveFilters: FilterPreservationRule[];
  onChange: (rules: FilterPreservationRule[]) => void;
};

export default function CustomIndicatorFiltersSection({ preserveFilters, onChange }: Props) {
  const [newFilter, setNewFilter] = useState<Partial<FilterPreservationRule>>({
    name: '',
    description: '',
    joinPattern: '',
    wherePattern: '',
    required: false,
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const addFilter = () => {
    if (!newFilter.name || !newFilter.joinPattern) return;

    const rule: FilterPreservationRule = {
      name: newFilter.name,
      description: newFilter.description || '',
      joinPattern: newFilter.joinPattern,
      wherePattern: newFilter.wherePattern || newFilter.joinPattern,
      required: newFilter.required || false,
    };

    onChange([...preserveFilters, rule]);
    setNewFilter({
      name: '',
      description: '',
      joinPattern: '',
      wherePattern: '',
      required: false,
    });
    setShowAddForm(false);
  };

  const removeFilter = (index: number) => {
    onChange(preserveFilters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, field: keyof FilterPreservationRule, value: any) => {
    const updated = [...preserveFilters];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <Stack gap={4}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>Filter Preservation Rules</h4>
        <Button
          size="sm"
          kind="ghost"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Filter Rule'}
        </Button>
      </div>

      <p style={{ color: 'var(--cds-text-secondary, #666)', fontSize: '0.875rem' }}>
        Define which filters should be preserved during section disaggregation.
        Use regex patterns to identify JOIN and WHERE clauses.
      </p>

      {showAddForm && (
        <div
          style={{
            padding: '1rem',
            border: '1px solid var(--cds-border-subtle, #e0e0e0)',
            borderRadius: '0.25rem',
            backgroundColor: 'var(--cds-background, #fff)',
          }}
        >
          <Stack gap={3}>
            <TextInput
              id="new-filter-name"
              labelText="Filter Name"
              value={newFilter.name}
              onChange={(e) => setNewFilter({ ...newFilter, name: (e.target as HTMLInputElement).value })}
              placeholder="e.g., Location Filter"
            />

            <TextInput
              id="new-filter-desc"
              labelText="Description"
              value={newFilter.description}
              onChange={(e) =>
                setNewFilter({ ...newFilter, description: (e.target as HTMLInputElement).value })
              }
              placeholder="What does this filter do?"
            />

            <TextInput
              id="new-filter-join"
              labelText="JOIN Pattern (regex)"
              value={newFilter.joinPattern}
              onChange={(e) =>
                setNewFilter({ ...newFilter, joinPattern: (e.target as HTMLInputElement).value })
              }
              placeholder="e.g., JOIN\\s+location\\s+ON"
            />

            <TextInput
              id="new-filter-where"
              labelText="WHERE Pattern (regex)"
              value={newFilter.wherePattern}
              onChange={(e) =>
                setNewFilter({ ...newFilter, wherePattern: (e.target as HTMLInputElement).value })
              }
              placeholder="e.g., location_id\\s*=\\s*?"
            />

            <Toggle
              id="new-filter-required"
              labelText="Required for indicator"
              toggled={newFilter.required}
              onChange={(e) =>
                setNewFilter({ ...newFilter, required: (e.target as HTMLInputElement).checked })
              }
            />

            <Button size="sm" onClick={addFilter} disabled={!newFilter.name || !newFilter.joinPattern}>
              Add Filter Rule
            </Button>
          </Stack>
        </div>
      )}

      {preserveFilters.length > 0 && (
        <Stack gap={2}>
          {preserveFilters.map((filter, index) => (
            <div
              key={filter.name}
              style={{
                padding: '0.75rem',
                border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                borderRadius: '0.25rem',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '0.5rem',
              }}
            >
              <Stack gap={2}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong>{filter.name}</strong>
                  {filter.required && <Tag type="red" size="sm">Required</Tag>}
                  <Tag type="blue" size="sm">
                    {filter.joinPattern.includes('JOIN') ? 'JOIN' : 'WHERE'}
                  </Tag>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-secondary, #666)' }}>
                  {filter.description}
                </p>
                <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', opacity: 0.8 }}>
                  <div>JOIN: /{filter.joinPattern}/</div>
                  <div>WHERE: /{filter.wherePattern}/</div>
                </div>
              </Stack>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Button
                  size="sm"
                  kind="ghost"
                  hasIconOnly
                  iconDescription="Remove"
                  onClick={() => removeFilter(index)}
                >
                  ×
                </Button>
                <Toggle
                  id={`filter-req-${index}`}
                  labelText="Required"
                  hideLabel
                  toggled={filter.required}
                  size="sm"
                  onChange={(e) =>
                    updateFilter(index, 'required', (e.target as HTMLInputElement).checked)
                  }
                />
              </div>
            </div>
          ))}
        </Stack>
      )}

      {preserveFilters.length === 0 && (
        <Tag type="gray">No filter preservation rules defined</Tag>
      )}
    </Stack>
  );
}

/**
 * Dashboard Basics Section
 * Name, code, description, type, active, sort order.
 */

import React from 'react';
import { Checkbox, NumberInput, Select, SelectItem, Stack, TextArea, TextInput } from '@carbon/react';
import type { DashboardType } from '../../../types/dashboard/dashboard.types';
import type { DashboardFormState } from '../dashboard-form-modal.component';

interface DashboardBasicsSectionProps {
    form: DashboardFormState;
    onChange: (updates: Partial<DashboardFormState>) => void;
}

const TYPE_OPTIONS: { value: DashboardType; label: string }[] = [
    { value: 'ETL', label: 'ETL' },
    { value: 'REPORT', label: 'Report' },
    { value: 'CUSTOM', label: 'Custom' },
];

export default function DashboardBasicsSection({ form, onChange }: DashboardBasicsSectionProps) {
    return (
        <fieldset>
            <legend>Basics</legend>
            <Stack gap={4}>
                <TextInput
                    id="dashboard-name"
                    labelText="Name"
                    required
                    placeholder="e.g., ETL Dashboard"
                    value={form.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                />
                <TextInput
                    id="dashboard-code"
                    labelText="Code"
                    placeholder="e.g., etl-dashboard"
                    helperText="Lowercase letters, numbers, dashes. Used in the URL: /dashboards/:code"
                    value={form.code}
                    onChange={(e) => onChange({ code: e.target.value })}
                />
                <TextArea
                    id="dashboard-description"
                    labelText="Description"
                    rows={2}
                    value={form.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                />
                <Select
                    id="dashboard-type"
                    labelText="Dashboard type"
                    value={form.dashboardType}
                    onChange={(e) => onChange({ dashboardType: e.target.value as DashboardType })}
                >
                    {TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} text={opt.label} />
                    ))}
                </Select>
                <Stack orientation="horizontal" gap={5}>
                    <NumberInput
                        id="dashboard-sort-order"
                        label="Sort order"
                        value={form.sortOrder}
                        onChange={(event) => {
                            const value = (event.target as HTMLInputElement | undefined)?.value;
                            if (value !== undefined) onChange({ sortOrder: parseInt(value, 10) || 0 });
                        }}
                    />
                    <Checkbox
                        id="dashboard-active"
                        labelText="Active"
                        checked={form.active}
                        onChange={(_, { checked }) => onChange({ active: checked })}
                    />
                </Stack>
            </Stack>
        </fieldset>
    );
}

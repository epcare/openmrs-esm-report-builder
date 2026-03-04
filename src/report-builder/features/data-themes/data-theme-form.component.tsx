import React from 'react';
import { TextInput, TextArea, Select, SelectItem, Stack } from '@carbon/react';
import type { DataTheme, MainDataDomain } from '../../types/theme/data-theme.types';

type Props = {
    value: DataTheme;
    onChange: (next: DataTheme) => void;
};

const DOMAIN_OPTIONS: Array<{ value: MainDataDomain; label: string }> = [
    { value: 'OBSERVATIONS', label: 'Observations' },
    { value: 'TEST_ORDERS', label: 'Test Orders' },
    { value: 'MEDICATION_ORDERS', label: 'Medication Orders' },
    { value: 'APPOINTMENTS', label: 'Appointments' },
    { value: 'MEDICATION_DISPENSE', label: 'Medication Dispense' },
];

export default function DataThemeForm({ value, onChange }: Props) {
    return (
        <Stack gap={4}>
            <TextInput
                id="theme-name"
                labelText="Theme Name"
                value={value.name}
                onChange={(e) => onChange({ ...value, name: (e.target as HTMLInputElement).value })}
            />

            <TextInput
                id="theme-code"
                labelText="Code"
                value={value.code}
                onChange={(e) => onChange({ ...value, code: (e.target as HTMLInputElement).value })}
            />

            <TextArea
                id="theme-description"
                labelText="Description"
                value={value.description || ''}
                onChange={(e) => onChange({ ...value, description: (e.target as HTMLTextAreaElement).value })}
            />

            <Select
                id="theme-domain"
                labelText="Main Data Domain"
                value={value.domain}
                onChange={(e) =>
                    onChange({
                        ...value,
                        domain: (e.target as HTMLSelectElement).value as MainDataDomain,
                    })
                }
            >
                {DOMAIN_OPTIONS.map((x) => (
                    <SelectItem key={x.value} value={x.value} text={x.label} />
                ))}
            </Select>
        </Stack>
    );
}
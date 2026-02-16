import React from 'react';
import { TextInput, TextArea, Select, SelectItem } from '@carbon/react';
import type { DataTheme, MainDataDomain } from '../../../types/theme/data-theme.types';

const DOMAINS: Array<{ value: MainDataDomain; text: string }> = [
    { value: 'DIAGNOSIS', text: 'Diagnosis' },
    { value: 'OBSERVATIONS', text: 'Observations' },
    { value: 'TEST_ORDERS', text: 'Test Orders' },
    { value: 'MEDICATION_ORDERS', text: 'Medication Orders' },
    { value: 'APPOINTMENTS', text: 'Appointments' },
    { value: 'MEDICATION_DISPENSE', text: 'Medication Dispense' },
];

type Props = {
    value: Pick<DataTheme, 'name' | 'description' | 'code' | 'domain'>;
    onChange: (next: Props['value']) => void;
};

export default function DataThemeBasicsSection({ value, onChange }: Props) {
    return (
        <div>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Basics</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <TextInput
                    id="theme-name"
                    labelText="Name"
                    value={value.name}
                    onChange={(e) => onChange({ ...value, name: (e.target as HTMLInputElement).value })}
                />
                <TextInput
                    id="theme-code"
                    labelText="Code"
                    helperText="Short unique code (e.g. DX_OPD)"
                    value={value.code}
                    onChange={(e) => onChange({ ...value, code: (e.target as HTMLInputElement).value })}
                />
            </div>

            <div style={{ marginTop: '0.75rem' }}>
                <Select
                    id="theme-domain"
                    labelText="Main domain"
                    value={value.domain}
                    onChange={(e) => onChange({ ...value, domain: (e.target as HTMLSelectElement).value as MainDataDomain })}
                >
                    {DOMAINS.map((d) => (
                        <SelectItem key={d.value} value={d.value} text={d.text} />
                    ))}
                </Select>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
                <TextArea
                    id="theme-desc"
                    labelText="Description"
                    value={value.description ?? ''}
                    onChange={(e) => onChange({ ...value, description: (e.target as HTMLTextAreaElement).value })}
                />
            </div>
        </div>
    );
}
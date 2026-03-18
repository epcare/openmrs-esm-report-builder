import React from 'react';
import { TextInput, TextArea } from '@carbon/react';

type Value = {
    name: string;
    code: string;
    description: string;
};

type Props = {
    value: Value;
    onChange: (next: Value) => void;
};

export default function FinalIndicatorBasicsSection({ value, onChange }: Props) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <TextInput
                id="final-name"
                labelText="Final indicator name"
                value={value.name}
                onChange={(e) => onChange({ ...value, name: (e.target as HTMLInputElement).value })}
                placeholder="e.g., OPD Confirmed Malaria by age/gender"
            />

            <TextInput
                id="final-code"
                labelText="Code (optional)"
                value={value.code}
                onChange={(e) => onChange({ ...value, code: (e.target as HTMLInputElement).value })}
                placeholder="AUTO_GENERATED"
            />

            <div style={{ gridColumn: '1 / -1' }}>
                <TextArea
                    id="final-desc"
                    labelText="Description (optional)"
                    value={value.description}
                    rows={3}
                    onChange={(e) => onChange({ ...value, description: (e.target as HTMLTextAreaElement).value })}
                    placeholder="Short description of what this final indicator represents."
                />
            </div>
        </div>
    );
}
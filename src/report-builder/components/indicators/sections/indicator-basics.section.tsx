import React from 'react';
import { Stack, TextInput, TextArea } from '@carbon/react';

type Value = {
    name: string;
    code: string;
    description: string;
};

type Props = {
    value: Value;
    onChange: (next: Value) => void;
};

export default function IndicatorBasicsSection({ value, onChange }: Props) {
    return (
        <Stack gap={6}>
            <TextInput
                id="indicator-name"
                labelText="Name"
                value={value.name}
                onChange={(e) => onChange({ ...value, name: (e.target as HTMLInputElement).value })}
            />

            <TextInput
                id="indicator-code"
                labelText="Code (optional)"
                value={value.code}
                onChange={(e) => onChange({ ...value, code: (e.target as HTMLInputElement).value })}
            />

            <TextArea
                id="indicator-desc"
                labelText="Description (optional)"
                value={value.description}
                onChange={(e) => onChange({ ...value, description: (e.target as HTMLTextAreaElement).value })}
            />
        </Stack>
    );
}
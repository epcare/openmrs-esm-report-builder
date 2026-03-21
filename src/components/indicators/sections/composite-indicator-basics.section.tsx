import React from 'react';
import { Stack, TextInput, TextArea } from '@carbon/react';

type Props = {
    value: { name: string; code: string; description: string };
    onChange: (next: { name: string; code: string; description: string }) => void;
};

export default function CompositeIndicatorBasicsSection({ value, onChange }: Props) {
    return (
        <Stack gap={5}>
            <TextInput
                id="composite-name"
                labelText="Indicator Name"
                value={value.name}
                onChange={(e) => onChange({ ...value, name: (e.target as HTMLInputElement).value })}
            />

            <TextInput
                id="composite-code"
                labelText="Code"
                helperText="Auto-generated if blank"
                value={value.code}
                onChange={(e) => onChange({ ...value, code: (e.target as HTMLInputElement).value })}
                placeholder="E.g. PREG_AND_MAL"
            />

            <TextArea
                id="composite-description"
                labelText="Description"
                value={value.description}
                onChange={(e) => onChange({ ...value, description: (e.target as HTMLTextAreaElement).value })}
            />
        </Stack>
    );
}
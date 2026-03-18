import React from 'react';
import { TextInput, TextArea } from '@carbon/react';

export function SectionBasicsPanel(props: {
    name: string;
    setName: (v: string) => void;
    description: string;
    setDescription: (v: string) => void;
}) {
    return (
        <>
            <TextInput
                id="section-name"
                labelText="Section Name"
                value={props.name}
                onChange={(e) => props.setName((e.target as HTMLInputElement).value)}
            />

            <TextArea
                id="section-desc"
                labelText="(Optional) Description"
                value={props.description}
                onChange={(e) => props.setDescription((e.target as HTMLTextAreaElement).value)}
            />
        </>
    );
}
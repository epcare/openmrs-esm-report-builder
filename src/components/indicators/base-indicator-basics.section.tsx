import React from 'react';
import { Select, SelectItem, TextArea, TextInput, Stack } from '@carbon/react';

import type { CreateBaseIndicatorPayload } from './types/base-indicator-form.types';
import { THEME_OPTIONS, THEME_LABELS } from './types/base-indicator-theme.constants';

type Props = {
    state: CreateBaseIndicatorPayload;
    onChange: (patch: Partial<CreateBaseIndicatorPayload>) => void;
};

const BaseIndicatorBasicsSection: React.FC<Props> = ({ state, onChange }) => {
    return (
        <Stack gap={5}>
            <Select
                id="theme"
                labelText="Theme"
                value={state.theme}
                onChange={(e) => onChange({ theme: (e.target as HTMLSelectElement).value })}
            >
                {THEME_OPTIONS.map((key) => (
                    <SelectItem key={key} value={key} text={THEME_LABELS[key]} />
                ))}
            </Select>

            <TextInput
                id="code"
                labelText="Code"
                helperText="Short unique code used in reports (e.g. MAL_PREG)"
                value={state.code}
                onChange={(e) => onChange({ code: (e.target as HTMLInputElement).value })}
                placeholder="e.g. MAL_PREG"
            />

            <TextInput
                id="name"
                labelText="Indicator"
                value={state.indicatorName}
                onChange={(e) => onChange({ indicatorName: (e.target as HTMLInputElement).value })}
                placeholder="e.g. Pregnant Women with Malaria"
            />

            <TextArea
                id="desc"
                labelText="Description"
                value={state.description}
                onChange={(e) => onChange({ description: (e.target as HTMLTextAreaElement).value })}
                placeholder="Short description of what this indicator represents"
            />
        </Stack>
    );
};

export default BaseIndicatorBasicsSection;
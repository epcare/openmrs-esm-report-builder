import React from 'react';
import { Checkbox } from '@carbon/react';

export type DisaggregationState = {
    gender: { enabled: boolean; male: boolean; female: boolean };
    ageGroups: { enabled: boolean; g0_4: boolean; g5_14: boolean; g15_24: boolean; g25plus: boolean };
};

type Props = {
    value: DisaggregationState;
    onChange: (next: DisaggregationState) => void;
};

function readChecked(arg1: any, arg2?: any): boolean {
    // Carbon Checkbox `onChange` differs by version:
    // - sometimes (checked, id, event)
    // - sometimes (event, { checked, id })
    if (typeof arg1 === 'boolean') return arg1;
    if (arg2 && typeof arg2.checked === 'boolean') return arg2.checked;
    return Boolean(arg1?.target?.checked);
}

const DisaggregationPanel: React.FC<Props> = ({ value, onChange }) => {
    const set = (patch: Partial<DisaggregationState>) => onChange({ ...value, ...patch });

    return (
        <div style={{ border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 8, padding: '0.75rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Disaggregation</div>

            <Checkbox
                id="gender-enabled"
                labelText="Gender"
                checked={value.gender.enabled}
                onChange={(a, b) => set({ gender: { ...value.gender, enabled: readChecked(a, b) } })}
            />
            <div style={{ display: 'flex', gap: '1rem', paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
                <Checkbox
                    id="male"
                    labelText="Male"
                    disabled={!value.gender.enabled}
                    checked={value.gender.male}
                    onChange={(a, b) => set({ gender: { ...value.gender, male: readChecked(a, b) } })}
                />
                <Checkbox
                    id="female"
                    labelText="Female"
                    disabled={!value.gender.enabled}
                    checked={value.gender.female}
                    onChange={(a, b) => set({ gender: { ...value.gender, female: readChecked(a, b) } })}
                />
            </div>

            <Checkbox
                id="age-enabled"
                labelText="Age Groups"
                checked={value.ageGroups.enabled}
                onChange={(a, b) => set({ ageGroups: { ...value.ageGroups, enabled: readChecked(a, b) } })}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', paddingLeft: '1.5rem' }}>
                <Checkbox
                    id="g0_4"
                    labelText="0-4"
                    disabled={!value.ageGroups.enabled}
                    checked={value.ageGroups.g0_4}
                    onChange={(a, b) => set({ ageGroups: { ...value.ageGroups, g0_4: readChecked(a, b) } })}
                />
                <Checkbox
                    id="g5_14"
                    labelText="5-14"
                    disabled={!value.ageGroups.enabled}
                    checked={value.ageGroups.g5_14}
                    onChange={(a, b) => set({ ageGroups: { ...value.ageGroups, g5_14: readChecked(a, b) } })}
                />
                <Checkbox
                    id="g15_24"
                    labelText="15-24"
                    disabled={!value.ageGroups.enabled}
                    checked={value.ageGroups.g15_24}
                    onChange={(a, b) => set({ ageGroups: { ...value.ageGroups, g15_24: readChecked(a, b) } })}
                />
                <Checkbox
                    id="g25plus"
                    labelText="25+"
                    disabled={!value.ageGroups.enabled}
                    checked={value.ageGroups.g25plus}
                    onChange={(a, b) => set({ ageGroups: { ...value.ageGroups, g25plus: readChecked(a, b) } })}
                />
            </div>
        </div>
    );
};

export default DisaggregationPanel;
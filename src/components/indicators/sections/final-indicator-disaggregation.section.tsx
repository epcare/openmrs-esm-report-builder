import React from 'react';
import { Checkbox } from '@carbon/react';

type Props = {
    genders: Array<'F' | 'M'>;
    onChange: (next: Array<'F' | 'M'>) => void;
};

export default function FinalIndicatorDisaggregationSection({ genders, onChange }: Props) {
    const hasF = genders.includes('F');
    const hasM = genders.includes('M');

    return (
        <div style={{ padding: '0.75rem', borderRadius: '0.25rem', background: 'var(--cds-layer-accent, #f4f4f4)' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Gender breakdown</div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <Checkbox
                    id="final-gender-f"
                    labelText="Female"
                    checked={hasF}
                    onChange={(_, { checked }) => {
                        const next = new Set(genders);
                        if (checked) next.add('F');
                        else next.delete('F');
                        onChange(Array.from(next) as Array<'F' | 'M'>);
                    }}
                />
                <Checkbox
                    id="final-gender-m"
                    labelText="Male"
                    checked={hasM}
                    onChange={(_, { checked }) => {
                        const next = new Set(genders);
                        if (checked) next.add('M');
                        else next.delete('M');
                        onChange(Array.from(next) as Array<'F' | 'M'>);
                    }}
                />
            </div>

            <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>
                Leave unchecked to get totals without gender filtering (later we can add “Total” row).
            </div>
        </div>
    );
}
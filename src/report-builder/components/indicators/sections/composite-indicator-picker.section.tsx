import React from 'react';
import { ComboBox, RadioButtonGroup, RadioButton } from '@carbon/react';
import { Information } from '@carbon/icons-react';

import type { BaseIndicatorOption, CompositeOperator } from '../types/composite-indicator.types';
import { idFieldForUnit } from '../utils/composite-indicator-sql.utils';

const labelFor = (x: BaseIndicatorOption) => {
    const unit = x.unit ? ` • ${x.unit}` : '';
    return `${x.name} (${x.code})${unit}`;
};

type Props = {
    baseIndicators: BaseIndicatorOption[];

    indicatorAId: string;
    indicatorBId: string;
    operator: CompositeOperator;

    inferredUnit: 'Patients' | 'Encounters';
    samePick: boolean;

    onChangeA: (id: string) => void;
    onChangeB: (id: string) => void;
    onChangeOperator: (op: CompositeOperator) => void;
};

type ComboItem = {
    id: string;
    label: string;
    unit?: string;
    isPlaceholder?: boolean;
};

export default function CompositeIndicatorPickerSection({
                                                            baseIndicators,
                                                            indicatorAId,
                                                            indicatorBId,
                                                            operator,
                                                            inferredUnit,
                                                            samePick,
                                                            onChangeA,
                                                            onChangeB,
                                                            onChangeOperator,
                                                        }: Props) {
    const items: ComboItem[] = React.useMemo(() => {
        const placeholder: ComboItem = { id: '', label: 'Select an indicator…', isPlaceholder: true };
        return [
            placeholder,
            ...baseIndicators.map((x) => ({
                id: x.id,
                label: labelFor(x),
                unit: x.unit,
            })),
        ];
    }, [baseIndicators]);

    const selectedA: ComboItem | null = React.useMemo(() => {
        return items.find((x) => x.id === indicatorAId) ?? (indicatorAId ? null : items[0] ?? null);
    }, [items, indicatorAId]);

    const selectedB: ComboItem | null = React.useMemo(() => {
        return items.find((x) => x.id === indicatorBId) ?? (indicatorBId ? null : items[0] ?? null);
    }, [items, indicatorBId]);

    return (
        <>
            <div style={{ fontWeight: 600 }}>Select base indicators</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'end' }}>
                <ComboBox
                    id="indicator-a"
                    titleText="Indicator A"
                    items={items}
                    itemToString={(item) => (item ? item.label : '')}
                    selectedItem={selectedA}
                    placeholder="Type to search…"
                    invalid={Boolean(samePick) && Boolean(indicatorAId) && Boolean(indicatorBId)}
                    invalidText="Indicator A and B cannot be the same."
                    onChange={({ selectedItem }) => {
                        if (!selectedItem || selectedItem.isPlaceholder) {
                            onChangeA('');
                            return;
                        }
                        onChangeA(selectedItem.id);
                    }}
                />

                <div style={{ paddingBottom: '0.35rem' }}>
                    <div style={{ fontSize: '0.875rem', opacity: 0.75, marginBottom: '0.25rem', textAlign: 'center' }}>Logic</div>
                    <div
                        style={{
                            minWidth: '6rem',
                            textAlign: 'center',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '0.25rem',
                            background: 'var(--cds-layer, #ffffff)',
                            border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                            fontWeight: 600,
                        }}
                        aria-label="Selected operator"
                    >
                        {operator === 'A_AND_NOT_B' ? 'A AND NOT B' : operator}
                    </div>
                </div>

                <ComboBox
                    id="indicator-b"
                    titleText="Indicator B"
                    items={items}
                    itemToString={(item) => (item ? item.label : '')}
                    selectedItem={selectedB}
                    placeholder="Type to search…"
                    invalid={Boolean(samePick) && Boolean(indicatorAId) && Boolean(indicatorBId)}
                    invalidText="Indicator A and B cannot be the same."
                    onChange={({ selectedItem }) => {
                        if (!selectedItem || selectedItem.isPlaceholder) {
                            onChangeB('');
                            return;
                        }
                        onChangeB(selectedItem.id);
                    }}
                />
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '0.75rem',
                    alignItems: 'center',
                    padding: '0.75rem',
                    borderRadius: '0.25rem',
                    background: 'var(--cds-layer-accent, #f4f4f4)',
                    marginTop: '0.75rem',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                    Operator <Information size={16} />
                </div>

                <RadioButtonGroup
                    legendText=""
                    name="composite-operator"
                    valueSelected={operator}
                    onChange={(val) => onChangeOperator(val as CompositeOperator)}
                    orientation="horizontal"
                >
                    <RadioButton id="op-and" labelText="AND" value="AND" />
                    <RadioButton id="op-or" labelText="OR" value="OR" />
                    <RadioButton id="op-a-not-b" labelText="A AND NOT B" value="A_AND_NOT_B" />
                </RadioButtonGroup>

                <div style={{ gridColumn: '1 / -1', fontSize: '0.875rem', opacity: 0.8 }}>
                    Composite preview is built by converting each base indicator into a population set ({idFieldForUnit(inferredUnit)}) and applying
                    set logic.
                </div>
            </div>
        </>
    );
}
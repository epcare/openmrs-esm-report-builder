import React from 'react';
import { Select, SelectItem, RadioButtonGroup, RadioButton } from '@carbon/react';
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

export default function CompositeIndicatorPickerSection({
                                                            baseIndicators,
                                                            indicatorAId,
                                                            indicatorBId,
                                                            operator,
                                                            inferredUnit,
                                                            onChangeA,
                                                            onChangeB,
                                                            onChangeOperator,
                                                        }: Props) {
    return (
        <>
            <div style={{ fontWeight: 600 }}>Select base indicators</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'end' }}>
                <Select
                    id="indicator-a"
                    labelText="Indicator A"
                    value={indicatorAId}
                    onChange={(e) => onChangeA((e.target as HTMLSelectElement).value)}
                >
                    {baseIndicators.map((x) => (
                        <SelectItem key={x.id} value={x.id} text={labelFor(x)} />
                    ))}
                </Select>

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

                <Select
                    id="indicator-b"
                    labelText="Indicator B"
                    value={indicatorBId}
                    onChange={(e) => onChangeB((e.target as HTMLSelectElement).value)}
                >
                    {baseIndicators.map((x) => (
                        <SelectItem key={x.id} value={x.id} text={labelFor(x)} />
                    ))}
                </Select>
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
                    Composite preview is built by converting each base indicator into a population set ({idFieldForUnit(inferredUnit)}) and
                    applying set logic.
                </div>
            </div>
        </>
    );
}
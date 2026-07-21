import React from 'react';
import { RadioButtonGroup, RadioButton } from '@carbon/react';
import { Information } from '@carbon/icons-react';

import type { CompositeOperator } from '../types/composite-indicator.types';
import { idFieldForUnit } from '../utils/composite-indicator-sql.utils';
import IndicatorSearchSelect from '../indicator-search-select.component';

type Props = {
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
    indicatorAId,
    indicatorBId,
    operator,
    inferredUnit,
    samePick,
    onChangeA,
    onChangeB,
    onChangeOperator,
}: Props) {
    return (
        <>
            <div style={{ fontWeight: 600 }}>Select indicators</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '0.75rem' }}>
                Search for base or composite indicators by name or code
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'end' }}>
                <IndicatorSearchSelect
                    id="indicator-a"
                    titleText="Indicator A (search by name or code)"
                    selectedId={indicatorAId}
                    kinds={['BASE', 'COMPOSITE']}
                    invalid={Boolean(samePick) && Boolean(indicatorAId) && Boolean(indicatorBId)}
                    invalidText="Indicator A and B cannot be the same."
                    placeholder=""
                    onChange={(id) => onChangeA(id)}
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

                <IndicatorSearchSelect
                    id="indicator-b"
                    titleText="Indicator B (search by name or code)"
                    selectedId={indicatorBId}
                    kinds={['BASE', 'COMPOSITE']}
                    invalid={Boolean(samePick) && Boolean(indicatorAId) && Boolean(indicatorBId)}
                    invalidText="Indicator A and B cannot be the same."
                    placeholder=""
                    onChange={(id) => onChangeB(id)}
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
                    Composite preview is built by converting each indicator into a population set ({idFieldForUnit(inferredUnit)}) and applying
                    set logic.
                </div>
            </div>
        </>
    );
}

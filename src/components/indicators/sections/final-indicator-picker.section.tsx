import React from 'react';
import { ComboBox } from '@carbon/react';

import type { BaseIndicatorOption } from '../types/composite-indicator.types';
import type { AgeCategoryOption } from '../../../resources/agegroup/mamba-agegroups.api';

type IndicatorItem = { id: string; label: string };

type Props = {
    baseIndicators: BaseIndicatorOption[];
    ageCategories: AgeCategoryOption[];

    selectedBaseId: string;
    selectedAgeCategoryCode: string;

    onChangeBaseId: (id: string) => void;
    onChangeAgeCategoryCode: (code: string) => void;
};

export default function FinalIndicatorPickerSection({
                                                        baseIndicators,
                                                        ageCategories,
                                                        selectedBaseId,
                                                        selectedAgeCategoryCode,
                                                        onChangeBaseId,
                                                        onChangeAgeCategoryCode,
                                                    }: Props) {
    const baseItems: IndicatorItem[] = React.useMemo(() => {
        return [{ id: '', label: 'Select a base indicator…' }].concat(
            baseIndicators.map((x) => ({ id: x.id, label: `${x.name} (${x.code})` })),
        );
    }, [baseIndicators]);

    const ageItems = React.useMemo(() => {
        return [{ code: '', label: 'Select an age category…', uuid: '', name: '', description: '', ageGroups: [] as any[] }].concat(ageCategories as any);
    }, [ageCategories]);

    const selectedBase = React.useMemo(
        () => baseItems.find((x) => x.id === selectedBaseId) ?? baseItems[0],
        [baseItems, selectedBaseId],
    );

    const selectedAge = React.useMemo(
        () => (ageItems as any[]).find((x) => x.code === selectedAgeCategoryCode) ?? ageItems[0],
        [ageItems, selectedAgeCategoryCode],
    );

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <ComboBox
                id="final-base-indicator"
                titleText="Base Indicator"
                items={baseItems}
                itemToString={(it) => (it ? it.label : '')}
                selectedItem={selectedBase}
                placeholder="Search base indicators…"
                onChange={({ selectedItem }) => onChangeBaseId(selectedItem?.id ?? '')}
            />

            <ComboBox
                id="final-age-category"
                titleText="Age category"
                items={ageItems as any[]}
                itemToString={(it) => (it ? it.label : '')}
                selectedItem={selectedAge as any}
                placeholder="Search age categories…"
                onChange={({ selectedItem }: any) => onChangeAgeCategoryCode(selectedItem?.code ?? '')}
            />

            {selectedAgeCategoryCode ? (
                <div style={{ gridColumn: '1 / -1', fontSize: '0.875rem', opacity: 0.8 }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Age groups in this category</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {(selectedAge?.ageGroups ?? []).map((g: any) => (
                            <span
                                key={g.id}
                                style={{
                                    padding: '0.25rem 0.5rem',
                                    border: '1px solid var(--cds-border-subtle)',
                                    borderRadius: '999px',
                                    background: 'var(--cds-layer)',
                                }}
                            >
                {g.label}
              </span>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
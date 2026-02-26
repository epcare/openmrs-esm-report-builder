import React from 'react';
import { ComboBox } from '@carbon/react';

import type { BaseIndicatorOption } from '../types/composite-indicator.types';
import type { AgeGroupSetOption } from '../../../services/agegroup/mamba-agegroups.api';

type IndicatorItem = { id: string; label: string };

type Props = {
    baseIndicators: BaseIndicatorOption[];
    ageGroupSets: AgeGroupSetOption[];
    selectedBaseId: string;
    selectedAgeSetCode: string;

    onChangeBaseId: (id: string) => void;
    onChangeAgeSetCode: (code: string) => void;
};

export default function FinalIndicatorPickerSection({
                                                        baseIndicators,
                                                        ageGroupSets,
                                                        selectedBaseId,
                                                        selectedAgeSetCode,
                                                        onChangeBaseId,
                                                        onChangeAgeSetCode,
                                                    }: Props) {
    const baseItems: IndicatorItem[] = React.useMemo(() => {
        return [{ id: '', label: 'Select a base indicator…' }].concat(
            baseIndicators.map((x) => ({ id: x.id, label: `${x.name} (${x.code})` })),
        );
    }, [baseIndicators]);

    const ageSetItems = React.useMemo(() => {
        return [{ code: '', label: 'Select an age group set…' }].concat(ageGroupSets);
    }, [ageGroupSets]);

    const selectedBase = React.useMemo(
        () => baseItems.find((x) => x.id === selectedBaseId) ?? baseItems[0],
        [baseItems, selectedBaseId],
    );

    const selectedAge = React.useMemo(
        () => ageSetItems.find((x) => x.code === selectedAgeSetCode) ?? ageSetItems[0],
        [ageSetItems, selectedAgeSetCode],
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
                id="final-age-set"
                titleText="Age group set"
                items={ageSetItems}
                itemToString={(it) => (it ? it.label : '')}
                selectedItem={selectedAge}
                placeholder="Search age group sets…"
                onChange={({ selectedItem }) => onChangeAgeSetCode(selectedItem?.code ?? '')}
            />
        </div>
    );
}
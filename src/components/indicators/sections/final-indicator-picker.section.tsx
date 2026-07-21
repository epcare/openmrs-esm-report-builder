import React from 'react';
import { ComboBox } from '@carbon/react';

import type { AgeCategoryOption } from '../../../resources/agegroup/agegroups.api';
import IndicatorSearchSelect from '../indicator-search-select.component';

type Props = {
    ageCategories: AgeCategoryOption[];

    selectedBaseId: string;
    selectedAgeCategoryCode: string;

    onChangeBaseId: (id: string) => void;
    onChangeAgeCategoryCode: (code: string) => void;
};

export default function FinalIndicatorPickerSection({
    ageCategories,
    selectedBaseId,
    selectedAgeCategoryCode,
    onChangeBaseId,
    onChangeAgeCategoryCode,
}: Props) {
    const ageItems = React.useMemo(() => {
        return [{ code: '', label: 'Select an age category…', uuid: '', name: '', description: '', ageGroups: [] as any[] }].concat(
            ageCategories as any[],
        );
    }, [ageCategories]);

    const selectedAge = React.useMemo(
        () => (ageItems as any[]).find((x) => x.code === selectedAgeCategoryCode) ?? ageItems[0],
        [ageItems, selectedAgeCategoryCode],
    );

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <IndicatorSearchSelect
                id="base-indicator"
                titleText="Base Indicator (search by name or code)"
                selectedId={selectedBaseId}
                kinds={['BASE', 'COMPOSITE']}
                placeholder=""
                onChange={(id) => onChangeBaseId(id)}
            />

            <ComboBox
                id="age-category"
                titleText="Age Category"
                items={ageItems as any[]}
                itemToString={(item) => (item ? item.label : '')}
                selectedItem={selectedAge}
                placeholder="Select an age category…"
                onChange={({ selectedItem: selected }) => {
                    const item = selected as any;
                    onChangeAgeCategoryCode(item?.code || '');
                }}
            />
        </div>
    );
}

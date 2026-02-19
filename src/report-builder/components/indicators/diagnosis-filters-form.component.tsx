/*
import React from 'react';
import { Select, SelectItem, TextInput } from '@carbon/react';

import ConceptSearchMultiSelect, { SelectedConcept } from './concept-search-multiselect.component';
import type { DiagnosisBaseConfig } from './types/indicator-types';

type Props = {
    value: DiagnosisBaseConfig;
    onChange: (next: DiagnosisBaseConfig) => void;
};

export default function DiagnosisFiltersForm({ value, onChange }: Props) {
    const onChangeConcepts = (selected: SelectedConcept[]) => {
        // Use a for-loop to avoid any surprises and to keep behavior explicit.
        const conceptIds: number[] = [];
        const conceptUuids: string[] = [];
        const conceptLabels: string[] = [];
        const icd10Codes: string[] = [];
        const icd11Codes: string[] = [];

        for (const x of selected ?? []) {
            // IDs (warehouse join)
            const idNum = Number((x as any)?.id);
            if (Number.isFinite(idNum) && idNum > 0) {
                conceptIds.push(idNum);
            }

            // Labels / uuids
            if (x?.uuid) conceptUuids.push(x.uuid);
            if (x?.display) conceptLabels.push(x.display);

            // Optional metadata
            if (x?.icd10Code) icd10Codes.push(x.icd10Code);
            if (x?.icd11Code) icd11Codes.push(x.icd11Code);
        }

        onChange({
            ...value,
            // ✅ self-contained selection (survives search reset)
            selectedConcepts: selected ?? [],

            // ✅ derived fields used by SQL builder + UI
            conceptIds,
            conceptUuids,
            conceptLabels,
            icd10Codes,
            icd11Codes,
        });
    };

    return (
        <>
            <div style={{ fontWeight: 600 }}>Diagnosis filters</div>

            <ConceptSearchMultiSelect
                id="diag-concepts"
                labelText="Diagnosis concept(s)"
                helperText="Search OpenMRS concepts and add one or more. ICD codes are shown to help you choose."
                // ✅ Pass the full self-contained objects
                value={value.selectedConcepts ?? []}
                onChange={onChangeConcepts}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                <Select
                    id="diag-certainty"
                    labelText="Certainty"
                    value={value.certainty}
                    onChange={(e) =>
                        onChange({
                            ...value,
                            certainty: (e.target as HTMLSelectElement).value as DiagnosisBaseConfig['certainty'],
                        })
                    }
                >
                    <SelectItem value="PROVISIONAL" text="PROVISIONAL" />
                    <SelectItem value="CONFIRMED" text="CONFIRMED" />
                </Select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                <TextInput
                    id="diag-ranks"
                    labelText="Diagnosis ranks (CSV)"
                    helperText="Example: 1,2"
                    value={value.dxRanksCsv}
                    onChange={(e) => onChange({ ...value, dxRanksCsv: (e.target as HTMLInputElement).value })}
                />

                <TextInput
                    id="diag-derived-ids"
                    labelText="Derived diagnosis_coded IDs"
                    helperText="Uses concept.id (perfect warehouse join)."
                    value={value.conceptIds?.length ? value.conceptIds.join(',') : ''}
                    readOnly
                />
            </div>
        </>
    );
}*/

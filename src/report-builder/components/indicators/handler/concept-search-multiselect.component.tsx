import React from 'react';
import { ComboBox, InlineLoading, Tag } from '@carbon/react';

import { useConceptSearch } from '../../../services/concepts/useConceptSearch';
import type { ConceptSummary } from '../../../services/concepts/concept-types';

export type SelectedConcept = {
    id: number;
    uuid: string;
    display: string;

    icd10Code?: string;
    icd11Code?: string;

    conceptClass?: string;
    datatype?: string;
};

type Props = {
    id: string;
    labelText: string;
    helperText?: string;

    /** FULL selected objects (self-contained). */
    value: SelectedConcept[];

    /** emits FULL selections */
    onChange: (next: SelectedConcept[]) => void;
};

function extractCodeFromMappingDisplay(mappingDisplay: string, systemPrefix: string) {
    const raw = (mappingDisplay ?? '').trim();
    const prefix = `${systemPrefix}:`;
    if (!raw.startsWith(prefix)) return undefined;

    const remainder = raw.slice(prefix.length).trim();
    if (!remainder) return undefined;

    const token = remainder.split(' ')[0]?.split('(')[0]?.trim();
    return token || undefined;
}

function getIcd10And11(concept: ConceptSummary) {
    const mappings = concept.mappings ?? [];
    let icd10: string | undefined;
    let icd11: string | undefined;

    for (const m of mappings) {
        const disp = m?.display ?? '';
        if (!icd10) icd10 = extractCodeFromMappingDisplay(disp, 'ICD-10-WHO');
        if (!icd11) icd11 = extractCodeFromMappingDisplay(disp, 'ICD-11-WHO');
        if (icd10 && icd11) break;
    }

    return { icd10Code: icd10, icd11Code: icd11 };
}

function toSelectedConcept(c: ConceptSummary): SelectedConcept {
    const { icd10Code, icd11Code } = getIcd10And11(c);

    return {
        id: Number(c.id) || 0,
        uuid: c.uuid,
        display: c.display,
        icd10Code,
        icd11Code,
        conceptClass: c.conceptClass?.name,
        datatype: c.datatype?.name,
    };
}

function itemToString(c: ConceptSummary | null) {
    if (!c) return '';
    const { icd10Code, icd11Code } = getIcd10And11(c);

    const bits: string[] = [];
    if (icd10Code) bits.push(`ICD-10:${icd10Code}`);
    if (icd11Code) bits.push(`ICD-11:${icd11Code}`);
    if (c.conceptClass?.name) bits.push(c.conceptClass.name);

    return bits.length ? `${c.display} • ${bits.join(' • ')}` : c.display;
}

export default function ConceptSearchMultiSelect({ id, labelText, helperText, value, onChange }: Props) {
    const [query, setQuery] = React.useState('');
    const { loading, results, error } = useConceptSearch(query);

    const addSelected = React.useCallback(
        (picked: ConceptSummary | null) => {
            if (!picked) return;

            const pickedSelected = toSelectedConcept(picked);

            const next = new Map<string, SelectedConcept>();
            for (const x of value ?? []) next.set(x.uuid, x);
            next.set(pickedSelected.uuid, pickedSelected);

            onChange(Array.from(next.values()));
        },
        [onChange, value],
    );

    const removeSelectedUuid = React.useCallback(
        (uuid: string) => {
            onChange((value ?? []).filter((x) => x.uuid !== uuid));
        },
        [onChange, value],
    );

    return (
        <div>
            <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{labelText}</div>
            {helperText ? (
                <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.75rem' }}>{helperText}</div>
            ) : null}

            <ComboBox
                id={`${id}-search`}
                titleText="Search concepts"
                items={results ?? []}
                itemToString={itemToString}
                placeholder="Type to search concepts…"
                onInputChange={(text) => setQuery(String(text ?? ''))}
                onChange={(e: any) => addSelected(e?.selectedItem ?? null)}
            />

            <div style={{ marginTop: '0.5rem' }}>
                {loading ? <InlineLoading description="Searching…" /> : null}
                {!loading && error ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-error, #da1e28)' }}>{error}</div>
                ) : null}
            </div>

            {value?.length ? (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {value.map((x) => (
                        <Tag
                            key={x.uuid}
                            type="gray"
                            filter
                            onClose={() => removeSelectedUuid(x.uuid)}
                            title={x.icd10Code || x.icd11Code ? `${x.display}` : x.display}
                        >
                            {x.display}
                            {x.icd10Code ? ` • ICD-10:${x.icd10Code}` : ''}
                            {x.icd11Code ? ` • ICD-11:${x.icd11Code}` : ''}
                        </Tag>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
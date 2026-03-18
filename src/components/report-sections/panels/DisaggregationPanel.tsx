import React from 'react';
import { Toggle, ComboBox, Checkbox, InlineNotification } from '@carbon/react';
import type { AgeCategoryOption } from '../../../resources/agegroup/mamba-agegroups.api';

function readChecked(arg1: any, arg2: any): boolean {
    if (typeof arg1 === 'boolean') return arg1;
    if (typeof arg2?.checked === 'boolean') return arg2.checked;
    return Boolean(arg1?.target?.checked);
}

export function DisaggregationPanel(props: {
    /** NEW: ensures unique DOM ids across create/edit modals */
    idPrefix: string;

    disaggEnabled: boolean;
    setDisaggEnabled: (v: boolean) => void;

    ageCategories: AgeCategoryOption[];
    selectedAgeCategory: AgeCategoryOption | null;
    setSelectedAgeCategory: (v: AgeCategoryOption | null) => void;

    genderF: boolean;
    setGenderF: (v: boolean) => void;
    genderM: boolean;
    setGenderM: (v: boolean) => void;

    pickedGenders: Array<'F' | 'M'>;
    disaggMissing: boolean;
}) {
    const ageCategoryId = `${props.idPrefix}-age-category`;
    const genderFId = `${props.idPrefix}-gender-f`;
    const genderMId = `${props.idPrefix}-gender-m`;
    const disaggToggleId = `${props.idPrefix}-disagg-toggle`;

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ fontWeight: 600 }}>Disaggregation</div>
                <Toggle
                    id={disaggToggleId}
                    labelText=""
                    toggled={props.disaggEnabled}
                    onToggle={(v) => props.setDisaggEnabled(Boolean(v))}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <ComboBox
                    id={ageCategoryId}
                    titleText="Age Category"
                    placeholder="Select age category"
                    items={props.ageCategories}
                    itemToString={(item) => (item ? item.label : '')}
                    selectedItem={props.selectedAgeCategory}
                    onChange={({ selectedItem }) => props.setSelectedAgeCategory((selectedItem as any) ?? null)}
                    disabled={!props.disaggEnabled}
                />

                <div style={{ border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 6, padding: '0.75rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Genders</div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Checkbox
                            id={genderFId}
                            labelText="F"
                            checked={props.genderF}
                            disabled={!props.disaggEnabled}
                            onChange={(a1: any, a2: any) => props.setGenderF(readChecked(a1, a2))}
                        />
                        <Checkbox
                            id={genderMId}
                            labelText="M"
                            checked={props.genderM}
                            disabled={!props.disaggEnabled}
                            onChange={(a1: any, a2: any) => props.setGenderM(readChecked(a1, a2))}
                        />
                    </div>

                    {props.disaggEnabled && props.pickedGenders.length === 0 ? (
                        <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--cds-text-error, #da1e28)' }}>
                            Pick at least one gender
                        </div>
                    ) : null}
                </div>
            </div>

            {props.disaggMissing ? (
                <InlineNotification
                    kind="error"
                    lowContrast
                    title="Missing disaggregation"
                    subtitle="BASE/COMPOSITE indicators require section disaggregation (age category + gender)."
                />
            ) : null}
        </>
    );
}
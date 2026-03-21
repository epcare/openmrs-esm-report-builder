import React from 'react';
import { Toggle, TextInput, InlineNotification } from '@carbon/react';
import type { SectionIndicatorRef } from '../section-types';

export function Dhis2MappingPanel(props: {
    dhis2Enabled: boolean;
    setDhis2Enabled: (v: boolean) => void;

    dhis2DatasetId: string;
    setDhis2DatasetId: (v: string) => void;

    dhis2PeriodType: string;
    setDhis2PeriodType: (v: string) => void;

    dhis2OrgUnitStrategy: 'location' | 'fixed';
    setDhis2OrgUnitStrategy: (v: 'location' | 'fixed') => void;

    disaggEnabled: boolean;
    selectedAgeCategory: any;
    pickedGenders: Array<'F' | 'M'>;

    selectedFull: SectionIndicatorRef[];
    selected: Array<{ id: string; sortOrder: number }>;
    disaggKeys: Array<{ key: string; ageGroup: string; gender: 'F' | 'M' }>;

    dhis2IndicatorMap: Record<string, { dataElementId: string; cocByDisagg: Record<string, string> }>;
    updateDhis2DataElement: (indicatorId: string, value: string) => void;
    updateDhis2Coc: (indicatorId: string, disaggKey: string, value: string) => void;
}) {
    return (
        <>
            <hr style={{ border: 0, borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ fontWeight: 600 }}>DHIS2 Mapping</div>
                <Toggle
                    id="dhis2-toggle"
                    labelText=""
                    toggled={props.dhis2Enabled}
                    onToggle={(v) => props.setDhis2Enabled(Boolean(v))}
                />
            </div>

            <div style={{ opacity: 0.8 }}>Map section indicators to DHIS2 data elements and category option combos (Age × Gender).</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <TextInput
                    id="dhis2-dataset"
                    labelText="Dataset UID (optional)"
                    value={props.dhis2DatasetId}
                    disabled={!props.dhis2Enabled}
                    onChange={(e) => props.setDhis2DatasetId((e.target as HTMLInputElement).value)}
                />
                <TextInput
                    id="dhis2-period"
                    labelText="Period type"
                    value={props.dhis2PeriodType}
                    disabled={!props.dhis2Enabled}
                    onChange={(e) => props.setDhis2PeriodType((e.target as HTMLInputElement).value)}
                />
                <TextInput
                    id="dhis2-orgunit"
                    labelText="OrgUnit strategy"
                    value={props.dhis2OrgUnitStrategy}
                    disabled={!props.dhis2Enabled}
                    onChange={(e) => props.setDhis2OrgUnitStrategy(((e.target as HTMLInputElement).value as any) || 'location')}
                />
            </div>

            {props.dhis2Enabled ? (
                props.disaggEnabled && props.selectedAgeCategory && props.pickedGenders.length ? (
                    <div style={{ border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 6, padding: '0.75rem' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Indicator mappings</div>

                        {props.selectedFull.length === 0 ? (
                            <div style={{ opacity: 0.75 }}>Select indicators first to map them.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {props.selectedFull
                                    .slice()
                                    .sort((a, b) => {
                                        const sa = props.selected.find((x) => x.id === a.id)?.sortOrder ?? 0;
                                        const sb = props.selected.find((x) => x.id === b.id)?.sortOrder ?? 0;
                                        return sa - sb;
                                    })
                                    .map((ind) => {
                                        const m = props.dhis2IndicatorMap[ind.id] ?? { dataElementId: '', cocByDisagg: {} };

                                        return (
                                            <div key={`dhis2-${ind.id}`} style={{ borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)', paddingTop: '0.75rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {ind.name} <span style={{ opacity: 0.7 }}>({ind.code})</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', opacity: 0.75 }}>Type: {ind.type}</div>
                                                    </div>
                                                    <div style={{ width: '40%' }}>
                                                        <TextInput
                                                            id={`dhis2-de-${ind.id}`}
                                                            labelText="Data Element UID"
                                                            value={m.dataElementId}
                                                            onChange={(e) => props.updateDhis2DataElement(ind.id, (e.target as HTMLInputElement).value)}
                                                        />
                                                    </div>
                                                </div>

                                                <div style={{ marginTop: '0.75rem', overflowX: 'auto' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                        <thead>
                                                        <tr>
                                                            <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)' }}>
                                                                Disaggregation bucket
                                                            </th>
                                                            <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)' }}>
                                                                Category Option Combo UID
                                                            </th>
                                                        </tr>
                                                        </thead>
                                                        <tbody>
                                                        {props.disaggKeys.map((k) => (
                                                            <tr key={`${ind.id}-${k.key}`}>
                                                                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)' }}>
                                                                    {k.ageGroup} {k.gender}
                                                                </td>
                                                                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)' }}>
                                                                    <TextInput
                                                                        id={`dhis2-coc-${ind.id}-${k.key}`}
                                                                        labelText=""
                                                                        hideLabel
                                                                        value={m.cocByDisagg[k.key] ?? ''}
                                                                        onChange={(e) => props.updateDhis2Coc(ind.id, k.key, (e.target as HTMLInputElement).value)}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                ) : (
                    <InlineNotification
                        kind="warning"
                        lowContrast
                        title="DHIS2 mapping requires disaggregation"
                        subtitle="Enable disaggregation and select Age Category + genders before mapping to DHIS2 category option combos."
                    />
                )
            ) : null}
        </>
    );
}
import React from 'react';
import { Search, Checkbox, Tag, Button } from '@carbon/react';
import { ChevronRight, Add, ArrowUp, ArrowDown, TrashCan } from '@carbon/icons-react';
import type { SectionIndicatorRef } from '../section-types';

function readChecked(arg1: any, arg2: any): boolean {
    if (typeof arg1 === 'boolean') return arg1;
    if (typeof arg2?.checked === 'boolean') return arg2.checked;
    return Boolean(arg1?.target?.checked);
}

export function IndicatorPickerPanel(props: {
    q: string;
    setQ: (v: string) => void;

    available: SectionIndicatorRef[];
    selectedFull: SectionIndicatorRef[];
    selected: Array<{ id: string; type: any; sortOrder: number }>;

    isSelected: (id: string) => boolean;
    toggleIndicator: (i: SectionIndicatorRef, checked: boolean) => void;
    moveSelected: (id: string, dir: -1 | 1) => void;

    /** NEW: ensures unique DOM ids across create/edit modals */
    idPrefix: string;
}) {
    return (
        <>
            <div style={{ marginTop: '0.75rem' }}>
                <Search
                    size="lg"
                    labelText="Search"
                    placeholder="Search indicators"
                    value={props.q}
                    onChange={(e) => props.setQ((e.target as HTMLInputElement).value)}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                {/* Add Indicators */}
                <div style={{ border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 6, padding: '0.75rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Add Indicators</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {props.available.map((i) => {
                            const domId = `${props.idPrefix}-add-${i.id}`;

                            return (
                                <div
                                    key={i.id}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}
                                >
                                    <Checkbox
                                        id={domId}
                                        labelText={i.name}
                                        checked={props.isSelected(i.id)}
                                        onChange={(a1: any, a2: any) => props.toggleIndicator(i, readChecked(a1, a2))}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Tag size="sm" type="blue">
                                            {i.type}
                                        </Tag>
                                        <ChevronRight size={16} />
                                    </div>
                                </div>
                            );
                        })}

                        <Button size="sm" kind="ghost" renderIcon={Add}>
                            Select Indicator
                        </Button>
                    </div>
                </div>

                {/* Selected Indicators */}
                <div style={{ border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 6, padding: '0.75rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Selected Indicators</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {props.selectedFull.length === 0 ? (
                            <div style={{ opacity: 0.75 }}>No indicators selected yet.</div>
                        ) : (
                            props.selectedFull
                                .slice()
                                .sort((a, b) => {
                                    const sa = props.selected.find((x) => x.id === a.id)?.sortOrder ?? 0;
                                    const sb = props.selected.find((x) => x.id === b.id)?.sortOrder ?? 0;
                                    return sa - sb;
                                })
                                .map((i, idx) => (
                                    <div
                                        key={i.id}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                            <Tag size="sm" type="blue">
                                                {i.type}
                                            </Tag>
                                            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {i.name}
                      </span>
                                            <Tag size="sm" type="gray">
                                                {i.code}
                                            </Tag>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <Button
                                                kind="ghost"
                                                size="sm"
                                                hasIconOnly
                                                iconDescription="Move up"
                                                renderIcon={ArrowUp}
                                                disabled={idx === 0}
                                                onClick={() => props.moveSelected(i.id, -1)}
                                            />
                                            <Button
                                                kind="ghost"
                                                size="sm"
                                                hasIconOnly
                                                iconDescription="Move down"
                                                renderIcon={ArrowDown}
                                                disabled={idx === props.selectedFull.length - 1}
                                                onClick={() => props.moveSelected(i.id, 1)}
                                            />
                                            <Button
                                                kind="ghost"
                                                size="sm"
                                                hasIconOnly
                                                iconDescription="Remove"
                                                renderIcon={TrashCan}
                                                onClick={() => props.toggleIndicator(i, false)}
                                            />
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
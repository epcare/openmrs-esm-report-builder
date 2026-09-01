/**
 * Dashboard Sections Editor
 * Add / edit / remove / reorder the dashboard's sections.
 */

import React from 'react';
import { Button, Checkbox, Stack, TextInput } from '@carbon/react';
import { ArrowDown, ArrowUp, Add, TrashCan as DeleteIcon } from '@carbon/icons-react';
import type { DashboardConfigV1, DashboardSectionConfig } from '../../../types/dashboard/dashboard.types';
import { validateSectionKey } from '../dashboard-config.schema';
import styles from '../dashboards-admin.scss';

interface DashboardSectionsEditorSectionProps {
    config: DashboardConfigV1;
    onChange: (config: DashboardConfigV1) => void;
}

export default function DashboardSectionsEditorSection({ config, onChange }: DashboardSectionsEditorSectionProps) {
    const sections = config.sections ?? [];

    const update = (next: DashboardSectionConfig[]) => onChange({ ...config, sections: next });

    const addSection = () => {
        update([
            ...sections,
            { key: `section-${sections.length + 1}`, label: `Section ${sections.length + 1}`, order: (sections.length + 1) * 10 },
        ]);
    };

    const patchSection = (index: number, updates: Partial<DashboardSectionConfig>) => {
        update(sections.map((s, i) => (i === index ? { ...s, ...updates } : s)));
    };

    const move = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= sections.length) return;
        const next = [...sections];
        [next[index], next[target]] = [next[target], next[index]];
        update(next);
    };

    return (
        <fieldset>
            <legend>Sections</legend>
            <Stack gap={3}>
                <span className={styles['dashboard-editor__hint']}>
                    Widgets are placed into sections. Empty sections are hidden unless "always show" is set.
                </span>
                {sections.map((section, index) => {
                    const keyError = validateSectionKey(section.key);
                    return (
                        <div key={index} className={styles['dashboard-sections-editor__row']}>
                            <div className={styles['dashboard-sections-editor__row-fields']}>
                                <TextInput
                                    id={`section-key-${index}`}
                                    labelText="Key"
                                    size="sm"
                                    invalid={!!keyError}
                                    invalidText={keyError ?? undefined}
                                    value={section.key}
                                    onChange={(e) => patchSection(index, { key: e.target.value })}
                                />
                                <TextInput
                                    id={`section-label-${index}`}
                                    labelText="Label"
                                    size="sm"
                                    value={section.label}
                                    onChange={(e) => patchSection(index, { label: e.target.value })}
                                />
                                <TextInput
                                    id={`section-order-${index}`}
                                    labelText="Order"
                                    size="sm"
                                    type="number"
                                    value={String(section.order ?? (index + 1) * 10)}
                                    onChange={(e) => patchSection(index, { order: parseInt(e.target.value, 10) || 0 })}
                                />
                                <Checkbox
                                    id={`section-collapsed-${index}`}
                                    labelText="Collapsed"
                                    checked={!!section.collapsed}
                                    onChange={(_, { checked }) => patchSection(index, { collapsed: checked })}
                                />
                                <Checkbox
                                    id={`section-always-${index}`}
                                    labelText="Always show"
                                    checked={!!section.alwaysShow}
                                    onChange={(_, { checked }) => patchSection(index, { alwaysShow: checked })}
                                />
                            </div>
                            <div className={styles['dashboard-editor__row-actions']}>
                                <Button
                                    kind="ghost"
                                    size="sm"
                                    hasIconOnly
                                    renderIcon={ArrowUp}
                                    iconDescription="Move up"
                                    disabled={index === 0}
                                    onClick={() => move(index, -1)}
                                />
                                <Button
                                    kind="ghost"
                                    size="sm"
                                    hasIconOnly
                                    renderIcon={ArrowDown}
                                    iconDescription="Move down"
                                    disabled={index === sections.length - 1}
                                    onClick={() => move(index, 1)}
                                />
                                <Button
                                    kind="ghost"
                                    size="sm"
                                    hasIconOnly
                                    renderIcon={DeleteIcon}
                                    iconDescription="Remove section"
                                    onClick={() => update(sections.filter((_, i) => i !== index))}
                                />
                            </div>
                        </div>
                    );
                })}
                <div>
                    <Button kind="ghost" size="sm" renderIcon={Add} onClick={addSection}>
                        Add Section
                    </Button>
                </div>
            </Stack>
        </fieldset>
    );
}

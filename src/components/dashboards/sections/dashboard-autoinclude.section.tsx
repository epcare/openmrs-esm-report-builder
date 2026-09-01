/**
 * Dashboard Auto-Include Section
 * Fill sections with the remaining active ETL monitors, arranged by each
 * monitor's own saved layout metadata (explicit placements always win).
 */

import React from 'react';
import { Checkbox, Select, SelectItem, Stack, TextInput } from '@carbon/react';
import type { DashboardConfigV1 } from '../../../types/dashboard/dashboard.types';
import styles from '../dashboards-admin.scss';

interface DashboardAutoIncludeSectionProps {
    config: DashboardConfigV1;
    onChange: (config: DashboardConfigV1) => void;
}

export default function DashboardAutoIncludeSection({ config, onChange }: DashboardAutoIncludeSectionProps) {
    const autoInclude = config.autoInclude?.etlMonitors;
    const sections = config.sections ?? [];

    const patch = (updates: Partial<NonNullable<DashboardConfigV1['autoInclude']>['etlMonitors']>) => {
        onChange({
            ...config,
            autoInclude: {
                ...config.autoInclude,
                etlMonitors: { enabled: false, arrangeBy: 'monitorLayout', ...config.autoInclude?.etlMonitors, ...updates },
            },
        });
    };

    return (
        <fieldset>
            <legend>Auto-include ETL monitors</legend>
            <Stack gap={4}>
                <span className={styles['dashboard-editor__hint']}>
                    Active ETL monitors that are not explicitly placed above are added automatically, using each
                    monitor's own section/span/priority from the monitor builder. Explicit placements always win.
                </span>
                <Checkbox
                    id="dashboard-autoinclude-enabled"
                    labelText="Auto-include active ETL monitors"
                    checked={!!autoInclude?.enabled}
                    onChange={(_, { checked }) => patch({ enabled: checked })}
                />
                <Stack orientation="horizontal" gap={5}>
                    <Select
                        id="dashboard-autoinclude-default-section"
                        labelText="Default section"
                        size="sm"
                        disabled={!autoInclude?.enabled}
                        value={autoInclude?.defaultSectionKey ?? sections[0]?.key ?? 'overview'}
                        onChange={(e) => patch({ defaultSectionKey: e.target.value })}
                    >
                        {sections.map((section) => (
                            <SelectItem key={section.key} value={section.key} text={section.label} />
                        ))}
                    </Select>
                    <TextInput
                        id="dashboard-autoinclude-default-span-lg"
                        labelText="Default span (desktop)"
                        size="sm"
                        type="number"
                        disabled={!autoInclude?.enabled}
                        value={String(autoInclude?.defaultSpan?.lg ?? 8)}
                        onChange={(e) =>
                            patch({
                                defaultSpan: { sm: 4, md: 8, lg: parseInt(e.target.value, 10) || 8 },
                            })
                        }
                    />
                </Stack>
            </Stack>
        </fieldset>
    );
}

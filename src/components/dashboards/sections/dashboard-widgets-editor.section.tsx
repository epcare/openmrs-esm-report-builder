/**
 * Dashboard Widgets Editor
 * Explicitly placed widgets: type, ref picker (ETL monitors / reports),
 * section assignment, span, order, title/footer overrides.
 */

import React from 'react';
import { Button, Select, SelectItem, Stack, TextInput } from '@carbon/react';
import { Add, TrashCan as DeleteIcon } from '@carbon/icons-react';
import { listETLMonitors } from '../../../resources/etl-monitor/etl-monitor.api';
import { listReports } from '../../../resources/report/reports.api';
import type { ReportDto } from '../../../resources/report/reports.api';
import type { ETLMonitorDto } from '../../../types/etl-monitor/etl-monitor.types';
import type { DashboardConfigV1, DashboardWidgetConfig, DashboardWidgetType } from '../../../types/dashboard/dashboard.types';
import styles from '../dashboards-admin.scss';

interface DashboardWidgetsEditorSectionProps {
    config: DashboardConfigV1;
    onChange: (config: DashboardConfigV1) => void;
}

const WIDGET_TYPE_OPTIONS: { value: DashboardWidgetType; label: string }[] = [
    { value: 'ETL_MONITOR', label: 'ETL Monitor' },
    { value: 'REPORT', label: 'Report' },
];

export default function DashboardWidgetsEditorSection({ config, onChange }: DashboardWidgetsEditorSectionProps) {
    const [monitors, setMonitors] = React.useState<ETLMonitorDto[]>([]);
    const [reports, setReports] = React.useState<ReportDto[]>([]);

    const sections = config.sections ?? [];
    const widgets = config.widgets ?? [];

    React.useEffect(() => {
        const ac = new AbortController();
        listETLMonitors(undefined, ac.signal).then((data) => setMonitors(data ?? [])).catch(() => setMonitors([]));
        listReports({ v: 'default' }, ac.signal).then((data) => setReports(data ?? [])).catch(() => setReports([]));
        return () => ac.abort();
    }, []);

    const update = (next: DashboardWidgetConfig[]) => onChange({ ...config, widgets: next });

    const addWidget = () => {
        update([
            ...widgets,
            {
                widgetType: 'ETL_MONITOR',
                refUuid: monitors[0]?.uuid,
                sectionKey: sections[0]?.key ?? 'overview',
                order: (widgets.length + 1) * 100,
            },
        ]);
    };

    const patchWidget = (index: number, updates: Partial<DashboardWidgetConfig>) => {
        update(widgets.map((w, i) => (i === index ? { ...w, ...updates } : w)));
    };

    const refOptions = (widget: DashboardWidgetConfig) => {
        if (widget.widgetType === 'REPORT') {
            return reports.map((r) => ({ value: r.uuid, label: r.code ? `${r.name} (${r.code})` : r.name }));
        }
        return monitors.map((m) => ({ value: m.uuid!, label: m.code ? `${m.name} (${m.code})` : m.name }));
    };

    return (
        <fieldset>
            <legend>Widgets</legend>
            <Stack gap={3}>
                <span className={styles['dashboard-editor__hint']}>
                    Explicitly placed widgets. Use auto-include below to fill sections with the remaining active ETL monitors.
                </span>
                {widgets.map((widget, index) => (
                    <div key={index} className={styles['dashboard-widgets-editor__row']}>
                        <div className={styles['dashboard-widgets-editor__row-fields']}>
                            <Select
                                id={`widget-type-${index}`}
                                labelText="Type"
                                size="sm"
                                value={widget.widgetType}
                                onChange={(e) => {
                                    const widgetType = e.target.value as DashboardWidgetType;
                                    patchWidget(index, {
                                        widgetType,
                                        refUuid: widgetType === 'REPORT' ? reports[0]?.uuid : monitors[0]?.uuid,
                                        refCode: undefined,
                                    });
                                }}
                            >
                                {WIDGET_TYPE_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} text={opt.label} />
                                ))}
                            </Select>
                            <Select
                                id={`widget-ref-${index}`}
                                labelText={widget.widgetType === 'REPORT' ? 'Report' : 'ETL monitor'}
                                size="sm"
                                value={widget.refUuid ?? ''}
                                onChange={(e) => patchWidget(index, { refUuid: e.target.value, refCode: undefined })}
                            >
                                {refOptions(widget).map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} text={opt.label} />
                                ))}
                            </Select>
                            <Select
                                id={`widget-section-${index}`}
                                labelText="Section"
                                size="sm"
                                value={widget.sectionKey}
                                onChange={(e) => patchWidget(index, { sectionKey: e.target.value })}
                            >
                                {sections.map((section) => (
                                    <SelectItem key={section.key} value={section.key} text={section.label} />
                                ))}
                            </Select>
                            <TextInput
                                id={`widget-order-${index}`}
                                labelText="Order"
                                size="sm"
                                type="number"
                                value={String(widget.order ?? (index + 1) * 100)}
                                onChange={(e) => patchWidget(index, { order: parseInt(e.target.value, 10) || 0 })}
                            />
                        </div>
                        <div className={styles['dashboard-widgets-editor__span']}>
                            {(['sm', 'md', 'lg'] as const).map((breakpoint) => (
                                <TextInput
                                    key={breakpoint}
                                    id={`widget-span-${breakpoint}-${index}`}
                                    labelText={`Span ${breakpoint}`}
                                    size="sm"
                                    type="number"
                                    value={String(widget.span?.[breakpoint] ?? { sm: 4, md: 8, lg: 8 }[breakpoint])}
                                    onChange={(e) =>
                                        patchWidget(index, {
                                            span: {
                                                sm: 4,
                                                md: 8,
                                                lg: 8,
                                                ...widget.span,
                                                [breakpoint]: parseInt(e.target.value, 10) || 0,
                                            },
                                        })
                                    }
                                />
                            ))}
                        </div>
                        <div className={styles['dashboard-widgets-editor__row-fields']}>
                            <TextInput
                                id={`widget-title-${index}`}
                                labelText="Title override"
                                size="sm"
                                value={widget.titleOverride ?? ''}
                                onChange={(e) => patchWidget(index, { titleOverride: e.target.value || undefined })}
                            />
                            <TextInput
                                id={`widget-footer-${index}`}
                                labelText="Footer label"
                                size="sm"
                                value={widget.footerLabel ?? ''}
                                onChange={(e) => patchWidget(index, { footerLabel: e.target.value || undefined })}
                            />
                        </div>
                        <div className={styles['dashboard-editor__row-actions']}>
                            <Button
                                kind="ghost"
                                size="sm"
                                hasIconOnly
                                renderIcon={DeleteIcon}
                                iconDescription="Remove widget"
                                onClick={() => update(widgets.filter((_, i) => i !== index))}
                            />
                        </div>
                    </div>
                ))}
                <div>
                    <Button kind="ghost" size="sm" renderIcon={Add} onClick={addWidget}>
                        Add Widget
                    </Button>
                </div>
            </Stack>
        </fieldset>
    );
}

/**
 * ETL Monitor Widget
 * The single implementation of "render one ETL monitor as a dashboard
 * widget": parse/adapt the display config, overlay presentation metadata,
 * wrap in MonitorWidgetCard chrome (refresh + kebab) and render through
 * the shared MonitorRenderer. Used by BOTH the legacy ETL dashboard and
 * the generic dashboard renderer so their output cannot drift.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { ETLMonitorDto, MonitorDataResponse } from '../../../types/etl-monitor';
import { parseDisplayConfig, adaptLegacyConfigToV2 } from '../../../utils/etl-monitor';
import { MonitorRenderer } from './MonitorRenderer';
import { MonitorWidgetCard } from './monitor-widget-card.component';
import ETLMonitorCardShell, { CardEmptyState } from '../etl-monitor-card-shell.component';

export interface EtlMonitorWidgetProps {
    monitor: ETLMonitorDto;
    data?: MonitorDataResponse;
    error?: string;
    loading: boolean;
    onRefresh: () => void;
    /** 1-based index within its dashboard section — renders "<position>. <Name>" */
    position?: number;
    /** Widget header title; defaults to the monitor name (dashboard slot titleOverride wins) */
    title?: string;
    /** Base URL of the monitor builder for the kebab "Edit monitor" action */
    editBaseUrl?: string;
}

export function EtlMonitorWidget({
    monitor,
    data,
    error,
    loading,
    onRefresh,
    position,
    title,
    editBaseUrl = '/admin/etl-monitors/builder',
}: EtlMonitorWidgetProps) {
    const navigate = useNavigate();

    const displayTitle = `${typeof position === 'number' ? `${position}. ` : ''}${title ?? monitor.name}`;

    const config = React.useMemo(() => {
        const parsed = parseDisplayConfig(monitor.displayConfigJson);
        const base = parsed.version === 2
            ? parsed.config
            : adaptLegacyConfigToV2(monitor.displayConfigJson, monitor.monitorType);
        if (!base) return null;
        return {
            ...base,
            presentation: {
                ...(base.presentation || {}),
                title: displayTitle,
                description: monitor.description,
            },
        };
    }, [monitor.displayConfigJson, monitor.monitorType, monitor.description, displayTitle]);

    if (!config) {
        return (
            <ETLMonitorCardShell
                title={displayTitle}
                loading={loading}
                error={error}
                onRefresh={onRefresh}
                size="lg"
            >
                <CardEmptyState message="Invalid monitor configuration" />
            </ETLMonitorCardShell>
        );
    }

    return (
        <MonitorWidgetCard
            loading={loading}
            onRefresh={onRefresh}
            actions={[
                {
                    label: 'Edit monitor',
                    onClick: () => navigate(`${editBaseUrl}?mode=edit&monitor=${monitor.uuid}`),
                },
            ]}
        >
            <MonitorRenderer
                config={config}
                data={data?.rawResponse}
                loading={loading}
                error={error ?? null}
            />
        </MonitorWidgetCard>
    );
}

export default EtlMonitorWidget;

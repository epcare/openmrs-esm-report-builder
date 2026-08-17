import React from 'react';
import { Tag, InlineLoading, Tile } from '@carbon/react';
import { Activity as Pulse, Warning } from '@carbon/icons-react';
import { fetchMonitorData } from '../../resources/etl-monitor/etl-monitor.api';
import type { ETLMonitorDto, MonitorDataResponse } from '../../types/etl-monitor/etl-monitor.types';

/**
 * Compact ETL Monitor Status Card for use in dashards and landing pages
 */
export default function ETLMonitorStatusCard({ monitor }: { monitor: ETLMonitorDto }) {
    const [data, setData] = React.useState<MonitorDataResponse | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const loadData = React.useCallback(async () => {
        if (!monitor.uuid) return;

        setLoading(true);
        setError(null);

        try {
            const result = await fetchMonitorData(monitor.uuid);
            setData(result);
        } catch (e: any) {
            setError(e?.message || 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [monitor.uuid]);

    React.useEffect(() => {
        loadData();

        // Auto-refresh based on monitor interval
        const interval = setInterval(() => {
            loadData();
        }, (monitor.refreshInterval || 30) * 1000);

        return () => clearInterval(interval);
    }, [loadData, monitor.refreshInterval]);

    // Get primary status indicator
    const primaryStatus = React.useMemo(() => {
        if (!data?.data || data.data.length === 0) return null;

        // Look for a status badge or running indicator
        const statusItem = data.data.find((d) =>
            d.key === 'running' ||
            d.key === 'status' ||
            d.key === 'isRunning' ||
            d.header?.toLowerCase().includes('status') ||
            d.header?.toLowerCase().includes('running')
        );

        if (statusItem) {
            const isRunning = statusItem.value === true || statusItem.value === 'true' || String(statusItem.value).toLowerCase() === 'running';
            return {
                running: isRunning,
                label: statusItem.displayValue || String(statusItem.value),
            };
        }

        // Fallback to first item
        return {
            running: false,
            label: data.data[0].displayValue || String(data.data[0].value),
        };
    }, [data]);

    // Get progress value if available
    const progressValue = React.useMemo(() => {
        if (!data?.data) return null;

        const progressItem = data.data.find((d) =>
            d.key === 'progress' ||
            d.key === 'progressPercentage' ||
            d.key === 'completion'
        );

        if (progressItem && typeof progressItem.value === 'number') {
            return progressItem.value;
        }

        return null;
    }, [data]);

    if (loading && !data) {
        return (
            <Tile style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Pulse size={16} />
                <span style={{ fontSize: '0.875rem' }}>{monitor.name}</span>
                <InlineLoading />
            </Tile>
        );
    }

    if (error) {
        return (
            <Tile style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Warning size={16} style={{ color: 'var(--cds-text-error, #da1e28)' }} />
                <span style={{ fontSize: '0.875rem' }}>{monitor.name}</span>
                <Tag type="red">Error</Tag>
            </Tile>
        );
    }

    if (!primaryStatus) {
        return (
            <Tile style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Pulse size={16} />
                <span style={{ fontSize: '0.875rem' }}>{monitor.name}</span>
                <Tag type="gray">No data</Tag>
            </Tile>
        );
    }

    return (
        <Tile
            style={{
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                transition: 'background 0.2s',
            }}
            onClick={() => window.location.hash = '#/etl-dashboard'}
        >
            <Pulse
                size={16}
                style={{
                    color: primaryStatus.running
                        ? 'var(--cds-interactive-01, #0f62fe)'
                        : 'var(--cds-success-01, #24a148)',
                    animation: primaryStatus.running ? 'pulse 2s infinite' : 'none',
                }}
            />
            <span style={{ fontSize: '0.875rem' }}>{monitor.name}</span>

            {progressValue !== null && (
                <Tag type={progressValue >= 100 ? 'green' : 'blue'}>
                    {progressValue.toFixed(0)}%
                </Tag>
            )}

            <Tag
                type={
                    primaryStatus.running
                        ? 'blue'
                        : 'green'
                }
            >
                {primaryStatus.label}
            </Tag>
        </Tile>
    );
}

/**
 * ETL Monitor Status Row - Shows multiple monitors in a compact row
 */
export function ETLMonitorStatusRow({ maxItems = 3 }: { maxItems?: number }) {
    const [monitors, setMonitors] = React.useState<ETLMonitorDto[]>([]);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        const loadMonitors = async () => {
            setLoading(true);
            try {
                const { listActiveETLMonitors } = await import('../../resources/etl-monitor/etl-monitor.api');
                const data = await listActiveETLMonitors();
                setMonitors(data.slice(0, maxItems));
            } catch (e) {
                console.error('Failed to load monitors', e);
            } finally {
                setLoading(false);
            }
        };

        loadMonitors();
    }, [maxItems]);

    if (loading || monitors.length === 0) return null;

    return (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {monitors.map((monitor) => (
                <ETLMonitorStatusCard key={monitor.uuid} monitor={monitor} />
            ))}
        </div>
    );
}

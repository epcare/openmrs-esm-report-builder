import React from 'react';
import {
    Button,
    InlineLoading,
    InlineNotification,
    Stack,
    Tile,
    Tabs,
    Tab,
} from '@carbon/react';
import { Renew as Refresh, Warning } from '@carbon/icons-react';
import Header from '../shared/header/header.component';
import { listActiveETLMonitors, fetchMonitorData } from '../../resources/etl-monitor/etl-monitor.api';
import type { ETLMonitorDto, MonitorDataResponse } from '../../types/etl-monitor/etl-monitor.types';
import { EtlMonitorWidget } from './renderers/EtlMonitorWidget';
import styles from './etl-monitor-dashboard.scss';

/**
 * Main ETL Monitor Dashboard Component
 */
export default function ETLMonitorDashboard() {
    const [monitors, setMonitors] = React.useState<ETLMonitorDto[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // Store data for each monitor
    const [monitorData, setMonitorData] = React.useState<Record<string, MonitorDataResponse>>({});
    const [monitorErrors, setMonitorErrors] = React.useState<Record<string, string>>({});
    const [monitorLoading, setMonitorLoading] = React.useState<Record<string, boolean>>({});

    const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

    const loadMonitors = React.useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            const data = await listActiveETLMonitors(signal);
            setMonitors(data);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load monitors');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        const ac = new AbortController();
        loadMonitors(ac.signal);
        return () => ac.abort();
    }, [loadMonitors]);

    // Load data for all monitors
    const loadAllMonitorData = React.useCallback(async () => {
        if (monitors.length === 0) return;

        const newLoading: Record<string, boolean> = {};
        const newData: Record<string, MonitorDataResponse> = {};
        const newErrors: Record<string, string> = {};

        await Promise.all(monitors.map(async (monitor) => {
            if (!monitor.uuid) return;
            newLoading[monitor.uuid] = true;
            setMonitorLoading((prev) => ({ ...prev, [monitor.uuid]: true }));

            try {
                const data = await fetchMonitorData(monitor.uuid);
                newData[monitor.uuid] = data;
                setMonitorData((prev) => ({ ...prev, [monitor.uuid]: data }));
                setMonitorErrors((prev) => {
                    const next = { ...prev };
                    delete next[monitor.uuid];
                    return next;
                });
            } catch (e: any) {
                newErrors[monitor.uuid] = e?.message ?? 'Failed to load data';
                setMonitorErrors((prev) => ({ ...prev, [monitor.uuid]: e?.message ?? 'Failed to load data' }));
            } finally {
                setMonitorLoading((prev) => ({ ...prev, [monitor.uuid]: false }));
            }
        }));
    }, [monitors]);

    React.useEffect(() => {
        loadAllMonitorData();
    }, [loadAllMonitorData]);

    // Auto-refresh based on monitor intervals
    React.useEffect(() => {
        if (monitors.length === 0) return;

        // Find the minimum refresh interval
        const minInterval = Math.min(...monitors.map((m) => m.refreshInterval || 30));

        const interval = setInterval(() => {
            loadAllMonitorData();
        }, minInterval * 1000);

        return () => clearInterval(interval);
    }, [monitors, loadAllMonitorData]);

    // Get unique categories
    const categories = React.useMemo(() => {
        const cats = new Set(monitors.map((m) => m.category).filter(Boolean));
        return Array.from(cats) as string[];
    }, [monitors]);

    // Filter monitors by category
    const filteredMonitors = React.useMemo(() => {
        if (!selectedCategory) return monitors;
        return monitors.filter((m) => m.category === selectedCategory);
    }, [monitors, selectedCategory]);

    // Group monitors by category
    const groupedMonitors = React.useMemo(() => {
        const groups: Record<string, ETLMonitorDto[]> = {};
        filteredMonitors.forEach((monitor) => {
            const cat = monitor.category || 'Uncategorized';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(monitor);
        });
        return groups;
    }, [filteredMonitors]);

    const refreshMonitor = () => {
        loadAllMonitorData();
    };

    const refreshAll = () => {
        loadAllMonitorData();
    };

    if (loading) {
        return (
            <Stack gap={5}>
                <Header title="ETL Monitor Dashboard" subtitle="Loading monitors..." />
                <InlineLoading description="Loading ETL monitors..." style={{ padding: '2rem' }} />
            </Stack>
        );
    }

    if (error) {
        return (
            <Stack gap={5}>
                <Header title="ETL Monitor Dashboard" subtitle="Monitor your ETL processes" />
                <InlineNotification lowContrast kind="error" title="Error" subtitle={error} />
            </Stack>
        );
    }

    if (monitors.length === 0) {
        return (
            <Stack gap={5}>
                <Header
                    title="ETL Monitor Dashboard"
                    subtitle="No ETL monitors configured. Create monitors in the admin section."
                />
                <Tile style={{ padding: '2rem', textAlign: 'center' }}>
                    <Warning size={48} style={{ marginBottom: '1rem' }} />
                    <h3>No Monitors Configured</h3>
                    <p style={{ color: 'var(--cds-text-secondary, #666)' }}>
                        Go to the <strong>Admin</strong> section to create ETL monitors.
                    </p>
                </Tile>
            </Stack>
        );
    }

    return (
        <Stack gap={5} className={styles['etl-monitor-dashboard']}>
            <Header
                title="ETL Monitor Dashboard"
                subtitle="Real-time health monitoring for your ETL processes"
                actions={
                    <Button size="sm" renderIcon={Refresh} onClick={refreshAll}>
                        Refresh All
                    </Button>
                }
            />

            {/* Category tabs */}
            {categories.length > 0 && (
                <div className={styles['etl-monitor-dashboard__tabs']}>
                    <Tabs selectedIndex={selectedCategory ? categories.indexOf(selectedCategory) + 1 : 0}>
                        <Tab onClick={() => setSelectedCategory(null)}>All</Tab>
                        {categories.map((cat) => (
                            <Tab key={cat} onClick={() => setSelectedCategory(cat)}>
                                {cat} <span className={styles['etl-monitor-dashboard__tab-count']}>
                                    {monitors.filter(m => m.category === cat).length}
                                </span>
                            </Tab>
                        ))}
                    </Tabs>
                </div>
            )}

            {/* Monitors grouped by category */}
            <div className={styles['etl-monitor-dashboard__content']}>
                {Object.entries(groupedMonitors).map(([category, categoryMonitors]) => (
                    <div key={category} className={styles['etl-monitor-dashboard__section']}>
                        <div className={styles['etl-monitor-dashboard__section-header']}>
                            <h3>{category}</h3>
                            <span className={styles['etl-monitor-dashboard__section-count']}>
                                {categoryMonitors.length} {categoryMonitors.length === 1 ? 'monitor' : 'monitors'}
                            </span>
                        </div>
                        <div className={styles['etl-monitor-dashboard__grid']}>
                            {categoryMonitors.map((monitor) => {
                                if (!monitor.uuid) return null;

                                return (
                                    <EtlMonitorWidget
                                        key={monitor.uuid}
                                        monitor={monitor}
                                        data={monitorData[monitor.uuid]}
                                        error={monitorErrors[monitor.uuid]}
                                        loading={!!monitorLoading[monitor.uuid]}
                                        onRefresh={() => refreshMonitor()}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </Stack>
    );
}

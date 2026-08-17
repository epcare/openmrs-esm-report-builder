import React from 'react';
import {
    Button,
    InlineLoading,
    InlineNotification,
    Stack,
    Tag,
    Tile,
    Tabs,
    Tab,
} from '@carbon/react';
import { Renew as Refresh, Warning, ArrowRight } from '@carbon/icons-react';
import Header from '../shared/header/header.component';
import { listActiveETLMonitors, fetchMonitorData } from '../../resources/etl-monitor/etl-monitor.api';
import type { ETLMonitorDto, MonitorDataResponse, DisplayColumn, MonitorType } from '../../types/etl-monitor/etl-monitor.types';
import ETLMonitorCardShell, { CardEmptyState } from './etl-monitor-card-shell.component';
import styles from './etl-monitor-dashboard.scss';

/**
 * Status Card Component - Displays a single status indicator
 */
function StatusCard({ monitor, data, error, loading, onRefresh }: {
    monitor: ETLMonitorDto;
    data?: MonitorDataResponse;
    error?: string;
    loading: boolean;
    onRefresh: () => void;
}) {
    const columns = React.useMemo(() => {
        if (!monitor.displayConfigJson) return [];
        try {
            const config = JSON.parse(monitor.displayConfigJson);
            return config.columns || [];
        } catch {
            return [];
        }
    }, [monitor.displayConfigJson]);

    const getStatusColor = (value: any, colorMap?: Record<string, string>) => {
        if (!colorMap) return 'cool-gray';
        const key = String(value);
        return colorMap[key] || 'cool-gray';
    };

    const getStatusLabel = (value: any, colorMap?: Record<string, string>) => {
        const key = String(value);
        if (colorMap) {
            if (key === 'true' || key === 'false') {
                return key === 'true' ? 'Running' : 'Stopped';
            }
        }
        return String(value);
    };

    const renderContent = () => {
        if (!data?.data || data.data.length === 0) {
            return <CardEmptyState message="No data available" />;
        }

        return (
            <Stack gap={3}>
                {columns.map((col: DisplayColumn) => {
                    const item = data.data.find((d) => d.key === col.key);
                    if (!item) return null;

                    if (col.columnType === 'STATUS_BADGE') {
                        return (
                            <div key={col.key} className={styles['etl-monitor-card__row']}>
                                <span className={styles['etl-monitor-card__label']}>{col.header}:</span>
                                <Tag type={getStatusColor(item.value, col.colorMap) as any}>
                                    {getStatusLabel(item.value, col.colorMap)}
                                </Tag>
                            </div>
                        );
                    }

                    if (col.columnType === 'PROGRESS_BAR') {
                        const progress = Number(item.value) || 0;
                        return (
                            <div key={col.key}>
                                <div className={styles['etl-monitor-card__row']}>
                                    <span className={styles['etl-monitor-card__label']}>{col.header}:</span>
                                    <span className={styles['etl-monitor-card__value']}>{progress.toFixed(1)}%</span>
                                </div>
                                <div className={styles['etl-monitor-card__progress-bar']}>
                                    <div
                                        className={`${styles['etl-monitor-card__progress-fill']} ${styles[`etl-monitor-card__progress-fill--${getProgressColor(progress)}`]}`}
                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={col.key} className={styles['etl-monitor-card__row']}>
                            <span className={styles['etl-monitor-card__label']}>{col.header}:</span>
                            <span className={styles['etl-monitor-card__value']}>{String(item.displayValue || item.value || '—')}</span>
                        </div>
                    );
                })}
            </Stack>
        );
    };

    const getProgressColor = (value: number) => {
        if (value >= 100) return 'success';
        if (value >= 50) return 'primary';
        return 'warning';
    };

    return (
        <ETLMonitorCardShell
            title={monitor.name}
            loading={loading}
            error={error}
            onRefresh={onRefresh}
        >
            {renderContent()}
        </ETLMonitorCardShell>
    );
}

/**
 * Progress Card Component - Displays progress bar
 */
function ProgressCard({ monitor, data, error, loading, onRefresh }: {
    monitor: ETLMonitorDto;
    data?: MonitorDataResponse;
    error?: string;
    loading: boolean;
    onRefresh: () => void;
}) {
    return <StatusCard monitor={monitor} data={data} error={error} loading={loading} onRefresh={onRefresh} />;
}

/**
 * Data Table Component - Displays tabular data
 */
function DataTableCard({ monitor, data, error, loading, onRefresh }: {
    monitor: ETLMonitorDto;
    data?: MonitorDataResponse;
    error?: string;
    loading: boolean;
    onRefresh: () => void;
}) {
    const columns = React.useMemo(() => {
        if (!monitor.displayConfigJson) return [];
        try {
            const config = JSON.parse(monitor.displayConfigJson);
            return config.columns || [];
        } catch {
            return [];
        }
    }, [monitor.displayConfigJson]);

    // For table data, we need to transform the array of data objects
    const tableData = React.useMemo(() => {
        if (!data?.data || data.data.length === 0) return [];

        // Check if the data is structured as an array of rows
        const firstItem = data.data[0];
        if (Array.isArray(firstItem?.value)) {
            // The value is an array of objects
            return firstItem.value.map((row: any, idx: number) => {
                const result: any = { _id: idx };
                columns.forEach((col: DisplayColumn) => {
                    // Try to extract value using the column's key or jsonPath
                    result[col.key] = row[col.key] || null;
                });
                return result;
            });
        }

        // Otherwise, treat each data item as a row
        return data.data.map((item: any, idx: number) => ({
            _id: idx,
            ...item
        }));
    }, [data, columns]);

    const [viewAll, setViewAll] = React.useState(false);

    const renderContent = () => {
        if (!tableData || tableData.length === 0) {
            return <CardEmptyState message="No data available" description="No table data to display" />;
        }

        const displayData = viewAll ? tableData : tableData.slice(0, 10);

        return (
            <Stack gap={3}>
                <div className={styles['etl-monitor-table-container']}>
                    <table className={styles['etl-monitor-table']}>
                        <thead>
                            <tr>
                                {columns.map((col: DisplayColumn) => (
                                    <th key={col.key}>{col.header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {displayData.map((row: any) => (
                                <tr key={row._id}>
                                    {columns.map((col: DisplayColumn) => (
                                        <td key={col.key}>
                                            {row[col.key] !== null && row[col.key] !== undefined
                                                ? String(row[col.key])
                                                : '—'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {tableData.length > 10 && !viewAll && (
                    <div className={styles['etl-monitor-table__footer']}>
                        Showing 10 of {tableData.length} rows
                        <Button
                            kind="ghost"
                            size="sm"
                            renderIcon={ArrowRight}
                            onClick={() => setViewAll(true)}
                        >
                            View all
                        </Button>
                    </div>
                )}
            </Stack>
        );
    };

    return (
        <ETLMonitorCardShell
            title={monitor.name}
            loading={loading}
            error={error}
            onRefresh={onRefresh}
            size="lg"
        >
            {renderContent()}
        </ETLMonitorCardShell>
    );
}

/**
 * Error Log Component - Displays error log entries
 */
function ErrorLogCard({ monitor, data, error, loading, onRefresh }: {
    monitor: ETLMonitorDto;
    data?: MonitorDataResponse;
    error?: string;
    loading: boolean;
    onRefresh: () => void;
}) {
    return <DataTableCard monitor={monitor} data={data} error={error} loading={loading} onRefresh={onRefresh} />;
}

/**
 * Metrics Grid Component - Displays KPI/metric cards
 */
function MetricsGridCard({ monitor, data, error, loading, onRefresh }: {
    monitor: ETLMonitorDto;
    data?: MonitorDataResponse;
    error?: string;
    loading: boolean;
    onRefresh: () => void;
}) {
    const columns = React.useMemo(() => {
        if (!monitor.displayConfigJson) return [];
        try {
            const config = JSON.parse(monitor.displayConfigJson);
            return config.columns || [];
        } catch {
            return [];
        }
    }, [monitor.displayConfigJson]);

    const renderContent = () => {
        if (!data?.data || data.data.length === 0) {
            return <CardEmptyState message="No metrics available" />;
        }

        return (
            <div className={styles['etl-monitor-metrics-grid']}>
                {columns.map((col) => {
                    const item = data.data.find((d) => d.key === col.key);
                    if (!item) return null;

                    return (
                        <div key={col.key} className={styles['etl-monitor-metrics-card']}>
                            <div className={styles['etl-monitor-metrics-card__label']}>
                                {col.header}
                            </div>
                            <div className={styles['etl-monitor-metrics-card__value']}>
                                {item.displayValue || item.value || '—'}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <ETLMonitorCardShell
            title={monitor.name}
            loading={loading}
            error={error}
            onRefresh={onRefresh}
        >
            {renderContent()}
        </ETLMonitorCardShell>
    );
}

/**
 * Map monitor type to component
 * Using Partial to allow only some types to be mapped
 */
const MonitorComponentMap: Partial<Record<MonitorType, React.ComponentType<any>>> = {
    STATUS_CARD: StatusCard,
    PROGRESS_BAR: ProgressCard,
    DATA_TABLE: DataTableCard,
    TIME_SERIES: DataTableCard, // For now, use same as table
    ERROR_LOG: ErrorLogCard,
    METRICS_GRID: MetricsGridCard,
};

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

                                const MonitorComponent = MonitorComponentMap[monitor.monitorType] || StatusCard;

                                return (
                                    <MonitorComponent
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

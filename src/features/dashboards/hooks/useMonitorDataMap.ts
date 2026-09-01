import React from 'react';
import { fetchMonitorData } from '../../../resources/etl-monitor/etl-monitor.api';
import type { ETLMonitorDto, MonitorDataResponse } from '../../../types/etl-monitor/etl-monitor.types';

export type DashboardAggregateStatus = 'success' | 'warning' | 'error';

interface UseMonitorDataMapResult {
  dataMap: Record<string, MonitorDataResponse>;
  errorMap: Record<string, string>;
  loadingMap: Record<string, boolean>;
  lastRefreshed: Date | null;
  refreshAll: () => void;
  refreshOne: (uuid: string) => void;
  aggregateStatus: DashboardAggregateStatus;
}

/**
 * Fetch and auto-refresh data for every ETL monitor placed on a dashboard.
 * Mirrors the legacy dashboard's model (browser-side fetchMonitorData,
 * min-interval polling) with per-widget refresh and an aggregate status
 * for the dashboard header pill.
 */
export function useMonitorDataMap(
  monitors: ETLMonitorDto[],
  minRefreshInterval: number,
): UseMonitorDataMapResult {
  const [dataMap, setDataMap] = React.useState<Record<string, MonitorDataResponse>>({});
  const [errorMap, setErrorMap] = React.useState<Record<string, string>>({});
  const [loadingMap, setLoadingMap] = React.useState<Record<string, boolean>>({});
  const [lastRefreshed, setLastRefreshed] = React.useState<Date | null>(null);

  const monitorKey = React.useMemo(() => monitors.map((m) => m.uuid).join(','), [monitors]);

  const loadOne = React.useCallback(async (uuid: string) => {
    setLoadingMap((prev) => ({ ...prev, [uuid]: true }));
    try {
      const data = await fetchMonitorData(uuid);
      setDataMap((prev) => ({ ...prev, [uuid]: data }));
      setErrorMap((prev) => {
        const next = { ...prev };
        delete next[uuid];
        return next;
      });
    } catch (e: any) {
      setErrorMap((prev) => ({ ...prev, [uuid]: e?.message ?? 'Failed to load data' }));
    } finally {
      setLoadingMap((prev) => ({ ...prev, [uuid]: false }));
    }
  }, []);

  const loadAll = React.useCallback(() => {
    const uuids = monitorKey.split(',').filter(Boolean);
    if (uuids.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    Promise.all(uuids.map((uuid) => loadOne(uuid))).then(() => setLastRefreshed(new Date()));
  }, [monitorKey, loadOne]);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Auto-refresh at the minimum refresh interval across included monitors
  React.useEffect(() => {
    if (!monitorKey) return undefined;
    const intervalMs = Math.max(5, minRefreshInterval) * 1000;
    const interval = setInterval(() => loadAll(), intervalMs);
    return () => clearInterval(interval);
  }, [monitorKey, minRefreshInterval, loadAll]);

  const refreshAll = React.useCallback(() => loadAll(), [loadAll]);
  const refreshOne = React.useCallback((uuid: string) => loadOne(uuid), [loadOne]);

  const aggregateStatus: DashboardAggregateStatus = React.useMemo(() => {
    const errors = Object.values(errorMap).filter(Boolean);
    if (errors.length > 0) return 'error';
    const uuids = monitorKey.split(',').filter(Boolean);
    const hasEmpty = uuids.some((uuid) => !dataMap[uuid]);
    return hasEmpty ? 'warning' : 'success';
  }, [errorMap, dataMap, monitorKey]);

  return { dataMap, errorMap, loadingMap, lastRefreshed, refreshAll, refreshOne, aggregateStatus };
}

export default useMonitorDataMap;

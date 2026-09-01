import React from 'react';
import { listActiveETLMonitors } from '../../../resources/etl-monitor/etl-monitor.api';
import { listReports } from '../../../resources/report/reports.api';
import type { DashboardConfigV1 } from '../../../types/dashboard/dashboard.types';
import type { ETLMonitorDto } from '../../../types/etl-monitor/etl-monitor.types';
import type { ReportDto } from '../../../resources/report/reports.api';

interface UseDashboardWidgetsResult {
  monitors: ETLMonitorDto[];
  reports: ReportDto[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetch the resolution inputs for a dashboard config: active ETL monitors
 * and reports, in parallel. A failure on one side is tolerated (resolves
 * to an empty list) — only a total failure surfaces as an error.
 */
export function useDashboardWidgets(config?: DashboardConfigV1 | null): UseDashboardWidgetsResult {
  const [monitors, setMonitors] = React.useState<ETLMonitorDto[]>([]);
  const [reports, setReports] = React.useState<ReportDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Re-fetch when the config's shape changes (widget refs / autoInclude), not on identity churn
  const configKey = React.useMemo(
    () => JSON.stringify({ w: config?.widgets ?? [], ai: config?.autoInclude ?? null }),
    [config?.widgets, config?.autoInclude],
  );

  React.useEffect(() => {
    const ac = new AbortController();
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    Promise.all([
      listActiveETLMonitors(ac.signal).catch((e: any) => {
        if (e?.name === 'AbortError') throw e;
        return null; // tolerate — monitors may be unavailable for report-only dashboards
      }),
      listReports({ v: 'default' }, ac.signal).catch((e: any) => {
        if (e?.name === 'AbortError') throw e;
        return null;
      }),
    ])
      .then(([monitorsResult, reportsResult]) => {
        if (!isMounted) return;
        if (monitorsResult === null && reportsResult === null) {
          setError('Failed to load dashboard contents');
        }
        setMonitors(monitorsResult ?? []);
        setReports(reportsResult ?? []);
      })
      .catch(() => {
        /* aborted */
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey]);

  return { monitors, reports, isLoading, error };
}

export default useDashboardWidgets;

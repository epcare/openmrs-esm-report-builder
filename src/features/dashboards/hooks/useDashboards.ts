import React from 'react';
import { listDashboards } from '../../../resources/dashboard/dashboard.api';
import type { DashboardDto, DashboardType } from '../../../types/dashboard/dashboard.types';

interface UseDashboardsResult {
  dashboards: DashboardDto[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * List dashboards (for the index page and the admin table).
 */
export function useDashboards(params?: {
  q?: string;
  type?: DashboardType;
  activeOnly?: boolean;
  includeRetired?: boolean;
}): UseDashboardsResult {
  const { q, type, activeOnly, includeRetired } = params ?? {};
  const [dashboards, setDashboards] = React.useState<DashboardDto[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    const ac = new AbortController();
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    listDashboards({ q, type, activeOnly, includeRetired, v: 'default' }, ac.signal)
      .then((data) => {
        if (isMounted) setDashboards((data ?? []).filter((d) => d.uuid));
      })
      .catch((e: any) => {
        if (isMounted && e?.name !== 'AbortError') setError(e?.message ?? 'Failed to load dashboards');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      ac.abort();
    };
  }, [q, type, activeOnly, includeRetired, tick]);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  return { dashboards, isLoading, error, reload };
}

export default useDashboards;

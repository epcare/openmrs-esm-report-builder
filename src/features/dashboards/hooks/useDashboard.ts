import React from 'react';
import { getDashboard } from '../../../resources/dashboard/dashboard.api';
import type { DashboardDto } from '../../../types/dashboard/dashboard.types';

interface UseDashboardResult {
  dashboard: DashboardDto | null;
  isLoading: boolean;
  error: string | null;
  notFound: boolean;
}

/**
 * Fetch a single dashboard by uuid, code, or numeric id.
 */
export function useDashboard(uuidOrCode?: string): UseDashboardResult {
  const [dashboard, setDashboard] = React.useState<DashboardDto | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    if (!uuidOrCode) {
      setDashboard(null);
      setNotFound(false);
      setError(null);
      return undefined;
    }

    const ac = new AbortController();
    let isMounted = true;

    setIsLoading(true);
    setError(null);
    setNotFound(false);

    getDashboard(uuidOrCode, ac.signal)
      .then((data) => {
        if (isMounted) setDashboard(data ?? null);
      })
      .catch((e: any) => {
        if (!isMounted || e?.name === 'AbortError') return;
        if (e?.status === 404 || e?.response?.status === 404 || /not found|404/i.test(String(e?.message))) {
          setNotFound(true);
        } else {
          setError(e?.message ?? 'Failed to load dashboard');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
      ac.abort();
    };
  }, [uuidOrCode]);

  return { dashboard, isLoading, error, notFound };
}

export default useDashboard;

/**
 * Hook to fetch indicators by theme
 */

import { useEffect, useState } from 'react';
import { listIndicators } from '../../resources/indicator/indicators.api';
import type { IndicatorDto } from '../../resources/indicator/indicators.api';

type Result = {
  indicators: IndicatorDto[];
  loading: boolean;
  error: string | null;
};

export function useIndicatorsByTheme(themeUuid?: string | null): Result {
  const [indicators, setIndicators] = useState<IndicatorDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Fetch all indicators for population selection - independent of data theme
    listIndicators({ v: 'full', includeRetired: false })
      .then((data) => {
        // For population selection, use all indicators regardless of theme
        // Indicators define their own patient cohort and should be available independently
        setIndicators(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch indicators');
        setIndicators([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [themeUuid]); // Keep themeUuid in deps, but don't filter by it

  return { indicators, loading, error };
}

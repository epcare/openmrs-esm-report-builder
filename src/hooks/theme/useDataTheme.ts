/**
 * Hook to fetch a single data theme with its configuration
 */

import { useEffect, useState } from 'react';
import { getDataTheme } from '../../resources/theme/data-theme.api';
import type { DataThemeDto } from '../../resources/theme/data-theme.api';
import type { DataThemeConfig } from '../../types/theme/data-theme.types';

type Result = {
  theme: DataThemeDto | null;
  config: DataThemeConfig | null;
  loading: boolean;
  error: string | null;
};

export function useDataTheme(uuid: string | undefined): Result {
  const [theme, setTheme] = useState<DataThemeDto | null>(null);
  const [config, setConfig] = useState<DataThemeConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uuid) {
      setTheme(null);
      setConfig(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    getDataTheme(uuid)
      .then((data) => {
        setTheme(data);
        // Parse configJson if present
        if (data.configJson) {
          try {
            const parsed = JSON.parse(data.configJson);
            setConfig(parsed);
          } catch (e) {
            console.error('Failed to parse theme config:', e);
            setConfig(null);
          }
        } else {
          setConfig(null);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch theme');
        setTheme(null);
        setConfig(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [uuid]);

  return { theme, config, loading, error };
}

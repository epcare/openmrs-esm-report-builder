/**
 * useExplorerPreferences Hook
 *
 * Manages user preferences for the report visualizer using localStorage.
 * Persists explorer state (expanded/collapsed, width, etc.) across sessions.
 *
 * Phase 5.3: Preferences hook
 */
import { useState, useCallback, useEffect } from 'react';
import type { ReportVisualizerPreferences } from '../types';

const STORAGE_KEY = 'reportVisualizer.preferences';

const DEFAULT_PREFERENCES: ReportVisualizerPreferences = {
  explorerExpanded: true,
  explorerWidth: 350,
  rowsPerPage: 25,
  lastActiveView: undefined,
};

/**
 * Hook for managing report visualizer preferences
 */
export function useExplorerPreferences() {
  const [preferences, setPreferencesState] = useState<ReportVisualizerPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new properties
        setPreferencesState({
          ...DEFAULT_PREFERENCES,
          ...parsed,
        });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (error) {
        console.error('Failed to save preferences:', error);
      }
    }
  }, [preferences, isLoaded]);

  // Update specific preference(s)
  const updatePreferences = useCallback(
    (updates: Partial<ReportVisualizerPreferences>) => {
      setPreferencesState((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    []
  );

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES);
  }, []);

  // Individual preference setters for convenience
  const setExplorerExpanded = useCallback((expanded: boolean) => {
    updatePreferences({ explorerExpanded: expanded });
  }, [updatePreferences]);

  const setExplorerWidth = useCallback((width: number) => {
    updatePreferences({ explorerWidth: width });
  }, [updatePreferences]);

  const setRowsPerPage = useCallback((rows: number) => {
    updatePreferences({ rowsPerPage: rows });
  }, [updatePreferences]);

  const setLastActiveView = useCallback((view: string | undefined) => {
    updatePreferences({ lastActiveView: view });
  }, [updatePreferences]);

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    setExplorerExpanded,
    setExplorerWidth,
    setRowsPerPage,
    setLastActiveView,
    isLoaded,
  };
}

export default useExplorerPreferences;

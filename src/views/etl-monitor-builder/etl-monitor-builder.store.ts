/**
 * ETL Monitor Builder Store
 * State management for the ETL Monitor Builder
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  MonitorBuilderState,
  BuilderStep,
  BuilderMode,
  GeneralConfig,
  NormalizedEndpointConfig,
  EndpointTestResult,
  DetectedSchema,
} from '../../types/etl-monitor/etl-monitor-builder.types';
import type { ETLMonitorDto } from '../../types/etl-monitor/etl-monitor.types';
import {
  getDefaultBuilderState,
} from '../../types/etl-monitor/etl-monitor-builder.types';
import {
  listETLMonitors,
  deleteETLMonitor as deleteMonitorApi,
} from '../../resources/etl-monitor/etl-monitor.api';

/**
 * Custom hook for managing ETL Monitor Builder state
 */
export function useETLMonitorBuilder(initialMode: BuilderMode = 'create') {
  const [state, setState] = useState<MonitorBuilderState>(() =>
    getDefaultBuilderState(initialMode)
  );

  // Monitor list state
  const [monitors, setMonitors] = useState<ETLMonitorDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateState = useCallback((updates: Partial<MonitorBuilderState>) => {
    setState((prev) => ({ ...prev, ...updates, isDirty: true }));
  }, []);

  const setGeneralConfig = useCallback((config: Partial<GeneralConfig>) => {
    setState((prev) => ({
      ...prev,
      general: { ...prev.general, ...config },
      isDirty: true,
    }));
  }, []);

  const setEndpointConfig = useCallback((config: Partial<NormalizedEndpointConfig>) => {
    setState((prev) => ({
      ...prev,
      endpoint: { ...prev.endpoint, ...config },
      isDirty: true,
    }));
  }, []);

  const setTestResult = useCallback((result: EndpointTestResult | undefined) => {
    setState((prev) => ({ ...prev, testResult: result }));
  }, []);

  const setDetectedSchema = useCallback((schema: DetectedSchema | undefined) => {
    setState((prev) => ({ ...prev, detectedSchema: schema }));
  }, []);

  const setCurrentStep = useCallback((step: BuilderStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const setSaving = useCallback((saving: boolean) => {
    setState((prev) => ({ ...prev, isSaving: saving }));
  }, []);

  const resetState = useCallback((mode: BuilderMode = 'create') => {
    setState(getDefaultBuilderState(mode));
  }, []);

  // Monitor list operations
  const fetchMonitors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listETLMonitors();
      setMonitors(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fetch monitors');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteMonitor = useCallback(async (uuid: string) => {
    try {
      await deleteMonitorApi(uuid);
      setMonitors((prev) => prev.filter((m) => m.uuid !== uuid));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete monitor');
      throw err;
    }
  }, []);

  // Load monitors on mount
  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  return {
    // Builder state
    state,
    updateState,
    setGeneralConfig,
    setEndpointConfig,
    setTestResult,
    setDetectedSchema,
    setCurrentStep,
    setSaving,
    resetState,

    // Monitor list state
    monitors,
    loading,
    error,
    fetchMonitors,
    deleteMonitor,
  };
}

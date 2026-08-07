/**
 * useReportParameters Hook
 *
 * Manages runtime parameters for a selected report.
 * Loads parameters from metaJson, initializes defaults, validates required fields.
 *
 * Phase 5.2: Parameters hook
 */
import { useState, useCallback, useMemo } from 'react';
import type { LinelistParameter } from '../../../types/linelist-types';
import type { ReportLibraryItem } from '../types';

interface UseReportParametersResult {
  parameters: LinelistParameter[];
  values: Record<string, any>;
  errors: Record<string, string>;
  loading: boolean;
  setValues: (values: Record<string, any>) => void;
  validate: () => boolean;
  reset: () => void;
  clear: () => void;
  hasParameters: boolean;
  requiredParamsCount: number;
}

interface UseReportParametersOptions {
  report: ReportLibraryItem | null;
}

/**
 * Hook for managing report parameters
 * @param options - Report to extract parameters from
 */
export function useReportParameters(
  options: UseReportParametersOptions
): UseReportParametersResult {
  const { report } = options;

  // Parse parameters from report's metaJson
  const parameters = useMemo((): LinelistParameter[] => {
    if (!report?.metaJson) return [];

    try {
      const meta = JSON.parse(report.metaJson);
      if (meta?.parameters && Array.isArray(meta.parameters)) {
        return meta.parameters;
      }
    } catch (error) {
      console.error('Failed to parse metaJson:', error);
    }

    return [];
  }, [report?.metaJson]);

  // Count required parameters
  const requiredParamsCount = useMemo(() => {
    return parameters.filter((p) => p.required).length;
  }, [parameters]);

  const hasParameters = parameters.length > 0;

  // Initialize parameter values with defaults
  const initialValues = useMemo((): Record<string, any> => {
    const defaults: Record<string, any> = {};
    const today = new Date().toISOString().split('T')[0];

    parameters.forEach((param) => {
      if (param.defaultValue !== undefined) {
        defaults[param.name] = param.defaultValue;
      } else if (param.type === 'DATE' || param.type === 'DATETIME') {
        // Default all date parameters to today if no defaultValue
        if (param.name === 'startDate' ||
            param.name === 'endDate' ||
            param.name.toLowerCase().includes('date')) {
          defaults[param.name] = today;
        }
      }
    });

    return defaults;
  }, [parameters]);

  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset values when report changes
  const [lastReportUuid, setLastReportUuid] = useState<string | null>(null);

  // Detect report change and reset
  useMemo(() => {
    if (report?.uuid !== lastReportUuid) {
      setValues(initialValues);
      setErrors({});
      setLastReportUuid(report?.uuid || null);
    }
  }, [report?.uuid, initialValues, lastReportUuid]);

  // Set all values
  const setAllValues = useCallback((newValues: Record<string, any>) => {
    setValues(newValues);
  }, []);

  // Validate all required parameters
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    parameters.forEach((param) => {
      const value = values[param.name];

      if (param.required && (!value || value.toString().trim() === '')) {
        newErrors[param.name] = `${param.label} is required`;
      }

      // Type-specific validation
      if (value && param.type === 'NUMBER') {
        if (isNaN(Number(value))) {
          newErrors[param.name] = `${param.label} must be a number`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [parameters, values]);

  // Reset to initial defaults
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  // Clear all values and errors
  const clear = useCallback(() => {
    setValues({});
    setErrors({});
  }, []);

  return {
    parameters,
    values,
    errors,
    loading: false,
    setValues: setAllValues,
    validate,
    reset,
    clear,
    hasParameters,
    requiredParamsCount,
  };
}

export default useReportParameters;

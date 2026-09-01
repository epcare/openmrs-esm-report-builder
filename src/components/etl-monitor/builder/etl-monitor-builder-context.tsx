/**
 * ETL Monitor Builder Context
 * Provides state management for the monitor builder wizard
 */
import { getETLMonitor, createETLMonitor, updateETLMonitor } from '../../../resources/etl-monitor/etl-monitor.api';

import React, { createContext, useContext, useCallback, useReducer, ReactNode } from 'react';
import type {
  MonitorBuilderState,
  BuilderAction,
  BuilderStep,
  BuilderContextValue,
  DisplayConfigV2,
} from '../../../types/etl-monitor';
import {
  getDefaultBuilderState,
  STEP_ORDER,
  canAdvanceFromStep,
  getNextStep,
  getPreviousStep,
} from '../../../types/etl-monitor/etl-monitor-builder.types';
import {
  generateConfigFromState as generateConfigFromStateMachine,
  validateGeneralStep,
  validateDataSourceStep,
  validateDesignStep,
  validateFieldsStep,
  validatePreviewStep,
} from './builder-state-machine';

/**
 * Builder context
 */
const BuilderContext = createContext<BuilderContextValue | null>(null);

/**
 * State reducer for builder actions
 */
function builderReducer(state: MonitorBuilderState, action: BuilderAction): MonitorBuilderState {
  switch (action.type) {
    case 'SET_GENERAL_CONFIG':
      return {
        ...state,
        general: { ...state.general, ...action.payload },
        isDirty: true,
      };

    case 'SET_ENDPOINT_CONFIG':
      return {
        ...state,
        endpoint: { ...state.endpoint, ...action.payload },
        isDirty: true,
      };

    case 'SET_TEST_RESULT':
      return {
        ...state,
        testResult: action.payload,
        isDirty: true,
      };

    case 'SET_DETECTED_SCHEMA':
      return {
        ...state,
        detectedSchema: action.payload,
        isDirty: true,
      };

    case 'SET_COMPONENT_TYPE':
      return {
        ...state,
        componentType: action.payload,
        isDirty: true,
      };

    case 'SET_FIELDS':
      return {
        ...state,
        fields: action.payload,
        isDirty: true,
      };

    case 'ADD_FIELD':
      return {
        ...state,
        fields: [...state.fields, action.payload],
        isDirty: true,
      };

    case 'UPDATE_FIELD':
      return {
        ...state,
        fields: state.fields.map(field =>
          field.key === action.payload.key
            ? { ...field, ...action.payload.updates }
            : field
        ),
        isDirty: true,
      };

    case 'REMOVE_FIELD':
      return {
        ...state,
        fields: state.fields.filter(field => field.key !== action.payload),
        isDirty: true,
      };

    case 'SET_COMPONENT_CONFIG':
      return {
        ...state,
        componentConfig: { ...state.componentConfig, ...action.payload },
        isDirty: true,
      };

    case 'SET_LAYOUT':
      return {
        ...state,
        layout: action.payload,
        isDirty: true,
      };

    case 'SET_DENSITY':
      return {
        ...state,
        density: action.payload,
        isDirty: true,
      };

    case 'SET_EMPTY_STATE':
      return {
        ...state,
        emptyState: action.payload,
        isDirty: true,
      };

    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload,
      };

    case 'VALIDATE_STEP':
      return validateStepInState(state, action.payload);

    case 'SET_SAVING':
      return {
        ...state,
        isSaving: action.payload,
      };

    case 'RESET':
      return getDefaultBuilderState(state.mode);

    case 'LOAD_MONITOR':
      return loadMonitorIntoState(action.payload);

    default:
      return state;
  }
}

/**
 * Validate a specific step in the state
 */
function validateStepInState(state: MonitorBuilderState, step: BuilderStep): MonitorBuilderState {
  const validatedSteps = new Set(state.validation.validatedSteps);
  validatedSteps.add(step);

  const stepValidation = { ...state.stepValidation };

  switch (step) {
    case 'general': {
      const result = validateGeneralStep(state.general);
      stepValidation.general = {
        nameValid: result.errors.filter(e => e.includes('Name')).length === 0,
        codeValid: result.errors.filter(e => e.includes('Code')).length === 0,
        codeUnique: true, // Would need server validation
        categoryValid: true,
        refreshIntervalValid: result.errors.filter(e => e.includes('Refresh')).length === 0,
        timeoutValid: result.errors.filter(e => e.includes('Timeout')).length === 0,
      };
      break;
    }
    case 'data-source': {
      const result = validateDataSourceStep(state.endpoint, state.testResult, state.mode === 'edit');
      stepValidation['data-source'] = {
        endpointTested: !!state.testResult,
        endpointValid: result.valid,
        urlValid: result.errors.filter(e => e.includes('URL')).length === 0,
        authValid: true,
      };
      break;
    }
    case 'design': {
      const result = validateDesignStep(state.componentType);
      stepValidation.design = {
        componentSelected: result.valid,
        componentValid: result.valid,
      };
      break;
    }
    case 'fields': {
      const result = validateFieldsStep(
        state.fields,
        state.componentType,
        state.testResult?.data,
        state.detectedSchema?.arrayPath,
      );
      stepValidation.fields = {
        requiredFieldsMapped: result.errors.filter(e => e.includes('required')).length === 0,
        primaryFieldSet: state.fields.some(f => f.primary),
        jsonPathsValid: result.errors.filter(e => e.includes('path')).length === 0,
      };
      break;
    }
    case 'preview': {
      const result = validatePreviewStep(state);
      stepValidation.preview = {
        configValid: result.valid,
        previewRenderable: result.valid,
      };
      break;
    }
  }

  return {
    ...state,
    validation: {
      ...state.validation,
      validatedSteps,
      isValid: validatedSteps.size === 5, // All steps validated
    },
    stepValidation,
  };
}

/**
 * Convert V1 color to V2 tone
 * Maps V1 color names to V2 tone values
 */
function convertV1ColorToTone(color: string): 'success' | 'critical' | 'warning' | 'info' | 'neutral' {
  const colorToToneMap: Record<string, 'success' | 'critical' | 'warning' | 'info' | 'neutral'> = {
    'green': 'success',
    'red': 'critical',
    'yellow': 'warning',
    'blue': 'info',
    'gray': 'neutral',
    'grey': 'neutral',
    'success': 'success',
    'error': 'critical',
    'warning': 'warning',
    'info': 'info',
    'neutral': 'neutral',
  };

  const normalizedColor = color?.toLowerCase() || '';
  return colorToToneMap[normalizedColor] || 'neutral';
}

/**
 * Convert V1 column to V2 field format
 * Handles migration from old column-based format to new field-based format
 */
function convertV1ColumnToV2Field(column: any): any {
  const field: any = {
    key: column.key,
    label: column.header || column.key,
    path: column.jsonPath || `$.${column.key}`,
    type: 'TEXT',
    primary: false,
    hidden: false,
    order: 0,
  };

  // Map V1 column types to V2 field types
  switch (column.columnType) {
    case 'STATUS_BADGE':
      field.type = 'STATUS';
      if (column.colorMap && typeof column.colorMap === 'object') {
        field.statusMappings = Object.entries(column.colorMap).map(([rawValue, color]) => ({
          rawValue,
          label: rawValue, // Default label to the raw value
          tone: convertV1ColorToTone(String(color)),
        }));
      }
      break;
    case 'TIMESTAMP':
      field.type = 'TIMESTAMP';
      break;
    case 'NUMBER':
      field.type = 'NUMBER';
      break;
    case 'PERCENTAGE':
      field.type = 'PERCENTAGE';
      break;
    case 'DURATION':
      field.type = 'DURATION';
      break;
    case 'BOOLEAN':
      field.type = 'BOOLEAN';
      break;
    default:
      field.type = 'TEXT';
  }

  if (column.defaultValue !== undefined) {
    field.defaultValue = column.defaultValue;
  }

  return field;
}

/**
 * Load an existing monitor into the builder state
 */
function loadMonitorIntoState(monitor: any): MonitorBuilderState {
  const state = getDefaultBuilderState('edit');
  state.initialMonitor = monitor;

  // Parse configurations with better error handling
  let config: any = {};
  let displayConfig: any = {};
  let parseError = false;

  try {
    if (monitor.configJson) {
      config = JSON.parse(monitor.configJson);
    }
  } catch (e) {
    console.error('Failed to parse monitor configJson:', e);
    parseError = true;
    // Set a flag or handle the error appropriately
    state.parseError = 'configJson';
  }

  try {
    if (monitor.displayConfigJson) {
      displayConfig = JSON.parse(monitor.displayConfigJson);
    }
  } catch (e) {
    console.error('Failed to parse monitor displayConfigJson:', e);
    parseError = true;
    state.parseError = state.parseError ? `${state.parseError}, displayConfigJson` : 'displayConfigJson';
  }

  if (parseError) {
    console.warn('Monitor configuration parsing failed, builder may not function correctly:', monitor.code);
  }

  // Extract endpoint configuration - create new objects to avoid reference issues
  const endpoint = config.apiEndpoint || {};

  // Build auth configuration with proper defaults for all fields
  let authConfig: any;

  if (endpoint.auth && typeof endpoint.auth === 'object') {
    // Use the auth object directly, ensuring all required fields exist
    authConfig = {
      type: endpoint.auth.type || endpoint.authType || 'NONE',
      useSession: endpoint.auth.useSession || endpoint.useSession === true,
      username: endpoint.auth.username || '',
      password: endpoint.auth.password || '',
      headerName: endpoint.auth.headerName || '',
      apiKey: endpoint.auth.apiKey || '',
      token: endpoint.auth.token || '',
    };
  } else {
    // Fallback: build from V1 format or defaults
    const authType = endpoint.authType || endpoint.auth?.type || 'NONE';
    const authCfg = endpoint.authConfig || endpoint.authConfig || {};

    authConfig = {
      type: authType,
      useSession: authType === 'OPENMRS' || authCfg.useSession === 'true' || authCfg.useSession === true,
      username: authCfg.username || '',
      password: authCfg.password || '',
      headerName: authCfg.headerName || 'X-API-Key',
      apiKey: authCfg.apiKey || '',
      token: authCfg.token || '',
    };
  }

  state.endpoint = {
    url: endpoint.url || '',
    method: endpoint.method || 'GET',
    auth: authConfig,
  };

  // Extract general configuration - create new object
  state.general = {
    name: monitor.name || '',
    code: monitor.code || '',
    description: monitor.description || '',
    category: monitor.category || '',
    refreshInterval: monitor.refreshInterval || 30,
    timeout: monitor.timeout || 10,
    active: monitor.active !== false,
  };

  // Extract display configuration - handle both V1 and V2 formats
  if (displayConfig.schemaVersion === 2) {
    // V2 format - use directly
    state.componentType = displayConfig.component;
    // Use spread to create a NEW array, avoiding reference sharing
    // Also convert statusMap to statusMappings for builder state
    state.fields = displayConfig.fields ? displayConfig.fields.map((field: any) => ({
      ...field,
      // Convert statusMap (Record<string, {label, tone}>) to statusMappings (Array<{rawValue, label, tone}>)
      statusMappings: field.statusMap ? Object.entries(field.statusMap).map(([rawValue, mapping]: [string, any]) => ({
        rawValue,
        label: mapping.label,
        tone: mapping.tone,
      })) : field.statusMappings || [],
    })) : [];
    // Create copies of objects to prevent reference issues
    state.componentConfig = displayConfig.componentConfig ? { ...displayConfig.componentConfig } : {};
    state.layout = displayConfig.layout ? { ...displayConfig.layout } : undefined;
    state.emptyState = displayConfig.emptyState ? { ...displayConfig.emptyState } : undefined;
    state.density = displayConfig.presentation?.density || 'compact';
  } else if (displayConfig.columns && Array.isArray(displayConfig.columns) && displayConfig.columns.length > 0) {
    // V1 format - convert to V2
    console.log('Converting V1 monitor format to V2 for editing:', monitor.code);
    state.componentType = 'TABLE'; // V1 format is typically table-based
    state.fields = displayConfig.columns.map(convertV1ColumnToV2Field);
    // Set minimal component config for converted V1
    state.componentConfig = {};

    // Note: V1 had title/subtitle in displayConfig, but V2 uses layout/emptyState
    // These can be manually reconfigured in the builder
  } else {
    // No valid display config found - set defaults
    console.warn('No valid display configuration found for monitor:', monitor.code);
    state.componentType = 'SUMMARY_CARD';
    state.fields = [];
    state.componentConfig = {};
  }

  return state;
}

/**
 * Provider props
 */
interface BuilderProviderProps {
  children: ReactNode;
  mode: 'create' | 'edit';
  monitorId?: string;
}

/**
 * Builder Provider Component
 */
export function BuilderProvider({ children, mode, monitorId }: BuilderProviderProps) {
  const [state, dispatch] = useReducer(
    builderReducer,
    getDefaultBuilderState('create')
  );
  const [monitor, setMonitor] = React.useState<any | null>(null);
  const [loadingMonitor, setLoadingMonitor] = React.useState(false);

  // Load monitor data if in edit mode
  React.useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    if (mode === 'edit' && monitorId) {
      setLoadingMonitor(true);

      getETLMonitor(monitorId, abortController.signal)
        .then(data => {
          if (isMounted) {
            // Update monitor state and dispatch in sequence
            setMonitor(data);
            dispatch({ type: 'LOAD_MONITOR', payload: data });
            setLoadingMonitor(false);
          }
        })
        .catch(error => {
          if (isMounted && error.name !== 'AbortError') {
            console.error('Failed to load monitor:', error);
            setLoadingMonitor(false);
          }
        });
    }

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [mode, monitorId]);

  /**
   * Update state with partial updates
   */
  const updateState = useCallback((updates: Partial<MonitorBuilderState>) => {
    if (updates.general) {
      dispatch({ type: 'SET_GENERAL_CONFIG', payload: updates.general });
    }
    if (updates.endpoint) {
      dispatch({ type: 'SET_ENDPOINT_CONFIG', payload: updates.endpoint });
    }
    if (updates.testResult !== undefined) {
      dispatch({ type: 'SET_TEST_RESULT', payload: updates.testResult });
    }
    if (updates.detectedSchema !== undefined) {
      dispatch({ type: 'SET_DETECTED_SCHEMA', payload: updates.detectedSchema });
    }
    if (updates.componentType !== undefined) {
      dispatch({ type: 'SET_COMPONENT_TYPE', payload: updates.componentType });
    }
    if (updates.fields !== undefined) {
      dispatch({ type: 'SET_FIELDS', payload: updates.fields });
    }
    if (updates.componentConfig !== undefined) {
      dispatch({ type: 'SET_COMPONENT_CONFIG', payload: updates.componentConfig });
    }
    if (updates.layout !== undefined) {
      dispatch({ type: 'SET_LAYOUT', payload: updates.layout });
    }
    if (updates.density !== undefined) {
      dispatch({ type: 'SET_DENSITY', payload: updates.density });
    }
    if (updates.emptyState !== undefined) {
      dispatch({ type: 'SET_EMPTY_STATE', payload: updates.emptyState });
    }
    if (updates.currentStep !== undefined) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: updates.currentStep });
    }
  }, []);

  /**
   * Validate a specific step
   */
  const validateStep = useCallback((step: BuilderStep): boolean => {
    return canAdvanceFromStep(step, state);
  }, [state]);

  /**
   * Check if can advance from a step
   */
  const canAdvance = useCallback((fromStep: BuilderStep): boolean => {
    return canAdvanceFromStep(fromStep, state);
  }, [state]);

  /**
   * Generate DisplayConfigV2 from current state
   */
  const generateConfig = useCallback((): DisplayConfigV2 => {
    return generateConfigFromStateMachine(state);
  }, [state]);

  /**
   * Save the monitor
   */
  const saveMonitor = useCallback(async () => {
    dispatch({ type: 'SET_SAVING', payload: true });
    try {
      // Import stateToSavePayload from builder-state-machine
      const { stateToSavePayload } = await import('./builder-state-machine');
      const payload = stateToSavePayload(state);

      let result;
      if (mode === 'edit' && monitor?.uuid) {
        result = await updateETLMonitor(monitor.uuid, payload);
      } else {
        result = await createETLMonitor(payload);
      }

      dispatch({ type: 'SET_SAVING', payload: false });
      return result;
    } catch (error) {
      dispatch({ type: 'SET_SAVING', payload: false });
      throw error;
    }
  }, [state, mode, monitor]);

  /**
   * Cancel the builder
   */
  const cancel = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  // dispatch is stable from useReducer, so it doesn't need to be in deps
  const contextValue: BuilderContextValue = React.useMemo(() => ({
    state,
    dispatch,
    updateState,
    validateStep,
    canAdvance,
    generateConfig,
    saveMonitor,
    cancel,
  }), [state, updateState, validateStep, canAdvance, generateConfig, saveMonitor, cancel]);

  // Show loading state while fetching monitor
  if (loadingMonitor) {
    return (
      <BuilderContext.Provider value={contextValue}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Loading monitor configuration...</p>
        </div>
      </BuilderContext.Provider>
    );
  }

  // Show warning if there was a parse error
  if (state.parseError && mode === 'edit') {
    console.warn('Monitor configuration had parsing errors:', state.parseError);
  }

  return (
    <BuilderContext.Provider value={contextValue}>
      {children}
    </BuilderContext.Provider>
  );
}

/**
 * Hook to use the builder context
 */
export function useBuilderContext(): BuilderContextValue {
  const context = useContext(BuilderContext);

  if (!context) {
    throw new Error('useBuilderContext must be used within BuilderProvider');
  }

  return context;
}

/**
 * Hook to get current builder state
 */
export function useBuilderState(): MonitorBuilderState {
  const { state } = useBuilderContext();
  return state;
}

/**
 * Hook to update builder state
 */
export function useUpdateBuilderState() {
  const { updateState } = useBuilderContext();
  return updateState;
}

/**
 * Hook to navigate between steps
 */
export function useStepNavigation() {
  const { state, dispatch, canAdvance } = useBuilderContext();

  const goToStep = useCallback((step: BuilderStep) => {
    const currentIndex = STEP_ORDER.indexOf(state.currentStep);
    const targetIndex = STEP_ORDER.indexOf(step);

    // Can only move to adjacent steps or validate all intermediate steps
    if (Math.abs(targetIndex - currentIndex) <= 1) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: step });
    } else {
      // Need to validate all intermediate steps
      let canMove = true;
      for (let i = Math.min(currentIndex, targetIndex); i < Math.max(currentIndex, targetIndex); i++) {
        if (!canAdvance(STEP_ORDER[i])) {
          canMove = false;
          break;
        }
      }
      if (canMove) {
        dispatch({ type: 'SET_CURRENT_STEP', payload: step });
      }
    }
  }, [state.currentStep, canAdvance, dispatch]);

  const goToNextStep = useCallback(() => {
    const next = getNextStep(state.currentStep);
    if (next) {
      goToStep(next);
    }
  }, [state.currentStep, goToStep]);

  const goToPreviousStep = useCallback(() => {
    const previous = getPreviousStep(state.currentStep);
    if (previous) {
      goToStep(previous);
    }
  }, [state.currentStep, goToStep]);

  // Memoize return value to prevent unnecessary re-renders
  return React.useMemo(() => ({
    currentStep: state.currentStep,
    goToStep,
    goToNextStep,
    goToPreviousStep,
    canGoNext: !!getNextStep(state.currentStep),
    canGoPrevious: !!getPreviousStep(state.currentStep),
  }), [state.currentStep, goToStep, goToNextStep, goToPreviousStep]);
}

export { BuilderContext };

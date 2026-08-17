/**
 * Builder State Machine
 * Handles state transitions and validation for the builder wizard
 */

import type {
  MonitorBuilderState,
  DisplayConfigV2,
  BuilderFieldConfig,
  MonitorComponentType,
  GeneralConfig,
  NormalizedEndpointConfig,
  EndpointTestResult,
} from '../../../types/etl-monitor';
import {
  getDefaultEmptyState,
  getDefaultLayout,
} from '../../../types/etl-monitor/etl-monitor-v2.types';

/**
 * Validation result for a step
 */
export interface StepValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Validate general configuration step
 */
export function validateGeneralStep(config: GeneralConfig): StepValidation {
  const errors: string[] = [];

  if (!config.name || config.name.trim() === '') {
    errors.push('Name is required');
  }

  if (!config.code || config.code.trim() === '') {
    errors.push('Code is required');
  } else if (!/^[a-z0-9-]+$/.test(config.code)) {
    errors.push('Code must contain only lowercase letters, numbers, and hyphens');
  }

  if (config.refreshInterval < 5 || config.refreshInterval > 3600) {
    errors.push('Refresh interval must be between 5 and 3600 seconds');
  }

  if (config.timeout < 1 || config.timeout > 300) {
    errors.push('Timeout must be between 1 and 300 seconds');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate data source step
 */
export function validateDataSourceStep(
  endpoint: NormalizedEndpointConfig,
  testResult?: EndpointTestResult
): StepValidation {
  const errors: string[] = [];

  if (!endpoint.url || endpoint.url.trim() === '') {
    errors.push('API URL is required');
  } else if (!endpoint.url.startsWith('/')) {
    errors.push('URL must be a relative path starting with /');
  }

  if (!testResult) {
    errors.push('Endpoint must be tested before proceeding');
  } else if (!testResult.success) {
    errors.push('Endpoint test failed: ' + (testResult.error || 'Unknown error'));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate design step
 */
export function validateDesignStep(componentType?: MonitorComponentType): StepValidation {
  const errors: string[] = [];

  if (!componentType) {
    errors.push('Please select a component type');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate fields step
 */
export function validateFieldsStep(
  fields: BuilderFieldConfig[],
  componentType?: MonitorComponentType
): StepValidation {
  const errors: string[] = [];

  if (!fields || fields.length === 0) {
    errors.push('At least one field must be configured');
    return { valid: false, errors };
  }

  // Component-specific validation
  if (componentType === 'STATUS_CARD') {
    const hasPrimary = fields.some(f => f.primary);
    if (!hasPrimary) {
      errors.push('Status Card requires a primary field');
    }

    const hasStatus = fields.some(f => f.type === 'STATUS');
    if (!hasStatus) {
      errors.push('Status Card requires at least one STATUS field');
    }
  }

  if (componentType === 'PROGRESS') {
    const hasPercentage = fields.some(f => f.type === 'PERCENTAGE');
    if (!hasPercentage) {
      errors.push('Progress component requires a PERCENTAGE field');
    }
  }

  // Validate field paths
  for (const field of fields) {
    if (!field.path || field.path.trim() === '') {
      errors.push(`Field "${field.label}" is missing a path`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate preview step
 */
export function validatePreviewStep(state: MonitorBuilderState): StepValidation {
  const errors: string[] = [];

  try {
    const config = generateConfigFromState(state);

    if (!config.schemaVersion || config.schemaVersion !== 2) {
      errors.push('Invalid schema version');
    }

    if (!config.component) {
      errors.push('Component type is missing');
    }

    if (!config.fields || config.fields.length === 0) {
      errors.push('No fields configured');
    }
  } catch (error) {
    errors.push('Failed to generate configuration: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate DisplayConfigV2 from builder state
 */
export function generateConfigFromState(state: MonitorBuilderState): DisplayConfigV2 {
  const config: DisplayConfigV2 = {
    schemaVersion: 2,
    component: state.componentType || 'SUMMARY_CARD',
    data: {
      rootPath: '$',
    },
    fields: state.fields.map(field => ({
      key: field.key,
      label: field.label,
      path: field.path,
      type: field.type,
      primary: field.primary,
      description: field.description,
      defaultValue: field.defaultValue,
      statusMap: field.statusMappings?.reduce((map, mapping) => {
        map[mapping.rawValue] = {
          label: mapping.label,
          tone: mapping.tone as any, // StatusTone type
        };
        return map;
      }, {} as Record<string, any>),
      format: field.format,
      hidden: field.hidden,
      order: field.order,
    })),
  };

  // Add layout
  if (state.layout) {
    config.layout = {
      ...state.layout,
      section: state.layout.section as any, // DashboardSection type
    };
  } else {
    config.layout = getDefaultLayout(state.componentType || 'SUMMARY_CARD');
  }

  // Add empty state
  if (state.emptyState) {
    config.emptyState = state.emptyState;
  } else {
    config.emptyState = getDefaultEmptyState(state.componentType || 'SUMMARY_CARD');
  }

  // Add component-specific configuration
  if (state.componentConfig) {
    config.componentConfig = {};

    if (state.componentConfig.statusFieldKey) {
      config.componentConfig.statusFieldKey = state.componentConfig.statusFieldKey;
    }

    if (state.componentConfig.icon) {
      config.componentConfig.icon = state.componentConfig.icon;
    }

    if (state.componentConfig.progressMin !== undefined) {
      config.componentConfig.progressMin = state.componentConfig.progressMin;
    }

    if (state.componentConfig.progressMax !== undefined) {
      config.componentConfig.progressMax = state.componentConfig.progressMax;
    }

    if (state.componentConfig.labelsAbove !== undefined) {
      config.componentConfig.labelsAbove = state.componentConfig.labelsAbove;
    }

    if (state.componentConfig.selectable !== undefined) {
      config.componentConfig.selectable = state.componentConfig.selectable;
    }

    if (state.componentConfig.maxRows !== undefined) {
      config.componentConfig.maxRows = state.componentConfig.maxRows;
    }

    if (state.componentConfig.groups) {
      config.componentConfig.groups = state.componentConfig.groups;
    }
  }

  // Add data source configuration from detected schema
  if (state.detectedSchema?.arrayPath) {
    config.data!.arrayPath = state.detectedSchema.arrayPath;
  }

  return config;
}

/**
 * Convert builder state to save payload
 */
export function stateToSavePayload(state: MonitorBuilderState): any {
  const displayConfig = generateConfigFromState(state);

  return {
    name: state.general.name.trim(),
    code: state.general.code.trim() || undefined,
    description: state.general.description.trim() || undefined,
    monitorType: state.componentType,
    category: state.general.category.trim() || undefined,
    refreshInterval: state.general.refreshInterval,
    timeout: state.general.timeout,
    active: state.general.active,
    configJson: JSON.stringify({
      apiEndpoint: {
        url: state.endpoint.url,
        method: state.endpoint.method,
        auth: {
          type: state.endpoint.auth.type,
          useSession: state.endpoint.auth.useSession,
          username: state.endpoint.auth.username,
          password: state.endpoint.auth.password,
          headerName: state.endpoint.auth.headerName,
          apiKey: state.endpoint.auth.apiKey,
          token: state.endpoint.auth.token,
        },
      },
    }),
    displayConfigJson: JSON.stringify(displayConfig),
  };
}

/**
 * Get all validation errors across all steps
 */
export function getAllValidationErrors(state: MonitorBuilderState): string[] {
  const errors: string[] = [];

  // General step
  const generalValidation = validateGeneralStep(state.general);
  errors.push(...generalValidation.errors);

  // Data source step
  const dataSourceValidation = validateDataSourceStep(state.endpoint, state.testResult);
  errors.push(...dataSourceValidation.errors);

  // Design step
  const designValidation = validateDesignStep(state.componentType);
  errors.push(...designValidation.errors);

  // Fields step
  const fieldsValidation = validateFieldsStep(state.fields, state.componentType);
  errors.push(...fieldsValidation.errors);

  return errors;
}

/**
 * Check if the builder state is valid and ready to save
 */
export function isBuilderStateValid(state: MonitorBuilderState): boolean {
  return getAllValidationErrors(state).length === 0;
}

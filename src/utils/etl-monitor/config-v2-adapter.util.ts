/**
 * Configuration V2 Adapter
 * Handles conversion from legacy v1 configurations to v2 format
 */

import type {
  DisplayConfigV2,
  FieldConfiguration,
  StatusTone,
  SemanticDataType,
  MonitorComponentType,
  LayoutMetadata,
  EmptyStateConfig,
} from '../../types/etl-monitor';

/**
 * Legacy v1 display configuration structure
 */
export interface LegacyDisplayConfig {
  columns?: Array<{
    key: string;
    header: string;
    jsonPath?: string;
    path?: string;
    columnType?: string;
    type?: string;
    format?: string;
    colorMap?: Record<string, string>;
    defaultValue?: string;
    sortable?: boolean;
    width?: number;
  }>;
}

/**
 * Mapping from legacy column types to semantic data types
 */
const COLUMN_TYPE_MAPPING: Record<string, SemanticDataType> = {
  'TEXT': 'TEXT',
  'STRING': 'STRING',
  'NUMBER': 'NUMBER',
  'INTEGER': 'INTEGER',
  'DECIMAL': 'DECIMAL',
  'PERCENTAGE': 'PERCENTAGE',
  'PROGRESS_BAR': 'PERCENTAGE',
  'STATUS_BADGE': 'STATUS',
  'TIMESTAMP': 'TIMESTAMP',
  'DURATION': 'DURATION',
  'BOOLEAN': 'BOOLEAN',
  'ICON': 'TEXT',
  'LINK': 'TEXT',
};

/**
 * Mapping from legacy color names to semantic tones
 */
const COLOR_TO_TONE_MAPPING: Record<string, StatusTone> = {
  'green': 'success',
  'success': 'success',
  'blue': 'info',
  'info': 'info',
  'yellow': 'warning',
  'warning': 'warning',
  'orange': 'warning',
  'red': 'critical',
  'error': 'critical',
  'critical': 'critical',
  'gray': 'neutral',
  'grey': 'neutral',
  'neutral': 'neutral',
  'cool-gray': 'neutral',
  'running': 'info',
};

/**
 * Mapping from legacy monitor types to v2 component types
 */
const MONITOR_TYPE_MAPPING: Record<string, MonitorComponentType> = {
  'STATUS_CARD': 'STATUS_CARD',
  'PROGRESS_BAR': 'PROGRESS',
  'DATA_TABLE': 'TABLE',
  'TIME_SERIES': 'TABLE', // Time series renders as table for now
  'ERROR_LOG': 'TABLE',
  'METRICS_GRID': 'METRICS_GRID',
};

/**
 * Adapt legacy display config to v2 format
 */
export function adaptLegacyConfigToV2(
  legacyConfig: string | LegacyDisplayConfig | null | undefined,
  monitorType?: string
): DisplayConfigV2 | null {
  if (!legacyConfig) return null;

  let parsed: LegacyDisplayConfig;

  if (typeof legacyConfig === 'string') {
    try {
      parsed = JSON.parse(legacyConfig);
    } catch {
      console.error('Failed to parse legacy display config JSON');
      return null;
    }
  } else {
    parsed = legacyConfig;
  }

  if (!parsed || typeof parsed !== 'object') return null;

  const componentType = monitorType ? MONITOR_TYPE_MAPPING[monitorType] || 'SUMMARY_CARD' : 'SUMMARY_CARD';

  const v2Config: DisplayConfigV2 = {
    schemaVersion: 2,
    component: componentType,
    fields: [],
  };

  // Add default layout
  v2Config.layout = getDefaultLayoutForComponent(componentType);

  // Add default empty state
  v2Config.emptyState = getDefaultEmptyStateForComponent(componentType);

  // Convert columns to fields
  if (parsed.columns && Array.isArray(parsed.columns)) {
    v2Config.fields = parsed.columns.map((column, index) => convertColumnToField(column, index));

    // Set primary field for STATUS_CARD
    if (componentType === 'STATUS_CARD' && v2Config.fields.length > 0) {
      const statusField = v2Config.fields.find(f => f.type === 'STATUS');
      if (statusField) {
        statusField.primary = true;
        v2Config.componentConfig = {
          statusFieldKey: statusField.key,
        };
      } else if (v2Config.fields[0]) {
        v2Config.fields[0].primary = true;
      }
    }

    // Configure METRICS_GRID layout
    if (componentType === 'METRICS_GRID') {
      v2Config.componentConfig = {
        labelsAbove: false,
      };
    }

    // Configure PROGRESS component
    if (componentType === 'PROGRESS') {
      const progressField = v2Config.fields.find(f => f.type === 'PERCENTAGE' || f.type === 'NUMBER');
      if (progressField) {
        v2Config.componentConfig = {
          progressMin: 0,
          progressMax: 100,
        };
      }
    }

    // Configure TABLE component
    if (componentType === 'TABLE') {
      v2Config.data = {
        rootPath: '$',
        // Will be detected from schema inspector
      };
      v2Config.componentConfig = {
        selectable: false,
        maxRows: 50,
      };
    }
  }

  return v2Config;
}

/**
 * Convert legacy column to v2 field configuration
 */
function convertColumnToField(column: any, index: number): FieldConfiguration {
  const field: FieldConfiguration = {
    key: column.key || `field-${index}`,
    label: column.header || column.key || 'Field',
    path: column.jsonPath || column.path || `$.${column.key}`,
    type: mapColumnType(column.columnType || column.type),
    primary: false,
    order: index,
  };

  // Add default value
  if (column.defaultValue !== undefined) {
    field.defaultValue = column.defaultValue;
  }

  // Add sortable flag
  if (column.sortable !== undefined) {
    field.sortable = column.sortable;
  }

  // Add width
  if (column.width !== undefined) {
    field.width = column.width;
  }

  // Convert colorMap to statusMap for STATUS fields
  if (field.type === 'STATUS' && column.colorMap) {
    field.statusMap = migrateColorMapToStatusMap(column.colorMap);
  }

  // Add format configuration
  if (column.format) {
    field.format = parseFormatString(column.format, field.type);
  }

  return field;
}

/**
 * Map legacy column type to semantic data type
 */
function mapColumnType(columnType?: string): SemanticDataType {
  if (!columnType) return 'TEXT';

  const mapped = COLUMN_TYPE_MAPPING[columnType.toUpperCase()];
  return mapped || 'TEXT';
}

/**
 * Migrate legacy colorMap to v2 statusMap with semantic tones
 */
export function migrateColorMapToStatusMap(colorMap: Record<string, string>): Record<string, { label: string; tone: StatusTone }> {
  const statusMap: Record<string, { label: string; tone: StatusTone }> = {};

  for (const [key, value] of Object.entries(colorMap)) {
    const tone = COLOR_TO_TONE_MAPPING[value.toLowerCase()] || 'neutral';
    statusMap[key] = {
      label: formatStatusLabel(key),
      tone,
    };
  }

  return statusMap;
}

/**
 * Format a raw status value into a human-readable label
 */
function formatStatusLabel(rawValue: string): string {
  // Convert common status values to labels
  const labelMappings: Record<string, string> = {
    'true': 'Running',
    'false': 'Stopped',
    'UP': 'Healthy',
    'DOWN': 'Unavailable',
    'ACTIVE': 'Active',
    'INACTIVE': 'Inactive',
    'RUNNING': 'Running',
    'STOPPED': 'Stopped',
    'SUCCESS': 'Success',
    'FAILURE': 'Failed',
    'COMPLETED': 'Completed',
    'FAILED': 'Failed',
    'PENDING': 'Pending',
    'IN_PROGRESS': 'In Progress',
  };

  const upper = rawValue.toUpperCase();
  return labelMappings[upper] || rawValue;
}

/**
 * Parse legacy format string to v2 format configuration
 */
function parseFormatString(format: string, fieldType: SemanticDataType): any {
  if (!format) return undefined;

  switch (fieldType) {
    case 'TIMESTAMP':
      return {
        timestamp: {
          display: format.includes('relative') ? 'relative' : 'datetime',
          relative: format.includes('relative'),
        },
      };

    case 'DURATION':
      return {
        duration: {
          display: format.includes('human') ? 'human' : 'seconds',
        },
      };

    case 'PERCENTAGE':
      return {
        percentage: {
          decimals: format.includes('.0') || format.includes('.1') ? 1 : 0,
          suffix: '%',
        },
      };

    case 'NUMBER':
      return {
        number: {
          decimals: format.includes('.0') ? 0 : format.includes('.1') ? 1 : format.includes('.2') ? 2 : undefined,
        },
      };

    default:
      return undefined;
  }
}

/**
 * Normalize JSONPath expressions to consistent format
 */
export function normalizeJsonPath(path: string): string {
  if (!path) return '';

  // Ensure path starts with $.
  if (!path.startsWith('$')) {
    // Convert simple field names to $.fieldName
    if (!path.includes('.')) {
      return `$.${path}`;
    }
    return `$.${path}`;
  }

  return path;
}

/**
 * Extract layout metadata from legacy config or monitor properties
 */
export function extractLayoutMetadata(
  monitorCategory?: string,
  monitorType?: string,
  sortOrder?: number
): LayoutMetadata {
  // Determine section based on category or type
  let section: 'overview' | 'execution' | 'history' | 'errors' | 'configuration' = 'overview';

  if (monitorCategory?.toLowerCase().includes('health') || monitorCategory?.toLowerCase().includes('status')) {
    section = 'overview';
  } else if (monitorCategory?.toLowerCase().includes('execution') || monitorCategory?.toLowerCase().includes('progress')) {
    section = 'execution';
  } else if (monitorCategory?.toLowerCase().includes('history') || monitorCategory?.toLowerCase().includes('log')) {
    section = 'history';
  } else if (monitorCategory?.toLowerCase().includes('error')) {
    section = 'errors';
  } else if (monitorCategory?.toLowerCase().includes('config') || monitorCategory?.toLowerCase().includes('setting')) {
    section = 'configuration';
  }

  // Determine span based on component type
  const componentType = monitorType ? MONITOR_TYPE_MAPPING[monitorType] || 'SUMMARY_CARD' : 'SUMMARY_CARD';

  let span: LayoutMetadata['span'] = { sm: 4, md: 4, lg: 4 };

  if (componentType === 'TABLE' || componentType === 'METRICS_GRID') {
    span = { sm: 4, md: 8, lg: 12 };
  } else if (componentType === 'PROGRESS') {
    span = { sm: 4, md: 8, lg: 8 };
  }

  return {
    section,
    span,
    priority: sortOrder || 1,
  };
}

/**
 * Get default layout for a component type
 */
function getDefaultLayoutForComponent(componentType: MonitorComponentType): LayoutMetadata {
  const defaults: Record<MonitorComponentType, LayoutMetadata> = {
    STATUS_CARD: { section: 'overview' as any, span: { sm: 4, md: 4, lg: 4 }, priority: 1 },
    SUMMARY_CARD: { section: 'overview' as any, span: { sm: 4, md: 4, lg: 4 }, priority: 2 },
    METRICS_GRID: { section: 'execution' as any, span: { sm: 4, md: 8, lg: 8 }, priority: 1 },
    PROGRESS: { section: 'execution' as any, span: { sm: 4, md: 8, lg: 8 }, priority: 2 },
    TABLE: { section: 'history' as any, span: { sm: 4, md: 8, lg: 16 }, priority: 1 },
    DATA_TABLE: { section: 'history' as any, span: { sm: 4, md: 8, lg: 16 }, priority: 1 },
    DETAILS: { section: 'configuration' as any, span: { sm: 4, md: 4, lg: 4 }, priority: 1 },
    ERROR_LOG: { section: 'errors' as any, span: { sm: 4, md: 8, lg: 16 }, priority: 1 },
    TIME_SERIES: { section: 'history' as any, span: { sm: 4, md: 8, lg: 12 }, priority: 2 },
  };

  return defaults[componentType] || defaults.SUMMARY_CARD;
}

/**
 * Get default empty state for a component type
 */
function getDefaultEmptyStateForComponent(componentType: MonitorComponentType): EmptyStateConfig {
  const defaults: Record<MonitorComponentType, EmptyStateConfig> = {
    STATUS_CARD: { title: 'No status data available', tone: 'neutral' },
    SUMMARY_CARD: { title: 'No data available', tone: 'neutral' },
    METRICS_GRID: { title: 'No metrics available', tone: 'neutral' },
    PROGRESS: { title: 'No active process', description: 'No process is currently running', tone: 'neutral' },
    TABLE: { title: 'No data available', description: 'There are no records to display', tone: 'neutral' },
    DATA_TABLE: { title: 'No data available', description: 'There are no records to display', tone: 'neutral' },
    DETAILS: { title: 'No configuration available', tone: 'neutral' },
    ERROR_LOG: { title: 'No errors reported', description: 'There are no errors to display', tone: 'success' },
    TIME_SERIES: { title: 'No data available', description: 'There is no time series data to display', tone: 'neutral' },
  };

  return defaults[componentType] || defaults.SUMMARY_CARD;
}

/**
 * Check if a configuration is v2 format
 */
export function isV2Config(config: any): config is DisplayConfigV2 {
  return config && typeof config === 'object' && config.schemaVersion === 2;
}

/**
 * Check if a configuration is legacy v1 format
 */
export function isLegacyConfig(config: any): boolean {
  if (!config || typeof config !== 'object') return false;
  // If it has columns but no schemaVersion, it's legacy
  if (config.columns && Array.isArray(config.columns) && !config.schemaVersion) return true;
  // If it has schemaVersion: 1, it's explicitly legacy
  if (config.schemaVersion === 1) return true;
  return false;
}

/**
 * Safely parse display config, detecting format automatically
 */
export function parseDisplayConfig(
  configJson: string | null | undefined
): { version: 1 | 2 | 'unknown'; config: any; error?: string } {
  if (!configJson) {
    return { version: 'unknown', config: null };
  }

  try {
    const parsed = JSON.parse(configJson);

    if (isV2Config(parsed)) {
      return { version: 2, config: parsed };
    }

    if (isLegacyConfig(parsed)) {
      return { version: 1, config: parsed };
    }

    // Unknown structure, treat as legacy
    return { version: 1, config: parsed };
  } catch (error) {
    return {
      version: 'unknown',
      config: null,
      error: error instanceof Error ? error.message : 'Failed to parse JSON',
    };
  }
}

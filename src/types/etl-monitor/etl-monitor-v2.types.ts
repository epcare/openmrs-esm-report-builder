/**
 * ETL Monitor Display Configuration V2
 * Schema version 2 for visual builder-based configuration
 */

/**
 * Semantic tone for status indicators
 * Replaces literal color values with semantic meanings
 */
export type StatusTone = 'success' | 'critical' | 'warning' | 'info' | 'neutral';

/**
 * Monitor component types supported by the visual builder
 * Includes legacy types for backward compatibility
 */
export type MonitorComponentType =
  | 'STATUS_CARD'
  | 'SUMMARY_CARD'
  | 'METRICS_GRID'
  | 'PROGRESS'
  | 'TABLE'
  | 'DATA_TABLE' // Legacy alias for TABLE
  | 'DETAILS'
  | 'ERROR_LOG' // Specialized DETAILS variant
  | 'LOG' // Event timeline card
  | 'TIME_SERIES'; // Chart component

/**
 * Supported semantic data types for field formatting
 */
export type SemanticDataType =
  | 'TEXT'
  | 'STRING'
  | 'NUMBER'
  | 'INTEGER'
  | 'DECIMAL'
  | 'BOOLEAN'
  | 'STATUS'
  | 'PERCENTAGE'
  | 'TIMESTAMP'
  | 'DURATION'
  | 'DATE'
  | 'TIME'
  | 'OBJECT'
  | 'ARRAY';

/**
 * Display density options
 */
export type DisplayDensity = 'compact' | 'default' | 'spacious';

/**
 * Dashboard section identifiers
 */
export type DashboardSection = 'overview' | 'execution' | 'history' | 'errors' | 'configuration';

/**
 * Responsive span configuration for layout
 */
export type ResponsiveSpan = {
  sm?: number; // 0-4 (mobile)
  md?: number; // 0-8 (tablet)
  lg?: number; // 0-16 (desktop)
};

/**
 * Status mapping configuration
 * Maps raw API values to display properties
 */
export interface StatusMapping {
  label: string;
  tone: StatusTone;
  icon?: string;
  description?: string;
}

/**
 * Format configuration for timestamps
 */
export interface TimestampFormat {
  inputUnit?: 'milliseconds' | 'seconds' | 'minutes';
  display?: 'datetime' | 'date' | 'time' | 'relative';
  locale?: string;
  formatString?: string;
  relative?: boolean;
}

/**
 * Format configuration for durations
 */
export interface DurationFormat {
  inputUnit?: 'milliseconds' | 'seconds' | 'minutes';
  display?: 'human' | 'seconds' | 'minutes';
}

/**
 * Format configuration for numbers
 */
export interface NumberFormat {
  decimals?: number;
  separator?: boolean;
  prefix?: string;
  suffix?: string;
}

/**
 * Field-level formatting configuration
 */
export interface FieldFormatConfig {
  timestamp?: TimestampFormat;
  duration?: DurationFormat;
  number?: NumberFormat;
  percentage?: {
    decimals?: number;
    suffix?: string;
  };
  boolean?: {
    trueLabel?: string;
    falseLabel?: string;
  };
}

/**
 * Empty state configuration
 */
export interface EmptyStateConfig {
  title: string;
  description?: string;
  tone?: StatusTone;
  icon?: string;
  actionLabel?: string;
  actionUrl?: string;
}

/**
 * Layout metadata for dashboard arrangement
 */
export interface LayoutMetadata {
  section: DashboardSection;
  span: ResponsiveSpan;
  priority: number;
}

/**
 * Field configuration in DisplayConfigV2
 * Represents a single field extracted from the API response
 */
export interface FieldConfiguration {
  /** Unique identifier for this field */
  key: string;
  /** Display label for the field */
  label: string;
  /** JSONPath expression to extract the value from the response */
  path: string;
  /** Semantic data type for formatting */
  type: SemanticDataType;
  /** Whether this is the primary/featured field */
  primary?: boolean;
  /** Human-readable description */
  description?: string;
  /** Default value if field is missing or null */
  defaultValue?: any;
  /** Status mapping (for STATUS type fields) */
  statusMap?: Record<string, StatusMapping>;
  /** Field-specific formatting configuration */
  format?: FieldFormatConfig;
  /** Whether the field should be hidden */
  hidden?: boolean;
  /** Sortable flag (for TABLE columns) */
  sortable?: boolean;
  /** Column width (for TABLE) */
  width?: number | string;
  /** Display order within the component */
  order?: number;
}

/**
 * Data source configuration
 */
export interface DataSourceConfig {
  /** Root JSONPath for the data */
  rootPath: string;
  /** Array path if data is an array (for TABLE components) */
  arrayPath?: string;
}

/**
 * Presentation configuration
 */
export interface PresentationConfig {
  title?: string;
  description?: string;
  density?: DisplayDensity;
  showHeader?: boolean;
  showBorder?: boolean;
}

/**
 * Component-specific configuration extensions
 */
export interface ComponentSpecificConfig {
  /** STATUS_CARD: Primary status field key */
  statusFieldKey?: string;
  /** STATUS_CARD: Icon for the card */
  icon?: string;
  /** METRICS_GRID: Whether to show labels above values */
  labelsAbove?: boolean;
  /** PROGRESS: Min value for progress calculation */
  progressMin?: number;
  /** PROGRESS: Max value for progress calculation */
  progressMax?: number;
  /** PROGRESS: Field key for status text */
  progressStatusFieldKey?: string;
  /** PROGRESS: Field key for stage/step text */
  stageFieldKey?: string;
  /** TABLE: Whether to enable row selection */
  selectable?: boolean;
  /** TABLE: Maximum rows to display (0 = unlimited) */
  maxRows?: number;
  /** TABLE: Optional drill-down link shown in the table footer */
  viewAllUrl?: string;
  /** TABLE: Label for the drill-down link (default "View all") */
  viewAllLabel?: string;
  /** METRICS_GRID: Per-field icon names (document | timer | trend | clock | grid | chart) */
  icons?: Record<string, string>;
  /** METRICS_GRID: Per-field icon tile colors (hex) */
  iconColors?: Record<string, string>;
  /** METRICS_GRID: Per-field value colors (hex, e.g. green "100%" when complete) */
  valueColors?: Record<string, string>;
  /** TIME_SERIES: Label under the delta indicator */
  deltaLabel?: string;
  /** DETAILS: Grouping configuration */
  groups?: Array<{
    key: string;
    label: string;
    fieldKeys: string[];
  }>;
}

/**
 * Display Configuration V2
 * Main configuration structure for monitor display
 */
export interface DisplayConfigV2 {
  /** Schema version identifier */
  schemaVersion: 2;
  /** Component type to render */
  component: MonitorComponentType;
  /** Layout metadata for dashboard placement */
  layout?: LayoutMetadata;
  /** Data source configuration */
  data?: DataSourceConfig;
  /** Presentation options */
  presentation?: PresentationConfig;
  /** Field configurations */
  fields: FieldConfiguration[];
  /** Component-specific extensions */
  componentConfig?: ComponentSpecificConfig;
  /** Empty state configuration */
  emptyState?: EmptyStateConfig;
}

/**
 * Validate DisplayConfigV2 structure
 */
export function isValidDisplayConfigV2(obj: any): obj is DisplayConfigV2 {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.schemaVersion !== 2) return false;
  if (!obj.component || typeof obj.component !== 'string') return false;
  if (!Array.isArray(obj.fields)) return false;

  // Validate fields
  for (const field of obj.fields) {
    if (!field.key || typeof field.key !== 'string') return false;
    if (!field.label || typeof field.label !== 'string') return false;
    if (!field.path || typeof field.path !== 'string') return false;
    if (!field.type || typeof field.type !== 'string') return false;
  }

  return true;
}

/**
 * Get default empty state for a component type
 */
export function getDefaultEmptyState(componentType: MonitorComponentType): EmptyStateConfig {
  const defaults: Record<MonitorComponentType, EmptyStateConfig> = {
    STATUS_CARD: {
      title: 'No status data available',
      tone: 'neutral',
    },
    SUMMARY_CARD: {
      title: 'No data available',
      tone: 'neutral',
    },
    METRICS_GRID: {
      title: 'No metrics available',
      tone: 'neutral',
    },
    PROGRESS: {
      title: 'No active process',
      description: 'No process is currently running',
      tone: 'neutral',
    },
    TABLE: {
      title: 'No data available',
      description: 'There are no records to display',
      tone: 'neutral',
    },
    DATA_TABLE: {
      title: 'No data available',
      description: 'There are no records to display',
      tone: 'neutral',
    },
    DETAILS: {
      title: 'No configuration available',
      tone: 'neutral',
    },
    ERROR_LOG: {
      title: 'No errors reported',
      description: 'There are no errors to display',
      tone: 'success',
    },
    LOG: {
      title: 'No activity',
      description: 'No events have been recorded yet',
      tone: 'neutral',
    },
    TIME_SERIES: {
      title: 'No data available',
      description: 'There is no time series data to display',
      tone: 'neutral',
    },
  };

  return defaults[componentType] || defaults.SUMMARY_CARD;
}

/**
 * Get default layout for a component type
 */
export function getDefaultLayout(componentType: MonitorComponentType): LayoutMetadata {
  const defaults: Record<MonitorComponentType, LayoutMetadata> = {
    STATUS_CARD: {
      section: 'overview',
      span: { sm: 4, md: 4, lg: 4 },
      priority: 1,
    },
    SUMMARY_CARD: {
      section: 'overview',
      span: { sm: 4, md: 4, lg: 4 },
      priority: 2,
    },
    METRICS_GRID: {
      section: 'execution',
      span: { sm: 4, md: 8, lg: 8 },
      priority: 1,
    },
    PROGRESS: {
      section: 'execution',
      span: { sm: 4, md: 8, lg: 8 },
      priority: 2,
    },
    TABLE: {
      section: 'history',
      span: { sm: 4, md: 8, lg: 16 },
      priority: 1,
    },
    DATA_TABLE: {
      section: 'history',
      span: { sm: 4, md: 8, lg: 16 },
      priority: 1,
    },
    DETAILS: {
      section: 'configuration',
      span: { sm: 4, md: 4, lg: 4 },
      priority: 1,
    },
    ERROR_LOG: {
      section: 'errors',
      span: { sm: 4, md: 8, lg: 16 },
      priority: 1,
    },
    LOG: {
      section: 'history',
      span: { sm: 4, md: 8, lg: 8 },
      priority: 2,
    },
    TIME_SERIES: {
      section: 'history',
      span: { sm: 4, md: 8, lg: 12 },
      priority: 2,
    },
  };

  return defaults[componentType] || defaults.SUMMARY_CARD;
}

/**
 * ETL Monitor type definitions
 */

// Re-export v2 types for convenience
export type {
  DisplayConfigV2,
  FieldConfiguration,
  LayoutMetadata,
  StatusTone,
  MonitorComponentType,
  SemanticDataType,
  EmptyStateConfig,
  ComponentSpecificConfig,
} from './etl-monitor-v2.types';

export type {
  BuilderStep,
  BuilderMode,
  BuilderAuthType,
  GeneralConfig,
  NormalizedEndpointConfig,
  EndpointTestResult,
  DetectedSchema,
  DetectedField,
  MonitorBuilderState,
  BuilderContextValue,
} from './etl-monitor-builder.types';


/**
 * Monitor types - legacy and v2
 * Legacy types are retained for backward compatibility
 */
export type MonitorType =
    // Legacy types (v1)
    | 'STATUS_CARD'
    | 'PROGRESS_BAR'
    | 'DATA_TABLE'
    | 'TIME_SERIES'
    | 'ERROR_LOG'
    | 'METRICS_GRID'
    // V2 component types
    | 'SUMMARY_CARD'
    | 'PROGRESS'
    | 'TABLE'
    | 'DETAILS';

export type AuthType = 'NONE' | 'BASIC' | 'API_KEY' | 'BEARER_TOKEN' | 'OPENMRS';

export type ColumnType =
    | 'TEXT'
    | 'NUMBER'
    | 'PERCENTAGE'
    | 'PROGRESS_BAR'
    | 'STATUS_BADGE'
    | 'TIMESTAMP'
    | 'DURATION'
    | 'BOOLEAN'
    | 'ICON'
    | 'LINK';

// API Endpoint Configuration
export type ApiEndpoint = {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    authType?: AuthType;
    authConfig?: AuthConfig;
    queryParams?: Record<string, string>;
    requestBody?: Record<string, any>;
    // V2 normalized structure
    auth?: {
        type?: AuthType;
        useSession?: boolean;
        username?: string;
        password?: string;
        headerName?: string;
        apiKey?: string;
        token?: string;
    };
};

export type AuthConfig = Record<string, any> & {
    username?: string;
    password?: string;
    headerName?: string;
    apiKey?: string;
    token?: string;
    // For OpenMRS session auth - uses existing authenticated session
    // NOTE: In v2, this should be a boolean. Legacy configs may use string "true"/"false"
    useSession?: boolean | string;
};

// Display Column Configuration
export type DisplayColumn = {
    key: string;
    header: string;
    jsonPath: string;
    columnType?: ColumnType;
    format?: string;
    colorMap?: Record<string, string>;
    defaultValue?: string;
    sortable?: boolean;
    width?: number;
};

// Main ETL Monitor DTO
export type ETLMonitorDto = {
    uuid: string;
    display?: string;
    name: string;
    code?: string;
    description?: string;
    monitorType: MonitorType;
    configJson?: string;
    displayConfigJson?: string;
    refreshInterval?: number;
    timeout?: number;
    active?: boolean;
    category?: string;
    sortOrder?: number;
    retired?: boolean;
    dateCreated?: string;
    dateChanged?: string;
    // V2: Schema version for display_config_json
    // Missing or undefined indicates v1 (legacy)
    schemaVersion?: 1 | 2;
};

// Parsed configuration objects (from JSON strings)
export type ETLMonitorConfig = {
    apiEndpoint: ApiEndpoint;
};

export type DisplayConfig = {
    columns: DisplayColumn[];
};

// Save/Update payload
export type SaveETLMonitorPayload = {
    name: string;
    code?: string;
    description?: string;
    monitorType: MonitorType;
    configJson?: string;
    displayConfigJson?: string;
    refreshInterval?: number;
    timeout?: number;
    active?: boolean;
    category?: string;
    sortOrder?: number;
};

// Monitor data response
export type MonitorDataResponse = {
    uuid: string;
    code: string;
    timestamp: string;
    success: boolean;
    data?: Array<{
        key: string;
        header: string;
        value: any;
        displayValue?: string;
        rawValue?: any;
    }>;
    error?: string;
    errorCode?: string;
    rawResponse?: any;
};

// Table row type for DATA_TABLE and ERROR_LOG monitors
export type MonitorDataRow = Record<string, {
    value: any;
    displayValue: string;
    columnType: ColumnType;
}>;

// Status card data type
export type StatusCardData = Record<string, {
    value: any;
    displayValue: string;
    header: string;
    columnType: ColumnType;
    colorMap?: Record<string, string>;
}>;

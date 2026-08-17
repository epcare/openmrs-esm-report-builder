/**
 * ETL Monitor Builder Type Definitions
 * Types for the visual wizard builder interface
 */

import type {
  DisplayConfigV2,
  MonitorComponentType,
  SemanticDataType,
  StatusTone
} from './etl-monitor-v2.types';
import type { ETLMonitorDto } from './etl-monitor.types';

// Re-export types for use in builder components
export type { MonitorComponentType, SemanticDataType, StatusTone } from './etl-monitor-v2.types';

/**
 * Wizard step identifiers
 */
export type BuilderStep = 'general' | 'data-source' | 'design' | 'fields' | 'preview';

/**
 * Builder mode - creating new or editing existing
 */
export type BuilderMode = 'create' | 'edit';

/**
 * Authentication types for endpoint configuration
 */
export type BuilderAuthType = 'NONE' | 'OPENMRS' | 'BASIC' | 'API_KEY' | 'BEARER_TOKEN';

/**
 * HTTP methods supported
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * General configuration for Step 1
 */
export interface GeneralConfig {
  name: string;
  code: string;
  description: string;
  category: string;
  categoryLabel?: string;
  refreshInterval: number;
  timeout: number;
  active: boolean;
}

/**
 * Normalized endpoint configuration for Step 2
 */
export interface NormalizedEndpointConfig {
  url: string;
  method: HttpMethod;
  auth: {
    type: BuilderAuthType;
    useSession?: boolean;
    username?: string;
    password?: string;
    headerName?: string;
    apiKey?: string;
    token?: string;
  };
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  requestBody?: any;
}

/**
 * Detected field from API response inspection
 */
export interface DetectedField {
  name: string;
  path: string;
  type: SemanticDataType;
  suggestedType?: SemanticDataType;
  isRequired?: boolean;
  sampleValue?: any;
  description?: string;
}

/**
 * Schema detection result from endpoint testing
 */
export interface DetectedSchema {
  rootPath: string;
  arrayPath?: string;
  isArray: boolean;
  fields: DetectedField[];
  rawSample: any;
  detectedAt: string;
  recommendedComponent?: MonitorComponentType;
}

/**
 * Endpoint test result
 */
export interface EndpointTestResult {
  success: boolean;
  httpStatus?: number;
  durationMs?: number;
  contentType?: string;
  error?: string;
  data?: any;
  sanitizedData?: any;
  testedAt: string;
}

/**
 * Field-level validation error
 */
export interface FieldValidationError {
  field: string;
  step: BuilderStep;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validation state for the builder
 */
export interface ValidationState {
  isValid: boolean;
  errors: FieldValidationError[];
  warnings: FieldValidationError[];
  validatedSteps: Set<BuilderStep>;
}

/**
 * Step-specific validation states
 */
export interface StepValidationState {
  general: {
    nameValid?: boolean;
    codeValid?: boolean;
    codeUnique?: boolean;
    categoryValid?: boolean;
    refreshIntervalValid?: boolean;
    timeoutValid?: boolean;
  };
  'data-source': {
    endpointTested?: boolean;
    endpointValid?: boolean;
    urlValid?: boolean;
    authValid?: boolean;
  };
  design: {
    componentSelected?: boolean;
    componentValid?: boolean;
  };
  fields: {
    requiredFieldsMapped?: boolean;
    primaryFieldSet?: boolean;
    jsonPathsValid?: boolean;
  };
  preview: {
    configValid?: boolean;
    previewRenderable?: boolean;
  };
}

/**
 * Status mapping being configured in the builder
 */
export interface BuilderStatusMapping {
  rawValue: string;
  label: string;
  tone: StatusTone;
  description?: string;
}

/**
 * Field being configured in the builder
 */
export interface BuilderFieldConfig {
  /** Key identifier */
  key: string;
  /** Display label */
  label: string;
  /** JSONPath to extract value */
  path: string;
  /** Semantic data type */
  type: SemanticDataType;
  /** Whether this is the primary field */
  primary: boolean;
  /** Description */
  description?: string;
  /** Default value */
  defaultValue?: any;
  /** Status mappings (for STATUS type) */
  statusMappings?: BuilderStatusMapping[];
  /** Format configuration */
  format?: any;
  /** Whether hidden */
  hidden: boolean;
  /** Display order */
  order: number;
}

/**
 * Component-specific configuration in builder state
 */
export interface ComponentConfigState {
  statusFieldKey?: string;
  icon?: string;
  progressMin?: number;
  progressMax?: number;
  statusFieldKeyForProgress?: string;
  stageFieldKey?: string;
  labelsAbove?: boolean;
  selectable?: boolean;
  maxRows?: number;
  groups?: Array<{
    key: string;
    label: string;
    fieldKeys: string[];
  }>;
}

/**
 * Main builder state
 * Single source of truth for the entire wizard
 */
export interface MonitorBuilderState {
  /** Builder mode */
  mode: BuilderMode;
  /** Currently active step */
  currentStep: BuilderStep;
  /** Initial monitor being edited (if in edit mode) */
  initialMonitor?: ETLMonitorDto;

  /** Step 1: General configuration */
  general: GeneralConfig;

  /** Step 2: Endpoint configuration */
  endpoint: NormalizedEndpointConfig;
  /** Endpoint test result */
  testResult?: EndpointTestResult;
  /** Detected schema from test */
  detectedSchema?: DetectedSchema;

  /** Step 3: Selected component type */
  componentType?: MonitorComponentType;

  /** Step 4: Field configurations */
  fields: BuilderFieldConfig[];
  /** Component-specific configuration */
  componentConfig: ComponentConfigState;

  /** Layout configuration */
  layout?: {
    section: string;
    span: {
      sm?: number;
      md?: number;
      lg?: number;
    };
    priority: number;
  };

  /** Empty state configuration */
  emptyState?: {
    title: string;
    description?: string;
    tone?: StatusTone;
  };

  /** Validation state */
  validation: ValidationState;
  /** Step-specific validation */
  stepValidation: StepValidationState;

  /** Parse error from JSON parsing (if any) */
  parseError?: string;

  /** Whether state has been modified since last save */
  isDirty: boolean;
  /** Save action in progress */
  isSaving: boolean;
}

/**
 * Builder action types
 */
export type BuilderAction =
  | { type: 'SET_GENERAL_CONFIG'; payload: Partial<GeneralConfig> }
  | { type: 'SET_ENDPOINT_CONFIG'; payload: Partial<NormalizedEndpointConfig> }
  | { type: 'SET_TEST_RESULT'; payload: EndpointTestResult | undefined }
  | { type: 'SET_DETECTED_SCHEMA'; payload: DetectedSchema | undefined }
  | { type: 'SET_COMPONENT_TYPE'; payload: MonitorComponentType | undefined }
  | { type: 'SET_FIELDS'; payload: BuilderFieldConfig[] }
  | { type: 'ADD_FIELD'; payload: BuilderFieldConfig }
  | { type: 'UPDATE_FIELD'; payload: { key: string; updates: Partial<BuilderFieldConfig> } }
  | { type: 'REMOVE_FIELD'; payload: string }
  | { type: 'SET_COMPONENT_CONFIG'; payload: Partial<ComponentConfigState> }
  | { type: 'SET_LAYOUT'; payload: MonitorBuilderState['layout'] }
  | { type: 'SET_EMPTY_STATE'; payload: MonitorBuilderState['emptyState'] }
  | { type: 'SET_CURRENT_STEP'; payload: BuilderStep }
  | { type: 'VALIDATE_STEP'; payload: BuilderStep }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'RESET' }
  | { type: 'LOAD_MONITOR'; payload: ETLMonitorDto };

/**
 * Builder context value
 */
export interface BuilderContextValue {
  state: MonitorBuilderState;
  dispatch: React.Dispatch<BuilderAction>;
  updateState: (updates: Partial<MonitorBuilderState>) => void;
  validateStep: (step: BuilderStep) => boolean;
  canAdvance: (fromStep: BuilderStep) => boolean;
  generateConfig: () => DisplayConfigV2;
  saveMonitor: () => Promise<ETLMonitorDto | void>;
  cancel: () => void;
}

/**
 * Step metadata for navigation
 */
export interface StepMeta {
  id: BuilderStep;
  label: string;
  description: string;
  icon?: string;
  required: boolean;
  canSkip?: boolean;
}

/**
 * Builder configuration options
 */
export interface BuilderConfig {
  /** Whether to show advanced options */
  showAdvanced: boolean;
  /** Whether to enable live preview */
  enableLivePreview: boolean;
  /** Maximum response size for endpoint testing (bytes) */
  maxResponseSize: number;
  /** Default timeout for endpoint testing (seconds) */
  defaultTestTimeout: number;
}

/**
 * Default general config
 */
export function getDefaultGeneralConfig(): GeneralConfig {
  return {
    name: '',
    code: '',
    description: '',
    category: '',
    refreshInterval: 30,
    timeout: 10,
    active: true,
  };
}

/**
 * Default endpoint config
 */
export function getDefaultEndpointConfig(): NormalizedEndpointConfig {
  return {
    url: '',
    method: 'GET',
    auth: {
      type: 'NONE',
    },
  };
}

/**
 * Default component config
 */
export function getDefaultComponentConfig(): ComponentConfigState {
  return {
    labelsAbove: false,
    selectable: false,
    maxRows: 50,
  };
}

/**
 * Default validation state
 */
export function getDefaultValidationState(): ValidationState {
  return {
    isValid: false,
    errors: [],
    warnings: [],
    validatedSteps: new Set<BuilderStep>(),
  };
}

/**
 * Default step validation state
 */
export function getDefaultStepValidationState(): StepValidationState {
  return {
    general: {},
    'data-source': {},
    design: {},
    fields: {},
    preview: {},
  };
}

/**
 * Default builder state
 */
export function getDefaultBuilderState(mode: BuilderMode = 'create'): MonitorBuilderState {
  return {
    mode,
    currentStep: 'general',
    general: getDefaultGeneralConfig(),
    endpoint: getDefaultEndpointConfig(),
    fields: [],
    componentConfig: getDefaultComponentConfig(),
    validation: getDefaultValidationState(),
    stepValidation: getDefaultStepValidationState(),
    isDirty: false,
    isSaving: false,
  };
}

/**
 * Step order for navigation
 */
export const STEP_ORDER: BuilderStep[] = ['general', 'data-source', 'design', 'fields', 'preview'];

/**
 * Step metadata for UI
 */
export const STEP_META: Record<BuilderStep, StepMeta> = {
  general: {
    id: 'general',
    label: 'General',
    description: 'Basic monitor information',
    icon: 'Settings',
    required: true,
  },
  'data-source': {
    id: 'data-source',
    label: 'Data Source',
    description: 'Configure API endpoint',
    icon: 'Data',
    required: true,
  },
  design: {
    id: 'design',
    label: 'Design',
    description: 'Choose display type',
    icon: 'Design',
    required: true,
  },
  fields: {
    id: 'fields',
    label: 'Fields',
    description: 'Map response fields',
    icon: 'Data',
    required: true,
  },
  preview: {
    id: 'preview',
    label: 'Preview',
    description: 'Review and save',
    icon: 'View',
    required: false,
    canSkip: true,
  },
};

/**
 * Get next step in sequence
 */
export function getNextStep(currentStep: BuilderStep): BuilderStep | null {
  const index = STEP_ORDER.indexOf(currentStep);
  if (index === -1 || index === STEP_ORDER.length - 1) return null;
  return STEP_ORDER[index + 1];
}

/**
 * Get previous step in sequence
 */
export function getPreviousStep(currentStep: BuilderStep): BuilderStep | null {
  const index = STEP_ORDER.indexOf(currentStep);
  if (index <= 0) return null;
  return STEP_ORDER[index - 1];
}

/**
 * Check if step can advance to next
 */
export function canAdvanceFromStep(step: BuilderStep, state: MonitorBuilderState): boolean {
  const { validation, stepValidation } = state;

  switch (step) {
    case 'general':
      return (
        stepValidation.general.nameValid === true &&
        stepValidation.general.codeValid === true &&
        stepValidation.general.codeUnique !== false &&
        stepValidation.general.refreshIntervalValid === true &&
        stepValidation.general.timeoutValid === true
      );

    case 'data-source':
      return (
        stepValidation['data-source'].endpointTested === true &&
        stepValidation['data-source'].endpointValid === true
      );

    case 'design':
      return stepValidation.design.componentSelected === true;

    case 'fields':
      return (
        state.fields.length > 0 &&
        stepValidation.fields.requiredFieldsMapped === true &&
        stepValidation.fields.jsonPathsValid !== false
      );

    case 'preview':
      return validation.isValid === true;

    default:
      return false;
  }
}

/**
 * Check if step can be accessed
 */
export function canAccessStep(targetStep: BuilderStep, state: MonitorBuilderState): boolean {
  const targetIndex = STEP_ORDER.indexOf(targetStep);
  const currentIndex = STEP_ORDER.indexOf(state.currentStep);

  // Can always go back
  if (targetIndex < currentIndex) return true;

  // Can only advance if previous steps are valid
  for (let i = 0; i < targetIndex; i++) {
    if (!canAdvanceFromStep(STEP_ORDER[i], state)) return false;
  }

  return true;
}

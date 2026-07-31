/**
 * Linelist Report Type Definitions
 *
 * These types define the structure for linelist (patient list) report definitions.
 * Linelists are standalone reports that return individual patient records,
 * as opposed to aggregate reports which return counts with disaggregation.
 *
 * Based on backend linelist report definition structure from:
 * /openmrs-module-report-builder/omod/src/main/resources/reports/etl/linelist/
 */

/**
 * Population source join types
 * How multiple population sources combine
 */
export type PopulationJoinType =
  | 'JOIN'          // INNER JOIN on patient_id
  | 'LEFT_JOIN'     // LEFT JOIN on patient_id
  | 'INTERSECT'     // Patients in ALL sources (AND logic)
  | 'UNION'         // Patients from ANY source (OR logic)
  | 'EXCEPT';       // Patients in source A but NOT in source B

/**
 * Population source definition
 * Represents a datasource used for patient population selection
 */
export type PopulationSource = {
  uuid: string;     // Table name (e.g., "mamba_fact_patients_latest")
  name: string;     // Display name
  type: 'ETL' | 'CORE' | 'REFERENCE' | 'SQL' | 'INDICATOR';
  joinType: PopulationJoinType;  // How this source combines with others
  joinCondition?: string;  // Custom ON clause for JOINs
  enabled: boolean;  // Whether this source is active
  order: number;     // Display order for UI
};

/**
 * Data source configuration in report definition
 * Defines which datasources are used and their roles
 */
export type DataSourceConfig = {
  uuid: string; // Data source/table UUID or name
  name: string; // Display name
  type: 'ETL' | 'SQL' | 'REFERENCE' | 'INDICATOR' | 'CORE'; // Source type
  role: 'PRIMARY' | 'SECONDARY' | 'REFERENCE'; // Role in the report

  /**
   * Columns selected from this datasource
   * Maps column names to their definitions
   */
  columns?: Record<string, {
    name: string;
    type: string;
    sourceTable: string;
  }>;
};

/**
 * Linelist report definition configuration
 * This is stored in the configJson field of a report definition
 *
 * Version 2: Supports multiple data sources
 * Version 3: Supports multiple population sources with join types
 */
export type LinelistReportDefinitionConfig = {
  version: 1 | 2 | 3; // Version for migration support
  type: 'LINE_LIST';

  /**
   * Report metadata
   */
  categoryUuid?: string;
  themeUuid?: string;

  /**
   * Version 1: Single data source (legacy)
   * Version 2: Multiple data sources
   */
  dataSourceUuid?: string; // V1 only - deprecated, use dataSources
  dataSources?: DataSourceConfig[]; // V2 - array of data sources

  rowGrain?: LinelistRowGrain;
  templateId?: string;

  /**
   * Parameters supported by this linelist report
   * Typically startDate and endDate for time-based filtering
   */
  parameters?: Array<LinelistParameter>;

  /**
   * Base cohort definition - SQL query that selects patients
   * This query should return distinct patient IDs
   */
  baseCohortDefinition: LinelistCohortDefinition;

  /**
   * Dataset definitions define the output columns and their sources
   * Each dataset becomes a tab/key in the output JSON
   */
  dataSetDefinitions: LinelistDataSetDefinition[];

  /**
   * Optional sorting configuration
   */
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';

  /**
   * Builder metadata - persisted so the editor can reconstruct the draft
   * when re-opening for edit. Ignored by the backend at run time.
   */
  buildMethod?: 'SQL_BUILDER' | 'VISUAL_FILTER' | 'INDICATOR_BASED';
  indicatorRules?: Array<{
    id: string;
    indicatorUuid: string;
    name: string;
    conditions?: Array<{ key: string; operator?: string; value: any }>;
    logicalOperator?: 'AND' | 'OR';
    negate?: boolean;
  }>;

  /**
   * Optional row limit for safety
   */
  limit?: number;
};

/**
 * Parameter definition for linelist reports
 */
export type LinelistParameter = {
  name: string;
  label: string;
  type: LinelistParameterType;
  required?: boolean;
  defaultValue?: string;
  displayOrder?: number;
  /**
   * Type-specific configuration
   * For LOCATION: locationUuids array of allowed locations
   * For CONCEPT/PROGRAM/PROVIDER/CODED_VALUE: sourceUuid for the data source
   * For DATE: includeTime boolean
   */
  config?: Record<string, any>;
};

/**
 * Available parameter types
 */
export type LinelistParameterType =
  | 'DATE'
  | 'DATETIME'
  | 'LOCATION'
  | 'PROGRAM'
  | 'PROVIDER'
  | 'CONCEPT'
  | 'CODED_VALUE'
  | 'BOOLEAN'
  | 'NUMBER'
  | 'TEXT';

/**
 * Parameter draft for builder UI
 */
export type LinelistParameterDraft = {
  id: string; // Unique ID for React keys
  name: string;
  label: string;
  type: LinelistParameterType;
  required: boolean;
  defaultValue: string;
  displayOrder: number;
  config?: Record<string, any>;
};

/**
 * Sort configuration for linelist reports
 * Defines ordered multi-column sorting
 */
export type LinelistSortConfig = {
  id: string; // Unique ID for React keys
  columnId: string; // ID of the column to sort by
  columnName: string; // Display name of the column
  direction: 'ASC' | 'DESC'; // Sort direction
  nulls: 'FIRST' | 'LAST'; // Where to place null values
  sortOrder: number; // Priority in sort order (0 = highest priority)
};

/**
 * Visual filter condition types
 * Used for building SQL queries visually
 */

/**
 * Field type for filter conditions
 */
export type FilterFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'CODED' | 'BOOLEAN' | 'LOCATION';

/**
 * Available operators by field type
 */
export type FilterOperator =
  // Text operators
  | 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'IS_BLANK' | 'IS_NOT_BLANK'
  // Number operators
  | 'GREATER_THAN' | 'LESS_THAN' | 'GREATER_EQUAL' | 'LESS_EQUAL' | 'BETWEEN'
  // Date operators
  | 'ON' | 'BEFORE' | 'AFTER' | 'BETWEEN_DATES' | 'IN_PREVIOUS_PERIOD' | 'IN_NEXT_PERIOD'
  // Coded operators
  | 'IS_ONE_OF' | 'IS_NOT_ONE_OF'
  // Boolean operators
  | 'IS_TRUE' | 'IS_FALSE' | 'NOT_RECORDED'
  // Location operators
  | 'WITHIN_HIERARCHY' | 'IN_LOCATION';

/**
 * Logical operator for combining conditions
 */
export type LogicalOperator = 'AND' | 'OR';

/**
 * Filter condition definition
 */
export type FilterCondition = {
  id: string;
  field: string; // Field name (e.g., "appointment_date", "gender")
  fieldLabel: string; // Display name for the field
  fieldType: FilterFieldType;
  operator: FilterOperator;
  value?: string | string[]; // Single value or array of values
  value2?: string; // Second value for "between" operators
  negate?: boolean; // Whether to negate the condition
};

/**
 * Filter group - contains conditions and nested groups
 */
export type FilterGroup = {
  id: string;
  logicalOperator: LogicalOperator; // How to combine items in this group
  conditions: FilterCondition[];
  nestedGroups?: FilterGroup[]; // Nested groups for complex logic
};

/**
 * Visual filter builder state
 */
export type VisualFilterState = {
  rootGroup: FilterGroup;
  useVisualBuilder: boolean; // Toggle between visual and SQL mode
};

/**
 * Cohort definition for patient selection
 */
export type LinelistCohortDefinition = {
  type: 'SQL';
  name: string;
  config: {
    /**
     * SQL query that returns patient IDs
     * Should use :startDate and :endDate parameters for time-based filtering
     * Example: SELECT DISTINCT patient_id FROM mamba_fact_patients_latest WHERE ...
     */
    sql: string;
  };
};

/**
 * Dataset definition for output columns
 * Each dataset becomes a separate section in the report output
 */
export type LinelistDataSetDefinition = {
  name: string;
  type: 'PATIENT_DATA_SET';

  /**
   * Row filter defines which patients are included
   * Often the same as the base cohort SQL
   */
  rowFilter?: {
    type: 'SQL';
    name: string;
    config: {
      sql: string;
    };
  };

  /**
   * Column definitions for the output
   */
  columns: LinelistColumnDefinition[];
};

/**
 * Column definition for linelist output
 * Each column defines one field in the patient list
 */
export type LinelistColumnDefinition = {
  /**
   * Display name for the column (used as header in output)
   */
  name: string;

  /**
   * Data definition specifies how to get the column value
   */
  dataDefinition: LinelistDataDefinition;

  /**
   * Optional repeat resolution for fields that may return multiple values
   */
  repeatResolution?: LinelistRepeatResolution;
};

/**
 * Data definition types for linelist columns
 * Based on backend-supported column types
 */
export type LinelistDataDefinition =
  | LinelistIdentifierDefinition
  | LinelistPersonNameDefinition
  | LinelistPersonAttributeDefinition
  | LinelistCalculationDefinition
  | LinelistSqlDefinition
  | LinelistPersonAddressDefinition
  | LinelistConverterDefinition
  | LinelistObservationDefinition
  | LinelistEncounterDiagnosisDefinition;

/**
 * Base data definition structure
 */
type BaseDataDefinition<T extends string = string> = {
  type: T;
};

/**
 * Identifier column (e.g., Clinic Number, EID Number)
 * Uses OpenMRS patient identifier types
 */
export type LinelistIdentifierDefinition = BaseDataDefinition<'IDENTIFIER'> & {
  config: {
    identifierTypeUuid: string;
    preferred?: boolean;
  };
};

/**
 * Person name column
 * Formats person name according to specified type
 */
export type LinelistPersonNameDefinition = BaseDataDefinition<'PERSON_NAME'> & {
  config: {
    type?: 'FULL_NAME' | 'GIVEN_NAME' | 'MIDDLE_NAME' | 'FAMILY_NAME';
    preferred?: boolean;
  };
};

/**
 * Person attribute column
 * Uses OpenMRS person attribute types
 */
export type LinelistPersonAttributeDefinition = BaseDataDefinition<'PERSON_ATTRIBUTE'> & {
  config: {
    attributeTypeUuid: string;
  };
};

/**
 * Calculation column
 * Performs calculations on patient data (e.g., age)
 */
export type LinelistCalculationDefinition = BaseDataDefinition<'CALCULATION'> & {
  config: {
    calculation: 'AGE' | 'AGE_IN_MONTHS' | 'AGE_IN_YEARS' | 'BMI' | string;
    onDate?: boolean; // Whether to calculate as of the report end date
  };
};

/**
 * SQL column
 * Custom SQL expression for complex column values
 * The :patientId placeholder will be replaced with the patient ID
 */
export type LinelistSqlDefinition = BaseDataDefinition<'SQL'> & {
  config: {
    sql: string;
  };
};

/**
 * Person address column
 * Retrieves address information
 *
 * UgandaEMR Address Template Mappings:
 * - ADDRESS1: Address Line 1
 * - ADDRESS2: Address Line 2
 * - ADDRESS3: Subcounty
 * - ADDRESS4: Parish
 * - ADDRESS5: Village
 * - STATE_PROVINCE: County
 * - COUNTY_DISTRICT: District
 * - COUNTRY: Country
 */
export type LinelistPersonAddressDefinition = BaseDataDefinition<'PERSON_ADDRESS'> & {
  config: {
    type?: 'PERSON_ADDRESS' | string;
    field?: 'ADDRESS1' | 'ADDRESS2' | 'ADDRESS3' | 'ADDRESS4' | 'ADDRESS5'
      | 'CITY_VILLAGE' | 'STATE_PROVINCE' | 'COUNTY_DISTRICT' | 'COUNTRY'
      | 'LATITUDE' | 'LONGITUDE' | 'POSTAL_CODE' | string;
  };
};

/**
 * Converter column
 * Converts/transforms values from another source
 */
export type LinelistConverterDefinition = BaseDataDefinition<'CONVERTER'> & {
  config: {
    type: string;
    format?: string;
  };
};

/**
 * Observation column
 * Uses OpenMRS observations based on concepts
 * Returns the most recent observation value for each patient
 */
export type LinelistObservationDefinition = BaseDataDefinition<'OBSERVATION'> & {
  config: {
    conceptUuid: string;
    conceptName?: string;
    /**
     * Strategy for handling multiple observations
     * LATEST: Most recent observation by date
     * EARLIEST: Oldest observation by date
     * CLOSEST_TO_START: Value closest to report start date
     * CLOSEST_TO_END: Value closest to report end date
     * FIRST_WITHIN_PERIOD: First observation within reporting period
     * LAST_WITHIN_PERIOD: Last observation within reporting period
     */
    strategy?: 'LATEST' | 'EARLIEST' | 'CLOSEST_TO_START' | 'CLOSEST_TO_END' | 'FIRST_WITHIN_PERIOD' | 'LAST_WITHIN_PERIOD';
    /**
     * Whether to return the concept's display name instead of UUID
     */
    returnDisplay?: boolean;
    /**
     * For coded concepts, optionally return a specific answer
     */
    answerConceptUuid?: string;
  };
};

/**
 * Encounter Diagnosis column
 * Uses OpenMRS encounter diagnoses based on concepts
 * Returns diagnoses for each patient within the reporting period
 */
export type LinelistEncounterDiagnosisDefinition = BaseDataDefinition<'ENCOUNTER_DIAGNOSIS'> & {
  config: {
    /**
     * Optional concept UUID to filter diagnoses by specific condition
     * If not provided, returns all diagnoses
     */
    conceptUuid?: string;
    conceptName?: string;
    /**
     * Rank of diagnosis (PRIMARY/SECONDARY)
     */
    rank?: 'PRIMARY' | 'SECONDARY' | 'ANY';
    /**
     * Whether to return only confirmed diagnoses
     */
    confirmedOnly?: boolean;
    /**
     * Strategy for handling multiple diagnoses
     * ALL_VALUES: Return all diagnoses as comma-separated list
     * LATEST: Most recent diagnosis
     * FIRST_WITHIN_PERIOD: First diagnosis within reporting period
     * LAST_WITHIN_PERIOD: Last diagnosis within reporting period
     */
    strategy?: 'ALL_VALUES' | 'LATEST' | 'FIRST_WITHIN_PERIOD' | 'LAST_WITHIN_PERIOD';
    /**
     * Whether to return the concept's display name instead of UUID
     */
    returnDisplay?: boolean;
  };
};

/**
 * Population configuration mode
 * Indicates how the cohort/patient selection is defined
 */
export type PopulationMode = 'SQL' | 'INDICATOR' | 'HYBRID';

/**
 * Draft state for linelist report builder UI
 * Version 2.0 - Supports multiple data sources and full builder tracking
 * Version 3.0 - Supports multiple population sources with join types
 */
export type LinelistReportDraft = {
  // === VERSION ===
  version: 2 | 3; // Contract version for migration support

  // === BASIC INFO ===
  name: string;
  description?: string;
  code?: string;

  // Current panel in the builder UI
  currentPanel: LinelistBuilderPanel;

  // Report categorization
  categoryUuid?: string; // Optional - report category
  rowGrain?: LinelistRowGrain; // Required - what one row represents
  templateId?: string; // Optional - starting template

  // === POPULATION SOURCES (v3 - Multiple sources with join types) ===
  populationSources: PopulationSource[];

  // === DATA SOURCES (v2 - Multiple sources supported for columns) ===
  dataSources: DataSourceInfo[];

  // === LEGACY PROPERTIES (for backward compatibility during migration) ===
  /** @deprecated Use dataSources array instead */
  dataSourceUuid?: string;
  /** @deprecated Use population.sqlTemplate instead */
  cohortSql?: string;
  /** @deprecated Use population.indicatorRules instead */
  indicatorRules?: any[];
  /** @deprecated Use population.visualFilter instead */
  visualFilter?: any;
  /** @deprecated Not used in V2 */
  populationMode?: string;
  /** @deprecated Not used in V2 */
  dataSetName?: string;
  /** UI state flag for unsaved changes */
  unsavedChanges?: boolean;
  /** Convenience property - aliases to metadata.status */
  status?: 'DRAFT' | 'PUBLISHED' | 'RETIRED';
  /** Embedded validation errors (for UI display convenience) */
  errors?: any;

  // === POPULATION (COHORT) DEFINITION ===
  population: PopulationDefinition;

  // === COLUMNS ===
  columns: LinelistColumnDraft[];

  // === PARAMETERS ===
  parameters: LinelistParameterDraft[];

  // === SORTING ===
  sortConfig: LinelistSortConfig[];

  // === ROW LIMIT ===
  limit?: number;

  // === DISPLAY SETTINGS ===
  displaySettings: DisplaySettings;

  // === VALIDATION STATE ===
  validation: ValidationState;

  // === METADATA ===
  metadata: BuilderMetadata;
};

/**
 * Data source information with role and configuration
 */
export type DataSourceInfo = {
  uuid: string; // Data source UUID
  name: string; // Display name
  type: 'ETL' | 'SQL' | 'REFERENCE' | 'INDICATOR' | 'CORE'; // Source type
  role: 'PRIMARY' | 'SECONDARY' | 'REFERENCE'; // Role in the report
  tables?: string[]; // Tables used from this source
  joinConfig?: DataSourceJoinConfig; // How this source joins to primary
};

/**
 * Data source join configuration
 */
export type DataSourceJoinConfig = {
  joinType: 'LEFT_JOIN' | 'INNER_JOIN' | 'FULL_JOIN';
  joinCondition: string; // Field name to join on
  joinSql?: string; // Custom join SQL if needed
};

/**
 * Population (cohort) definition
 * Captures both the result and the build process
 */
export type PopulationDefinition = {
  // Which data source is the base
  baseDataSourceUuid: string;

  // How the population was built
  buildMethod: 'SQL_BUILDER' | 'VISUAL_FILTER' | 'INDICATOR_BASED';

  // SQL Builder state
  sqlTemplate: string;
  parameterReferences: string[];

  // Visual Filter (if used)
  visualFilter?: VisualFilterState;

  // Indicator-based (if used)
  indicatorRules?: Array<{
    id: string;
    indicatorUuid: string;
    name: string;
    conditions?: Array<{
      key: string;
      operator?: string;
      value: any;
    }>;
    logicalOperator?: 'AND' | 'OR';
    negate?: boolean;
  }>;

  // Build history for reproducibility
  buildHistory?: PopulationBuildStep[];
};

/**
 * Population build step for tracking construction history
 */
export type PopulationBuildStep = {
  timestamp: string; // ISO timestamp
  action: string; // What was done
  description: string; // Human-readable description
  configSnapshot?: any; // Optional state at this point
};

/**
 * Display settings configuration
 */
export type DisplaySettings = {
  defaultPageSize: number;
  freezeFirstColumn: boolean;
  freezeHeader: boolean;
  dateDisplayFormat: string;
  nullDisplayValue: string;
  maxInteractiveRows: number;
  maxExportRows: number;
  allowedExports: Array<'CSV' | 'XLSX' | 'PDF' | 'HTML'>;
  includeParametersInExportHeader: boolean;
  includeGeneratedTimestamp: boolean;
};

/**
 * Validation state
 */
export type ValidationState = {
  errors: LinelistValidationErrors;
  warnings: LinelistValidationWarnings;
  lastValidated: string; // ISO timestamp
};

/**
 * Builder metadata
 */
export type BuilderMetadata = {
  createdAt: string; // ISO timestamp when draft was created
  lastModified: string; // ISO timestamp of last change
  lastModifiedBy?: string; // User who last modified
  buildMethod: 'NEW' | 'TEMPLATE' | 'DUPLICATE' | 'IMPORT' | 'EDIT';
  sourceReportUuid?: string; // If duplicated/imported, the source
  version: number; // For migration support
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED';
};

/**
 * Column draft for builder UI
 * Version 2.0 - With full source tracking
 */
export type LinelistColumnDraft = {
  id: string; // Unique ID for React keys
  name: string; // Display name
  description?: string; // Optional description

  // === SOURCE INFORMATION ===
  source: ColumnSource;

  // === DATA DEFINITION ===
  dataDefinitionType: keyof LinelistDataDefinitionMap;
  dataDefinitionConfig: Record<string, any>;

  /** @deprecated Use dataDefinitionConfig instead */
  config?: Record<string, any>;

  // === ADDITION INFO ===
  additionInfo: ColumnAdditionInfo;

  // === DISPLAY ===
  display: ColumnDisplaySettings;

  // === SORT ORDER ===
  sortOrder: number;

  // === REPEAT RESOLUTION ===
  repeatResolution?: LinelistRepeatResolution;

  // === TRANSFORMATIONS ===
  transformations?: LinelistColumnTransformation[];
};

/**
 * Column source information
 */
export type ColumnSource = {
  dataSourceUuid: string; // Which data source
  dataSourceName: string; // Display name
  table: string; // Source table
  field: string; // Source field
  fieldType: string; // Original field type
  attributeTypeUuid?: string; // For person attributes
  identifierTypeUuid?: string; // For identifiers
  conceptUuid?: string; // For observations and encounter diagnoses
};

/**
 * Column addition information
 */
export type ColumnAdditionInfo = {
  addedVia: 'DRAG_DROP' | 'SQL_BUILDER' | 'VISUAL_SELECTOR' | 'IMPORT' | 'CALCULATED';
  addedAt: string; // ISO timestamp
  addedBy?: string; // User who added
  orderAdded: number; // Sequence in which this was added
};

/**
 * Column display settings
 */
export type ColumnDisplaySettings = {
  width: number;
  align: 'left' | 'center' | 'right';
  sortable: boolean;
  filterable: boolean;
  format?: 'text' | 'date' | 'number' | 'coded' | 'boolean';
  formatConfig?: Record<string, any>;
};

/**
 * Enhanced column draft with full builder details
 * Extends the base column draft with construction metadata
 */
export type LinelistColumnDraftExtended = LinelistColumnDraft & {
  /**
   * Source tracking - where this column came from
   */
  sourceInfo?: {
    dataSourceUuid: string; // Which data source
    dataSourceName: string; // Display name of data source
    table: string; // Source table (e.g., "mamba_fact_patients_latest")
    field: string; // Source field name in the table
    fieldPath?: string; // Full path if nested (e.g., "address.city")
    fieldType: string; // Original field type (TEXT, NUMBER, DATE, etc.)
  };

  /**
   * How this column was added to the report
   */
  additionInfo?: {
    addedVia: 'DRAG_DROP' | 'SQL_BUILDER' | 'VISUAL_SELECTOR' | 'IMPORT';
    addedAt: string; // ISO timestamp
    addedBy?: string; // User who added
    orderAdded: number; // Sequence in which this was added
  };

  /**
   * Transformation pipeline - all transformations applied
   * Preserves the order and configuration of each transformation
   */
  transformationPipeline?: Array<{
    type: string; // Transformation type
    config: Record<string, any>; // Transformation configuration
    enabled: boolean; // Whether this transformation is active
    order: number; // Order in pipeline
  }>;

  /**
   * Preview/sample data for this column (for UX)
   */
  previewData?: {
    sampleValues: string[]; // Example values from actual data
    nullCount?: number; // How many nulls in sample
    uniqueCount?: number; // How many unique values
  };
};

/**
 * Row grain options - what one row represents in the linelist
 */
export type LinelistRowGrain =
  | 'PATIENT'
  | 'ENCOUNTER'
  | 'OBSERVATION'
  | 'PROGRAM_ENROLLMENT'
  | 'APPOINTMENT'
  | 'ORDER';

/**
 * Repeat resolution strategy for fields that can return multiple values
 */
export type LinelistRepeatResolution = {
  strategy: RepeatResolutionStrategy;
  orderBy?: string; // Field to use for ordering (e.g., return_visit_date)
  restrictToPeriod?: boolean; // Only use values within reporting period
  ignoreVoided?: boolean; // Ignore voided records
  tieBreakField?: string; // Field to use as tie-breaker
};

/**
 * Available repeat resolution strategies
 */
export type RepeatResolutionStrategy =
  | 'LATEST' // Most recent value based on order by field
  | 'EARLIEST' // Oldest value based on order by field
  | 'HIGHEST' // Maximum value
  | 'LOWEST' // Minimum value
  | 'CLOSEST_TO_START' // Value closest to report start date
  | 'CLOSEST_TO_END' // Value closest to report end date
  | 'FIRST_WITHIN_PERIOD' // First value within reporting period
  | 'LAST_WITHIN_PERIOD' // Last value within reporting period
  | 'CONCATENATE' // Concatenate all values with separator
  | 'ALL_VALUES' // Return all values and change row grain (one row per value)
  | 'NONE'; // Explicitly choose not to resolve (advanced users only)

/**
 * Column transformation types
 * Transformations are applied in sequence to column values
 */
export type LinelistColumnTransformation =
  | LinelistDateFormatTransformation
  | LinelistAgeCalculationTransformation
  | LinelistCodedToDisplayTransformation
  | LinelistBooleanMappingTransformation
  | LinelistReplaceNullTransformation
  | LinelistNumericRoundingTransformation
  | LinelistCategorizeNumericTransformation
  | LinelistConcatenateTextTransformation
  | LinelistMaskIdentifierTransformation;

/**
 * Base transformation type
 */
type BaseTransformation<T extends string = string> = {
  type: T;
  enabled?: boolean;
};

/**
 * Date format transformation
 * Converts date values to a specified format
 */
export type LinelistDateFormatTransformation = BaseTransformation<'DATE_FORMAT'> & {
  format: string; // e.g., "dd/MM/yyyy", "yyyy-MM-dd", "MMM dd, yyyy"
  inputFormat?: string; // If input needs parsing
};

/**
 * Age calculation transformation
 * Calculates age as of a specific date
 */
export type LinelistAgeCalculationTransformation = BaseTransformation<'AGE_ON_DATE'> & {
  dateField?: string; // Field to calculate age as of (default: endDate)
  years?: boolean; // Include years
  months?: boolean; // Include months
};

/**
 * Coded to display name transformation
 * Converts coded values (UUIDs) to their display names
 */
export type LinelistCodedToDisplayTransformation = BaseTransformation<'CODED_TO_DISPLAY'> & {
  fallback?: string; // Value to use if lookup fails
};

/**
 * Boolean mapping transformation
 * Maps boolean values to custom display strings
 */
export type LinelistBooleanMappingTransformation = BaseTransformation<'BOOLEAN_MAPPING'> & {
  trueValue: string; // Display value for true (e.g., "Yes")
  falseValue: string; // Display value for false (e.g., "No")
  nullValue?: string; // Display value for null (e.g., "Unknown")
};

/**
 * Replace null transformation
 * Replaces null/empty values with a specified value
 */
export type LinelistReplaceNullTransformation = BaseTransformation<'REPLACE_NULL'> & {
  replacementValue: string; // Value to use when null
};

/**
 * Numeric rounding transformation
 * Rounds numeric values to specified precision
 */
export type LinelistNumericRoundingTransformation = BaseTransformation<'NUMERIC_ROUNDING'> & {
  decimalPlaces: number; // Number of decimal places (0-10)
  roundingMode?: 'UP' | 'DOWN' | 'HALF_UP' | 'HALF_DOWN'; // Rounding strategy
};

/**
 * Categorize numeric transformation
 * Categorizes numeric values into ranges
 */
export type LinelistCategorizeNumericTransformation = BaseTransformation<'CATEGORIZE_NUMERIC'> & {
  ranges: Array<{
    min: number;
    max: number;
    label: string;
  }>;
  defaultValue?: string; // Label for values not in any range
};

/**
 * Concatenate text transformation
 * Concatenates multiple field values
 */
export type LinelistConcatenateTextTransformation = BaseTransformation<'CONCATENATE_TEXT'> & {
  fields: string[]; // Field names to concatenate
  separator?: string; // Separator between values (default: ", ")
  includeNulls?: boolean; // Whether to include null values
};

/**
 * Mask identifier transformation
 * Masks sensitive identifiers for privacy
 */
export type LinelistMaskIdentifierTransformation = BaseTransformation<'MASK_IDENTIFIER'> & {
  maskChar?: string; // Character to use for masking (default: "*")
  visibleStart?: number; // Number of characters to show at start
  visibleEnd?: number; // Number of characters to show at end
};

/**
 * Map of data definition type keys to their full types
 */
export type LinelistDataDefinitionMap = {
  IDENTIFIER: LinelistIdentifierDefinition;
  PERSON_NAME: LinelistPersonNameDefinition;
  PERSON_ATTRIBUTE: LinelistPersonAttributeDefinition;
  CALCULATION: LinelistCalculationDefinition;
  SQL: LinelistSqlDefinition;
  PERSON_ADDRESS: LinelistPersonAddressDefinition;
  CONVERTER: LinelistConverterDefinition;
  OBSERVATION: LinelistObservationDefinition;
  ENCOUNTER_DIAGNOSIS: LinelistEncounterDiagnosisDefinition;
};

/**
 * Builder panel options
 */
export type LinelistBuilderPanel =
  | 'basics'
  | 'cohort'
  | 'columns'
  | 'sort'
  | 'parameters'
  | 'display-export'
  | 'preview'
  | 'review';

/**
 * Validation errors for linelist draft
 */
export type LinelistValidationErrors = {
  name?: string;
  categoryUuid?: string;
  themeUuid?: string;
  dataSources?: string;
  rowGrain?: string;
  population?: string;
  columns?: string;
  general?: string;
};

/**
 * Validation warnings for linelist draft (non-blocking)
 */
export type LinelistValidationWarnings = {
  population?: string;
  columns?: string;
  performance?: string;
  category?: string;
  theme?: string;
};

/**
 * Generate warnings for a linelist draft (non-blocking issues)
 */
export function generateLinelistWarnings(draft: LinelistReportDraft): LinelistValidationWarnings {
  const warnings: LinelistValidationWarnings = {};

  // Warn about missing category (recommended but not required)
  if (!draft.categoryUuid?.trim()) {
    warnings.category = 'No category selected. Reports are easier to find when organized into categories.';
  }

  // Warn about missing population sources (v3)
  if (!draft.populationSources || draft.populationSources.length === 0) {
    warnings.population = 'No population sources selected. Select at least one datasource to define the patient cohort.';
  } else {
    const enabledCount = draft.populationSources.filter(ps => ps.enabled).length;
    if (enabledCount === 0) {
      warnings.population = 'No enabled population sources. Enable at least one datasource.';
    }
  }

  // SQL warnings
  if (draft.population.sqlTemplate?.trim()) {
    const upperSql = draft.population.sqlTemplate.toUpperCase();

    // Recommend DISTINCT for patient grain
    if (draft.rowGrain === 'PATIENT' && !upperSql.includes('DISTINCT')) {
      warnings.population = 'Consider using SELECT DISTINCT to avoid duplicate patients';
    }

    // Check for potential performance issues
    if (upperSql.includes('SELECT *')) {
      warnings.performance = 'Avoid SELECT * for better performance';
    }
  }

  // Column count warning
  if (draft.columns.length > 50) {
    warnings.columns = 'Large number of columns may impact performance';
  }

  // SQL per column warning
  const sqlColumnCount = draft.columns.filter((col) => col.dataDefinitionType === 'SQL').length;
  if (sqlColumnCount > 10) {
    warnings.performance = `Many SQL columns (${sqlColumnCount}) may execute slowly. Consider using ETL joins.`;
  }

  return warnings;
}

/**
 * Report definition DTO with linelist config
 * Used for API responses
 */
export type LinelistReportDto = {
  uuid: string;
  name: string;
  description?: string;
  code?: string;
  reportType: 'LINE_LIST';
  configJson?: string;
  metaJson?: string;
  retired?: boolean;
};

/**
 * Extract SQL template from an indicator definition
 * Handles multiple possible locations for the SQL template
 */
function extractIndicatorSql(indicator: { sqlTemplate?: string | null; configJson?: string | null } | undefined): string {
  if (!indicator) return '';

  // Try direct sqlTemplate first
  if (indicator.sqlTemplate?.trim()) {
    return indicator.sqlTemplate.trim();
  }

  // Try parsing configJson
  if (indicator.configJson) {
    try {
      const parsed = JSON.parse(indicator.configJson);

      // Try various possible paths
      const paths = [
        parsed.sqlPreview,
        parsed.sqlTemplate,
        parsed.base?.sqlPreview,
        parsed.base?.sqlTemplate,
        parsed.authoring?.base?.sqlPreview,
        parsed.authoring?.base?.sqlTemplate,
        parsed.baseIndicator?.sqlPreview,
        parsed.baseIndicator?.sqlTemplate,
      ];

      for (const sql of paths) {
        if (typeof sql === 'string' && sql.trim()) {
          return sql.trim();
        }
      }
    } catch (e) {
      console.warn('Failed to parse indicator configJson:', e);
    }
  }

  return '';
}

/**
 * Convert COUNT SQL to population SQL
 * Handles both simple COUNT queries and composite WITH CTE queries
 */
function convertCountSqlToPopulationSql(countSql: string): string {
  const sql = countSql.trim().replace(/;+\s*$/, '');
  if (!sql) return '';

  // Case 1: COUNT(DISTINCT column) - convert to SELECT DISTINCT column
  const distinctPattern = /SELECT\s+COUNT\s*\(\s*DISTINCT\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\s*\)\s+AS\s+(\w+)\s*/i;
  const distinctMatch = sql.match(distinctPattern);
  if (distinctMatch) {
    const columnRef = distinctMatch[1];
    const afterSelect = sql.substring(distinctMatch[0].length);
    if (columnRef.includes('.')) {
      // Extract column name from table.column reference
      const colName = columnRef.split('.')[1];
      return `SELECT DISTINCT ${columnRef} AS ${colName} ${afterSelect}`.trim();
    }
    // Extract table alias from FROM clause
    const fromPattern = /FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:AS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\b/i;
    const fromMatch = afterSelect.match(fromPattern);
    const tableAlias = fromMatch ? fromMatch[2] : 'a';
    return `SELECT DISTINCT ${tableAlias}.${columnRef} AS ${columnRef} ${afterSelect}`.trim();
  }

  // Case 2: Composite WITH ... SELECT COUNT(*) FROM (...) X
  const withPattern = /^WITH\s+([\s\S]*?)\s*SELECT\s+COUNT\s*\(\s*\*\s*\)\s+AS\s+total\s+FROM\s*\(\s*(SELECT[\s\S]*?)\)\s*X\b/i;
  const withMatch = sql.match(withPattern);
  if (withMatch) {
    const ctes = withMatch[1];
    const inner = withMatch[2].trim();
    return `WITH ${ctes}\nSELECT DISTINCT pop.client_id\nFROM (\n  ${inner}\n) pop`;
  }

  // Case 3: Simple SELECT COUNT(*) AS total FROM ...
  const simplePattern = /SELECT\s+COUNT\s*\(\s*\*\s*\)\s+AS\s+total\s*/i;
  const simpleMatch = sql.match(simplePattern);
  if (simpleMatch) {
    const afterCount = sql.substring(simpleMatch[0].length);
    // Extract table alias and detect patient_id column name
    const fromPattern = /FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:AS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\b/i;
    const fromMatch = afterCount.match(fromPattern);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const tableAlias = fromMatch ? fromMatch[2] : 'a';

    // Detect the patient_id column name from the WHERE clause or JOIN conditions
    // Common column names: patient_id, client_id, person_id
    const columnPatterns = [
      /\b(?:${tableAlias}\.)?(patient_id|client_id|person_id)\b/i,
      // Also check JOIN conditions for column references
      /ON\s+\w+\.(?:patient_id|client_id|person_id)\s*=\s*${tableAlias}\.(patient_id|client_id|person_id)/i,
    ];

    let patientIdColumnName = 'patient_id'; // default
    for (const pattern of columnPatterns) {
      const match = afterCount.match(pattern);
      if (match) {
        patientIdColumnName = match[1] || match[2] || 'patient_id';
        break;
      }
    }

    // Use the detected column name consistently
    return `SELECT DISTINCT ${tableAlias}.${patientIdColumnName} AS client_id ${afterCount}`.trim();
  }

  // Fallback: couldn't parse, return as-is (will likely fail in backend)
  return sql;
}

/**
 * Combine multiple population SQLs with AND/OR logic
 */
type PopulationSqlPart = {
  sql: string;
  operator: 'AND' | 'OR';
  negate?: boolean;
};

function combinePopulationSqls(parts: PopulationSqlPart[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].sql;

  // Separate included and excluded populations
  const included: string[] = [];
  const excluded: string[] = [];

  for (const part of parts) {
    if (part.negate) {
      excluded.push(part.sql);
    } else {
      included.push(part.sql);
    }
  }

  // Build the base query from included populations
  let baseQuery = '';
  if (included.length === 0) {
    // If all are excluded, we need a different approach
    // Use all patients and subtract excluded ones
    baseQuery = 'SELECT DISTINCT patient_id AS client_id FROM mamba_fact_patients_latest WHERE patient_id IS NOT NULL';
  } else if (included.length === 1) {
    baseQuery = included[0];
  } else {
    // Combine included populations with INTERSECT (AND) or UNION (OR)
    // For now, use INTERSECT as default - should be improved to track operators
    baseQuery = `(${included.join('\n  INTERSECT\n  ')})`;
  }

  // Apply exclusions using EXCEPT
  if (excluded.length > 0) {
    for (const excludeSql of excluded) {
      baseQuery = `(${baseQuery}\n  EXCEPT\n  ${excludeSql})`;
    }
  }

  return baseQuery;
}

/**
 * Convert a draft to the final configuration format
 *
 * @param draft - The linelist report draft
 * @param indicators - Optional map of indicator UUIDs to indicator definitions for INDICATOR mode
 */
export function draftToConfig(
  draft: LinelistReportDraft,
  indicators?: Map<string, { sqlTemplate?: string | null; configJson?: string | null }>
): LinelistReportDefinitionConfig {

  /**
   * Build data sources array from draft columns.
   * Groups columns by their ACTUAL source table (extracted from the SQL
   * expression) so the data source list accurately reflects where each
   * column's data comes from.
   */
  const buildDataSources = (): DataSourceConfig[] => {
    const sourceMap = new Map<string, DataSourceConfig>();

    // Determine the primary data source uuid (for role assignment)
    // If no PRIMARY is set in draft, we'll assign one after building the map
    const primaryDsUuid = draft.dataSources.find(ds => ds.role === 'PRIMARY')?.uuid || '';
    let hasAssignedPrimary = !!primaryDsUuid;

    /**
     * Extract the actual source table from a column's SQL expression.
     * - Simple reference like `table`.`column`  → returns the table name
     * - Custom query (SELECT ... / contains :patientId) → returns 'custom_sql'
     * - Cannot determine → returns 'unknown'
     */
    const extractSourceTable = (sql?: string): string => {
      if (!sql) return 'unknown';
      const trimmed = sql.trim();
      // Custom SQL query (per-row subquery)
      if (/^SELECT\s/i.test(trimmed) || /:(patientId|client_id)\b/i.test(trimmed)) {
        return 'custom_sql';
      }
      // Simple table.column reference (with or without backticks)
      const match = trimmed.match(/`?(\w+)`?\.\s*`?\w+`?/);
      return match ? match[1] : 'unknown';
    };

    // Always include core OpenMRS sources if used
    const hasPersonAttributes = draft.columns.some(col =>
      col.dataDefinitionType === 'PERSON_ATTRIBUTE'
    );
    const hasIdentifiers = draft.columns.some(col =>
      col.dataDefinitionType === 'IDENTIFIER'
    );

    if (hasPersonAttributes) {
      sourceMap.set('person_attributes', {
        uuid: 'person_attributes',
        name: 'Person Attributes',
        type: 'CORE',
        role: 'REFERENCE',
      });
    }

    if (hasIdentifiers) {
      sourceMap.set('patient_identifiers', {
        uuid: 'patient_identifiers',
        name: 'Patient Identifiers',
        type: 'CORE',
        role: 'REFERENCE',
      });
    }

    // Track the first non-REFERENCE source for default PRIMARY assignment
    let firstNonReferenceSource: string | null = null;

    // Group columns by their actual source table
    draft.columns.forEach(col => {
      if (col.dataDefinitionType === 'PERSON_ATTRIBUTE' || col.dataDefinitionType === 'IDENTIFIER') {
        return; // Already handled above
      }

      // Resolve the real source table
      let table: string;
      if (col.dataDefinitionType === 'CALCULATION') {
        table = 'calculated';
      } else {
        // For SQL columns, derive the table from the SQL expression
        table = extractSourceTable(col.dataDefinitionConfig?.sql);
      }

      // The data source uuid IS the table name (accurate grouping)
      const dsUuid = table;
      const isPrimary = dsUuid === primaryDsUuid;
      const dsType = dsUuid === 'custom_sql'
        ? 'SQL'
        : dsUuid === 'calculated'
          ? 'SQL'
          : dsUuid.startsWith('mamba_') ? 'ETL' : 'SQL';

      if (!sourceMap.has(dsUuid)) {
        sourceMap.set(dsUuid, {
          uuid: dsUuid,
          name: dsUuid,
          type: dsType as DataSourceConfig['type'],
          role: isPrimary ? 'PRIMARY' : 'SECONDARY',
          columns: {},
        });
        // Track the first non-REFERENCE source for default PRIMARY assignment
        // (CORE sources like person_attributes/patient_identifiers are already handled above)
        if (!hasAssignedPrimary && !firstNonReferenceSource) {
          firstNonReferenceSource = dsUuid;
        }
      }

      const ds = sourceMap.get(dsUuid);
      if (ds && ds.columns) {
        ds.columns[col.name] = {
          name: col.name,
          type: col.source?.fieldType || 'UNKNOWN',
          sourceTable: table,
        };
      }
    });

    // If no primary was assigned and we have a non-REFERENCE source, make it PRIMARY
    if (!hasAssignedPrimary && firstNonReferenceSource) {
      const ds = sourceMap.get(firstNonReferenceSource);
      if (ds) {
        ds.role = 'PRIMARY';
        hasAssignedPrimary = true;
      }
    }

    return Array.from(sourceMap.values());
  };
  /**
   * Build population SQL from indicator rules
   */
  const buildIndicatorPopulationSql = (): string => {
    // Check both locations for indicator rules (population.indicatorRules or legacy top-level)
    const indicatorRules = draft.population.indicatorRules || draft.indicatorRules;
    if (!indicatorRules || indicatorRules.length === 0) {
      return draft.population.sqlTemplate || '';
    }

    const populationSqlParts: PopulationSqlPart[] = [];

    for (const rule of indicatorRules) {
      if (!rule.indicatorUuid || !indicators?.has(rule.indicatorUuid)) {
        continue;
      }

      const indicator = indicators.get(rule.indicatorUuid);
      const countSql = extractIndicatorSql(indicator);

      if (!countSql) {
        console.warn(`No SQL found for indicator: ${rule.name} (${rule.indicatorUuid})`);
        continue;
      }

      // Convert COUNT SQL to population SQL
      const populationSql = convertCountSqlToPopulationSql(countSql);

      if (!populationSql) {
        continue;
      }

      populationSqlParts.push({ sql: populationSql, operator: rule.logicalOperator || 'AND', negate: rule.negate });
    }

    if (populationSqlParts.length === 0) {
      return draft.population.sqlTemplate || '';
    }

    // Combine population SQL parts with AND/OR logic
    return combinePopulationSqls(populationSqlParts);
  };

  // Get the final cohort SQL based on population mode
  const getCohortSql = (): string => {
    switch (draft.populationMode) {
      case 'INDICATOR':
        return buildIndicatorPopulationSql();
      case 'HYBRID': {
        // Combine existing cohort SQL with indicator SQL
        const indicatorSql = buildIndicatorPopulationSql();
        if (indicatorSql && draft.population.sqlTemplate) {
          return `SELECT DISTINCT base.patient_id AS client_id
FROM (${draft.population.sqlTemplate}) base
INNER JOIN (${indicatorSql}) indicators ON indicators.client_id = base.patient_id`;
        }
        return indicatorSql || draft.population.sqlTemplate || '';
      }
      default:
        return draft.population.sqlTemplate || '';
    }
  };

  const finalCohortSql = getCohortSql();

  // Convert column drafts to full column definitions
  const columns: LinelistColumnDefinition[] = draft.columns
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((col) => {
      const columnDef: LinelistColumnDefinition = {
        name: col.name,
        dataDefinition: buildDataDefinition(col.dataDefinitionType, col.dataDefinitionConfig),
      };

      // Add repeat resolution if configured
      if (col.repeatResolution) {
        (columnDef as any).repeatResolution = col.repeatResolution;
      } else {
        // For SQL columns that may return multiple values, add default repeat resolution
        // if one isn't already configured. This prevents backend compilation errors.
        const isPotentiallyRepeated = col.dataDefinitionType === 'SQL' &&
          /appointment|observation|encounter|program_enrollment|visit/i.test(col.dataDefinitionConfig.sql || '');

        if (isPotentiallyRepeated) {
          // Use the SQL's ORDER BY field if present, otherwise use a default
          const sql = col.dataDefinitionConfig.sql || '';
          const orderByMatch = sql.match(/ORDER BY\s+([a-z_][a-z0-9_]*)/i);
          const orderByField = orderByMatch ? orderByMatch[1] : 'encounter_date';

          (columnDef as any).repeatResolution = {
            strategy: 'LATEST',
            orderBy: orderByField,
            restrictToPeriod: false,
            ignoreVoided: true,
          };
        }
      }

      return columnDef;
    });

  // Convert parameter drafts to full parameter definitions
  const parameters: LinelistParameter[] = (draft.parameters || [])
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((param) => ({
      name: param.name,
      label: param.label,
      type: param.type,
      required: param.required,
      ...(param.config && { config: param.config }),
    }));

  // Default to startDate/endDate if no parameters defined
  const finalParameters = parameters.length > 0
    ? parameters
    : [
        { name: 'startDate', label: 'Start Date', type: 'DATE' as const, required: true },
        { name: 'endDate', label: 'End Date', type: 'DATE' as const, required: true },
      ];

  const config: LinelistReportDefinitionConfig = {
    version: 3, // Updated to version 3 for population sources support
    type: 'LINE_LIST',
    categoryUuid: draft.categoryUuid,
    // Include both for compatibility - new code uses dataSources
    dataSourceUuid: draft.dataSources.find(ds => ds.role === 'PRIMARY')?.uuid,
    dataSources: buildDataSources(),
    rowGrain: draft.rowGrain,
    templateId: draft.templateId,
    parameters: finalParameters,
    // Preserve builder metadata in configJson so the editor can reconstruct
    // the draft (selected indicators, build method) when re-opening for edit.
    // Read indicatorRules from both the new (population) and legacy (top-level)
    // fields — the UI writes to the top-level field.
    // Derive buildMethod from whether indicators are actually present, since the
    // UI may not always keep population.buildMethod in sync.
    indicatorRules: draft.population.indicatorRules || draft.indicatorRules,
    buildMethod: ((draft.population.indicatorRules || draft.indicatorRules || []).length > 0)
      ? 'INDICATOR_BASED'
      : (draft.population.buildMethod || 'SQL_BUILDER'),
    baseCohortDefinition: {
      type: 'SQL',
      name: draft.population.buildMethod === 'INDICATOR_BASED'
        ? 'Indicator-based Patient Cohort'
        : 'Patient Cohort',
      config: {
        sql: finalCohortSql,
      },
    },
    dataSetDefinitions: [
      {
        name: draft.dataSetName || 'PATIENT_LIST',
        type: 'PATIENT_DATA_SET',
        rowFilter: {
          type: 'SQL',
          name: 'Row Filter',
          config: {
            sql: finalCohortSql,
          },
        },
        columns,
      },
    ],
  };

  // Handle sort configuration - convert to legacy format for backend compatibility
  if (draft.sortConfig && draft.sortConfig.length > 0) {
    // For now, use the first sort rule as the primary sort
    // In the future, the backend may support multiple sort rules
    const primarySort = draft.sortConfig[0];
    config.orderBy = primarySort.columnId;
    config.orderDirection = primarySort.direction;

    // Note: Multi-column sorting would require backend changes
    // For now, additional sort rules are stored but only the first is used
    if (draft.sortConfig.length > 1) {
      console.warn('Multiple sort rules defined, but only the first will be used until backend supports multi-column sorting');
    }
  }

  if (draft.limit) {
    config.limit = draft.limit;
  }

  return config;
}

/**
 * Build a data definition from type and config
 */
function buildDataDefinition(
  type: keyof LinelistDataDefinitionMap,
  config: Record<string, any>
): LinelistDataDefinition {
  switch (type) {
    case 'IDENTIFIER':
      return { type: 'IDENTIFIER', config: config as LinelistIdentifierDefinition['config'] };
    case 'PERSON_NAME':
      return { type: 'PERSON_NAME', config: config as LinelistPersonNameDefinition['config'] };
    case 'PERSON_ATTRIBUTE':
      return { type: 'PERSON_ATTRIBUTE', config: config as LinelistPersonAttributeDefinition['config'] };
    case 'CALCULATION':
      return { type: 'CALCULATION', config: config as LinelistCalculationDefinition['config'] };
    case 'SQL':
      return { type: 'SQL', config: config as LinelistSqlDefinition['config'] };
    case 'PERSON_ADDRESS':
      return { type: 'PERSON_ADDRESS', config: config as LinelistPersonAddressDefinition['config'] };
    case 'CONVERTER':
      return { type: 'CONVERTER', config: config as LinelistConverterDefinition['config'] };
    case 'OBSERVATION':
      return { type: 'OBSERVATION', config: config as LinelistObservationDefinition['config'] };
    case 'ENCOUNTER_DIAGNOSIS':
      return { type: 'ENCOUNTER_DIAGNOSIS', config: config as LinelistEncounterDiagnosisDefinition['config'] };
    default:
      // Default to SQL definition for unknown types
      return { type: 'SQL', config: { sql: config.sql || '' } };
  }
}

/**
 * Validate a linelist draft
 */
export function validateLinelistDraft(draft: LinelistReportDraft): LinelistValidationErrors {
  const errors: LinelistValidationErrors = {};

  if (!draft.name?.trim()) {
    errors.name = 'Name is required';
  }

  // Category is recommended but not required for compilation
  // if (!draft.categoryUuid?.trim()) {
  //   errors.categoryUuid = 'Category is required';
  // }

  // Validate population sources (v3 - at least one enabled source required)
  if (!draft.populationSources || draft.populationSources.length === 0) {
    errors.dataSources = 'At least one population source is required';
  } else {
    const hasEnabled = draft.populationSources.some(ps => ps.enabled);
    if (!hasEnabled) {
      errors.dataSources = 'At least one enabled population source is required';
    }
  }

  // Validate data sources for columns (v2 - at least one primary data source required)
  if (!draft.dataSources || draft.dataSources.length === 0) {
    errors.dataSources = 'At least one column data source is required';
  } else {
    const hasPrimary = draft.dataSources.some(ds => ds.role === 'PRIMARY');
    if (!hasPrimary) {
      errors.dataSources = 'A primary data source is required';
    }
  }

  if (!draft.rowGrain?.trim()) {
    errors.rowGrain = 'Row grain is required';
  }

  // Validate population SQL (v2 - in population.sqlTemplate)
  if (!draft.population.sqlTemplate?.trim()) {
    errors.population = 'Population SQL is required';
  } else {
    // Check that SQL includes the parameters defined in the report
    // Only validate parameters that are actually configured
    const requiredParams = draft.parameters
      .filter(p => p.required)
      .map(p => p.name);

    const missingParams: string[] = [];
    for (const param of requiredParams) {
      const paramPlaceholder = `:${param}`;
      if (!draft.population.sqlTemplate.includes(paramPlaceholder)) {
        missingParams.push(param);
      }
    }

    if (missingParams.length > 0) {
      errors.population = `Population SQL must include these parameters: ${missingParams.map(p => `:${p}`).join(', ')}`;
    }
  }

  if (draft.columns.length === 0) {
    errors.columns = 'At least one column is required';
  } else {
    // Validate each column
    const invalidColumns = draft.columns.filter((col) => !col.name?.trim());
    if (invalidColumns.length > 0) {
      errors.columns = 'All columns must have a display name';
    }

    // Check for unique column IDs
    const columnIds = draft.columns.map((col) => col.id);
    const uniqueIds = new Set(columnIds);
    if (columnIds.length !== uniqueIds.size) {
      errors.columns = 'Columns must have unique identifiers';
    }

    // Check for repeated fields without resolution strategy (v2 - using dataDefinitionConfig.sql)
    const repeatedColumnsWithoutResolution: string[] = [];
    draft.columns.forEach((col) => {
      // SQL columns that select from one-to-many tables might need resolution
      const isPotentiallyRepeated = col.dataDefinitionType === 'SQL' &&
        /appointment|observation|encounter|program_enrollment|visit/i.test(col.dataDefinitionConfig.sql || '');

      // Check if repeatResolution is configured
      const hasResolution = col.repeatResolution?.strategy && col.repeatResolution.strategy !== 'NONE';

      // Check if SQL already handles multiple values with LIMIT 1
      const sql = col.dataDefinitionConfig.sql || '';
      const hasLimitOne = /\bLIMIT\s+1\b/i.test(sql);

      // Collect columns that are potentially repeated and have no resolution strategy
      // and don't have LIMIT 1 in their SQL
      if (isPotentiallyRepeated && !hasResolution && !hasLimitOne) {
        repeatedColumnsWithoutResolution.push(col.name);
      }
    });

    if (repeatedColumnsWithoutResolution.length > 0) {
      errors.columns = `Columns that may return multiple values per row: ${repeatedColumnsWithoutResolution.join(', ')}. Please configure repeat resolution for each.`;
    }
  }

  // Validate sort column references
  if (draft.sortConfig && draft.sortConfig.length > 0) {
    const invalidSorts = draft.sortConfig.filter((sort) => {
      return !draft.columns.some((col) => col.id === sort.columnId);
    });

    if (invalidSorts.length > 0) {
      errors.general = 'Sort rules reference columns that are not in the report';
    }
  }

  // Check for basic SQL syntax validation (v2 - using population.sqlTemplate)
  if (draft.population.sqlTemplate?.trim()) {
    const upperSql = draft.population.sqlTemplate.toUpperCase().trim();

    // Check for SELECT statement
    if (!upperSql.includes('SELECT')) {
      errors.population = 'SQL must include a SELECT statement';
    }

    // Check for patient_id or client_id column
    if (!upperSql.includes('PATIENT_ID') && !upperSql.includes('CLIENT_ID')) {
      errors.population = 'SQL must select patient_id or client_id column';
    }

    // Recommend DISTINCT for patient grain
    if (draft.rowGrain === 'PATIENT' && !upperSql.includes('DISTINCT')) {
      // This is a warning, not an error - we could add a warnings object
      // For now, we'll add it to errors but it won't block save in draft mode
      // errors.population = 'Consider using SELECT DISTINCT to avoid duplicate patients';
    }
  }

  return errors;
}

/**
 * Check if a linelist draft is valid
 */
export function isLinelistDraftValid(draft: LinelistReportDraft): boolean {
  const errors = validateLinelistDraft(draft);
  return Object.keys(errors).length === 0;
}

/**
 * Check if a linelist draft is ready to compile
 * This includes stricter validation than draft validation
 *
 * Compiling requires:
 * - All draft validations pass
 * - No unresolved repeated fields (will be fully enforced in Task 3)
 * - SQL definitions would pass server validation (placeholder for server validation)
 */
export function isLinelistDraftReadyToCompile(draft: LinelistReportDraft): boolean {
  const errors = validateLinelistDraft(draft);
  const warnings = generateLinelistWarnings(draft);

  // Basic validation must pass
  if (Object.keys(errors).length > 0) {
    return false;
  }

  // Check for unresolved repeated fields
  const hasUnresolvedRepeatedFields = draft.columns.some((col) => {
    const isPotentiallyRepeated = col.dataDefinitionType === 'SQL' &&
      /appointment|observation|encounter|program_enrollment|visit/i.test(col.dataDefinitionConfig.sql || '');
    // Check if a valid resolution strategy is configured
    const hasValidResolution = col.repeatResolution?.strategy &&
      col.repeatResolution.strategy !== 'NONE';
    // Check if SQL already handles multiple values with LIMIT 1
    const hasLimitOne = /\bLIMIT\s+1\b/i.test(col.dataDefinitionConfig.sql || '');
    return isPotentiallyRepeated && !hasValidResolution && !hasLimitOne;
  });

  if (hasUnresolvedRepeatedFields) {
    return false;
  }

  // Check for critical performance warnings that should block compiling
  if (warnings.performance?.includes('Many SQL columns') && draft.columns.length > 20) {
    return false;
  }

  return true;
}

/**
 * @deprecated Use isLinelistDraftReadyToCompile instead
 */
export function isLinelistDraftReadyToPublish(draft: LinelistReportDraft): boolean {
  return isLinelistDraftReadyToCompile(draft);
}

/**
 * Create an empty linelist report draft with default values (v2)
 */
export function createEmptyDraft(): LinelistReportDraft {
  const now = new Date().toISOString();

  return {
    version: 3, // Updated to version 3 for population sources support
    name: '',
    description: '',
    code: '',
    currentPanel: 'basics',
    categoryUuid: '',
    rowGrain: 'PATIENT',
    templateId: '',

    // Population sources (v3 - multiple sources with join types)
    populationSources: [],

    // Data sources (v2 - array, not single)
    dataSources: [],

    // Population definition
    population: {
      baseDataSourceUuid: '',
      buildMethod: 'SQL_BUILDER',
      sqlTemplate: '',
      parameterReferences: [],
      visualFilter: {
        rootGroup: {
          id: 'root',
          logicalOperator: 'AND',
          conditions: [],
          nestedGroups: [],
        },
        useVisualBuilder: false,
      },
      buildHistory: [],
    },

    columns: [],
    // Default parameters: every linelist report uses a date range
    parameters: [
      {
        id: 'param-startDate',
        name: 'startDate',
        label: 'Start Date',
        type: 'DATE',
        required: true,
        defaultValue: '',
        displayOrder: 0,
      },
      {
        id: 'param-endDate',
        name: 'endDate',
        label: 'End Date',
        type: 'DATE',
        required: true,
        defaultValue: '',
        displayOrder: 1,
      },
    ],
    sortConfig: [],
    limit: 1000,

    displaySettings: {
      defaultPageSize: 25,
      freezeFirstColumn: true,
      freezeHeader: true,
      dateDisplayFormat: 'dd MMM yyyy',
      nullDisplayValue: '—',
      maxInteractiveRows: 500,
      maxExportRows: 100000,
      allowedExports: ['CSV', 'XLSX', 'PDF'],
      includeParametersInExportHeader: true,
      includeGeneratedTimestamp: true,
    },

    validation: {
      errors: {},
      warnings: {},
      lastValidated: now,
    },

    metadata: {
      createdAt: now,
      lastModified: now,
      buildMethod: 'NEW',
      version: 2,
      status: 'DRAFT',
    },
  };
}

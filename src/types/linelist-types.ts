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
 * Linelist report definition configuration
 * This is stored in the configJson field of a report definition
 */
export type LinelistReportDefinitionConfig = {
  version: 1;
  type: 'LINE_LIST';

  /**
   * Report metadata
   */
  categoryUuid?: string;
  themeUuid?: string;
  dataSourceUuid?: string;
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
  | LinelistConverterDefinition;

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
 */
export type LinelistPersonAddressDefinition = BaseDataDefinition<'PERSON_ADDRESS'> & {
  config: {
    type?: 'PERSON_ADDRESS' | string;
    field?: 'ADDRESS1' | 'ADDRESS2' | 'CITY_VILLAGE' | 'STATE_PROVINCE' | 'COUNTRY' | string;
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
 * Population configuration mode
 * Indicates how the cohort/patient selection is defined
 */
export type PopulationMode = 'SQL' | 'INDICATOR' | 'HYBRID';

/**
 * Draft state for linelist report builder UI
 */
export type LinelistReportDraft = {
  // Basic info
  name: string;
  description?: string;
  code?: string;

  // Current panel in the builder modal
  currentPanel: LinelistBuilderPanel;

  // Report configuration
  categoryUuid?: string; // Required - report category
  themeUuid?: string; // Required - data theme
  dataSourceUuid?: string; // Required - ETL data source
  rowGrain?: LinelistRowGrain; // Required - what one row represents
  templateId?: string; // Optional - starting template

  // Population configuration
  populationMode?: PopulationMode; // How population is defined

  // Cohort SQL (for SQL mode or as final output)
  cohortSql: string;

  // Indicator-based population rules (for INDICATOR mode)
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

  // Visual filter builder state
  visualFilter?: VisualFilterState;

  // Column definitions
  columns: LinelistColumnDraft[];

  // Parameter definitions
  parameters: LinelistParameterDraft[];

  // Dataset name (default: "PATIENT_LIST")
  dataSetName: string;

  // Sorting
  sortConfig: LinelistSortConfig[];

  // Row limit
  limit?: number;

  // Validation errors
  errors: LinelistValidationErrors;

  // Display and export settings
  displaySettings?: any;

  // Report status
  status?: 'DRAFT' | 'PUBLISHED' | 'RETIRED';

  // Unsaved changes flag
  unsavedChanges?: boolean;
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
 * Column draft for builder UI
 * Simplified version of LinelistColumnDefinition for editing
 */
export type LinelistColumnDraft = {
  id: string; // Unique ID for React keys
  name: string; // Display name
  dataDefinitionType: keyof LinelistDataDefinitionMap;
  config: Record<string, any>;
  sortOrder: number;
  repeatResolution?: LinelistRepeatResolution; // How to handle multi-value fields
  transformations?: LinelistColumnTransformation[]; // Value transformations pipeline
};

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
  dataSourceUuid?: string;
  rowGrain?: string;
  cohortSql?: string;
  columns?: string;
  general?: string;
};

/**
 * Validation warnings for linelist draft (non-blocking)
 */
export type LinelistValidationWarnings = {
  cohortSql?: string;
  columns?: string;
  performance?: string;
};

/**
 * Generate warnings for a linelist draft (non-blocking issues)
 */
export function generateLinelistWarnings(draft: LinelistReportDraft): LinelistValidationWarnings {
  const warnings: LinelistValidationWarnings = {};

  // SQL warnings
  if (draft.cohortSql?.trim()) {
    const upperSql = draft.cohortSql.toUpperCase();

    // Recommend DISTINCT for patient grain
    if (draft.rowGrain === 'PATIENT' && !upperSql.includes('DISTINCT')) {
      warnings.cohortSql = 'Consider using SELECT DISTINCT to avoid duplicate patients';
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
      return `SELECT DISTINCT ${columnRef} AS client_id ${afterSelect}`.trim();
    }
    // Extract table alias from FROM clause
    const fromPattern = /FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:AS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\b/i;
    const fromMatch = afterSelect.match(fromPattern);
    const tableAlias = fromMatch ? fromMatch[2] : 'a';
    return `SELECT DISTINCT ${tableAlias}.${columnRef} AS client_id ${afterSelect}`.trim();
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
    // Extract table alias
    const fromPattern = /FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:AS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\b/i;
    const fromMatch = afterCount.match(fromPattern);
    const tableAlias = fromMatch ? fromMatch[2] : 'a';
    return `SELECT DISTINCT ${tableAlias}.patient_id AS client_id ${afterCount}`.trim();
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
   * Build population SQL from indicator rules
   */
  const buildIndicatorPopulationSql = (): string => {
    if (!draft.indicatorRules || draft.indicatorRules.length === 0) {
      return draft.cohortSql || '';
    }

    const populationSqlParts: PopulationSqlPart[] = [];

    for (const rule of draft.indicatorRules) {
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
      return draft.cohortSql || '';
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
        if (indicatorSql && draft.cohortSql) {
          return `SELECT DISTINCT base.patient_id AS client_id
FROM (${draft.cohortSql}) base
INNER JOIN (${indicatorSql}) indicators ON indicators.client_id = base.patient_id`;
        }
        return indicatorSql || draft.cohortSql || '';
      }
      default:
        return draft.cohortSql || '';
    }
  };

  const finalCohortSql = getCohortSql();

  // Convert column drafts to full column definitions
  const columns: LinelistColumnDefinition[] = draft.columns
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((col) => {
      const columnDef: LinelistColumnDefinition = {
        name: col.name,
        dataDefinition: buildDataDefinition(col.dataDefinitionType, col.config),
      };

      // Add repeat resolution if configured
      if (col.repeatResolution) {
        (columnDef as any).repeatResolution = col.repeatResolution;
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
    version: 1,
    type: 'LINE_LIST',
    categoryUuid: draft.categoryUuid,
    themeUuid: draft.themeUuid,
    dataSourceUuid: draft.dataSourceUuid,
    rowGrain: draft.rowGrain,
    templateId: draft.templateId,
    parameters: finalParameters,
    baseCohortDefinition: {
      type: 'SQL',
      name: draft.populationMode === 'INDICATOR' ? 'Indicator-based Patient Cohort' : 'Patient Cohort',
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

  if (!draft.categoryUuid?.trim()) {
    errors.categoryUuid = 'Category is required';
  }

  if (!draft.themeUuid?.trim()) {
    errors.themeUuid = 'Data theme is required';
  }

  if (!draft.dataSourceUuid?.trim()) {
    errors.dataSourceUuid = 'Data source is required';
  }

  if (!draft.rowGrain?.trim()) {
    errors.rowGrain = 'Row grain is required';
  }

  if (!draft.cohortSql?.trim()) {
    errors.cohortSql = 'Cohort SQL is required';
  } else {
    // Check for required parameters
    if (!draft.cohortSql.includes(':startDate') || !draft.cohortSql.includes(':endDate')) {
      errors.cohortSql = 'Cohort SQL must include :startDate and :endDate parameters';
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

    // Check for repeated fields without resolution strategy
    const hasRepeatedFieldWithoutResolution = draft.columns.some((col) => {
      // SQL columns that select from one-to-many tables might need resolution
      const isPotentiallyRepeated = col.dataDefinitionType === 'SQL' &&
        /appointment|observation|encounter|program_enrollment|visit/i.test(col.config.sql || '');

      // Check if repeatResolution is configured
      const hasResolution = col.repeatResolution?.strategy && col.repeatResolution.strategy !== 'NONE';

      // Report as unresolved if potentially repeated and no resolution strategy
      return isPotentiallyRepeated && !hasResolution;
    });

    if (hasRepeatedFieldWithoutResolution) {
      errors.columns = 'Some columns may return multiple values per row. Please configure repeat resolution.';
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

  // Check for basic SQL syntax validation
  if (draft.cohortSql?.trim()) {
    const upperSql = draft.cohortSql.toUpperCase().trim();

    // Check for SELECT statement
    if (!upperSql.includes('SELECT')) {
      errors.cohortSql = 'SQL must include a SELECT statement';
    }

    // Check for patient_id or client_id column
    if (!upperSql.includes('PATIENT_ID') && !upperSql.includes('CLIENT_ID')) {
      errors.cohortSql = 'SQL must select patient_id or client_id column';
    }

    // Recommend DISTINCT for patient grain
    if (draft.rowGrain === 'PATIENT' && !upperSql.includes('DISTINCT')) {
      // This is a warning, not an error - we could add a warnings object
      // For now, we'll add it to errors but it won't block save in draft mode
      // errors.cohortSql = 'Consider using SELECT DISTINCT to avoid duplicate patients';
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
 * Check if a linelist draft is ready to publish
 * This includes stricter validation than draft validation
 *
 * Publishing requires:
 * - All draft validations pass
 * - No unresolved repeated fields (will be fully enforced in Task 3)
 * - SQL definitions would pass server validation (placeholder for server validation)
 */
export function isLinelistDraftReadyToPublish(draft: LinelistReportDraft): boolean {
  const errors = validateLinelistDraft(draft);
  const warnings = generateLinelistWarnings(draft);

  // Basic validation must pass
  if (Object.keys(errors).length > 0) {
    return false;
  }

  // Check for unresolved repeated fields
  const hasUnresolvedRepeatedFields = draft.columns.some((col) => {
    const isPotentiallyRepeated = col.dataDefinitionType === 'SQL' &&
      /appointment|observation|encounter|program_enrollment|visit/i.test(col.config.sql || '');
    // Check if a valid resolution strategy is configured
    const hasValidResolution = col.repeatResolution?.strategy &&
      col.repeatResolution.strategy !== 'NONE';
    return isPotentiallyRepeated && !hasValidResolution;
  });

  if (hasUnresolvedRepeatedFields) {
    return false;
  }

  // Check for critical performance warnings that should block publishing
  if (warnings.performance?.includes('Many SQL columns') && draft.columns.length > 20) {
    return false;
  }

  return true;
}

/**
 * Create an empty linelist report draft with default values
 */
export function createEmptyDraft(): LinelistReportDraft {
  return {
    name: '',
    description: '',
    code: '',
    currentPanel: 'basics',
    categoryUuid: '',
    themeUuid: '',
    dataSourceUuid: '',
    rowGrain: 'PATIENT',
    templateId: '',
    cohortSql: '',
    visualFilter: {
      rootGroup: {
        id: 'root',
        logicalOperator: 'AND',
        conditions: [],
      },
      useVisualBuilder: false,
    },
    columns: [],
    parameters: [],
    dataSetName: 'PATIENT_LIST',
    sortConfig: [],
    limit: undefined,
    errors: {},
    displaySettings: {
      defaultPageSize: 25,
      freezeFirstColumn: true,
      freezeHeader: true,
      dateDisplayFormat: 'dd MMM yyyy',
      nullDisplayValue: '—',
      maxInteractiveRows: 500,
      maxExportRows: 100000,
      allowedExports: ['CSV', 'XLSX'],
      includeParametersInExportHeader: true,
      includeGeneratedTimestamp: true,
    },
    status: 'DRAFT',
    unsavedChanges: false,
  };
}

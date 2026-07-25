/**
 * ETL Data Source Type Definitions
 *
 * Distinguishes between vertical (long) and horizontal (wide) ETL structures
 * and provides utilities for handling each type appropriately.
 */

/**
 * ETL structure type
 */
export type EtlStructureType = 'VERTICAL' | 'HORIZONTAL' | 'UNKNOWN';

/**
 * Vertical ETL structure - data stored in long format
 * Each row represents a single data point/observation
 * Common pattern: obs_encounter, fact tables with concept_id/value columns
 *
 * Example structure:
 * | person_id | encounter_id | obs_datetime | concept_id | value | ...
 *
 * For vertical ETLs, you need to filter by concept_id to get specific data
 */
export interface VerticalEtlStructure {
  type: 'VERTICAL';
  /**
   * Column that identifies the data point type (e.g., concept_id, question)
   */
  dataIdentifierColumn: string;

  /**
   * Column that contains the value
   */
  valueColumn: string;

  /**
   * Optional: Column that contains the value type (coded, numeric, text, etc.)
   */
  valueTypeColumn?: string;

  /**
   * Common patterns for vertical ETLs
   */
  pattern: 'OBS_ENCOUNTER' | 'FACT_OBS' | 'CUSTOM';

  /**
   * Required filters - columns that must be filtered to make sense of the data
   */
  requiredFilters?: Array<{
    column: string;
    description: string;
    exampleValues?: string[];
  }>;
}

/**
 * Horizontal ETL structure - data stored in wide format
 * Each column represents a specific data point
 * Common pattern: flattened fact tables, denormalized patient tables
 *
 * Example structure:
 * | person_id | gender | birthdate | hiv_status | art_start_date | ...
 *
 * For horizontal ETLs, columns are directly selectable
 */
export interface HorizontalEtlStructure {
  type: 'HORIZONTAL';
  /**
   * The table is a wide table where columns are data points
   */
  pattern: 'FLATTENED_FACT' | 'DENORMALIZED' | 'CUSTOM';

  /**
   * Column categories for organization
   */
  columnCategories?: Array<{
    name: string;
    prefix?: string; // Common column prefix (e.g., 'obs_' for obs_*)
    columns?: string[]; // Specific column names
  }>;
}

/**
 * ETL structure definition
 */
export type EtlStructure = VerticalEtlStructure | HorizontalEtlStructure | { type: 'UNKNOWN' };

/**
 * Data source metadata with ETL structure info
 */
export type DataSourceMetadata = {
  uuid: string;
  name: string;
  table: string;
  structure: EtlStructure;
  description?: string;
};

/**
 * Common vertical ETL patterns
 */
export const VERTICAL_ETL_PATTERNS = {
  OBS_ENCOUNTER: {
    type: 'VERTICAL' as const,
    dataIdentifierColumn: 'concept_id',
    valueColumn: 'value_numeric',
    valueTypeColumn: 'value_type',
    pattern: 'OBS_ENCOUNTER' as const,
    requiredFilters: [
      { column: 'concept_id', description: 'Observation concept ID', exampleValues: ['5089', '21', '22'] },
    ],
  },
  FACT_OBS: {
    type: 'VERTICAL' as const,
    dataIdentifierColumn: 'concept_uuid',
    valueColumn: 'value',
    valueTypeColumn: 'value_type',
    pattern: 'FACT_OBS' as const,
    requiredFilters: [
      { column: 'concept_uuid', description: 'Observation concept UUID', exampleValues: ['a8a8e18e-1355-11df-a1f1-0024e8c6f257'] },
    ],
  },
} as const;

/**
 * Common horizontal ETL patterns
 */
export const HORIZONTAL_ETL_PATTERNS = {
  FLATTENED_FACT: {
    type: 'HORIZONTAL' as const,
    pattern: 'FLATTENED_FACT' as const,
    columnCategories: [
      { name: 'Demographics', prefix: 'person_' },
      { name: 'HIV', prefix: 'hiv_' },
      { name: 'ART', prefix: 'art_' },
      { name: 'Observations', prefix: 'obs_' },
    ],
  },
  DENORMALIZED: {
    type: 'HORIZONTAL' as const,
    pattern: 'DENORMALIZED' as const,
  },
} as const;

/**
 * Detect ETL structure type from table name and columns
 */
export function detectEtlStructure(
  tableName: string,
  columns: string[]
): EtlStructure {
  const lowerTable = tableName.toLowerCase();
  const lowerColumns = columns.map((c) => c.toLowerCase());

  // Check for vertical ETL patterns
  const hasConceptId = lowerColumns.some((c) => c.includes('concept') && (c.includes('id') || c.includes('uuid')));
  const hasValueColumn = lowerColumns.some((c) => c.includes('value'));

  // Vertical patterns
  if (
    (lowerTable.includes('obs') || lowerTable.includes('encounter') || lowerTable.includes('fact')) &&
    hasConceptId &&
    hasValueColumn
  ) {
    // Determine the specific pattern
    if (lowerColumns.includes('concept_id')) {
      return {
        type: 'VERTICAL',
        dataIdentifierColumn: 'concept_id',
        valueColumn: 'value_numeric',
        valueTypeColumn: 'value_type',
        pattern: 'OBS_ENCOUNTER',
        requiredFilters: [
          { column: 'concept_id', description: 'Observation concept ID' },
        ],
      };
    }
    if (lowerColumns.includes('concept_uuid')) {
      return {
        type: 'VERTICAL',
        dataIdentifierColumn: 'concept_uuid',
        valueColumn: 'value',
        valueTypeColumn: 'value_type',
        pattern: 'FACT_OBS',
        requiredFilters: [
          { column: 'concept_uuid', description: 'Observation concept UUID' },
        ],
      };
    }
  }

  // Check for horizontal patterns
  // Horizontal tables typically have many specific column names
  // and fewer generic "identifier/value" columns
  const specificPrefixes = columns.filter((c) =>
    /^[a-z_]+_[a-z_]+/.test(c) && !c.includes('uuid') && !c.includes('id') && !c.includes('_date')
  );

  if (specificPrefixes.length > columns.length * 0.3) {
    // More than 30% of columns have specific names -> likely horizontal
    return {
      type: 'HORIZONTAL',
      pattern: 'FLATTENED_FACT',
    };
  }

  // Default to horizontal if no strong vertical indicators
  return {
    type: 'HORIZONTAL',
    pattern: 'DENORMALIZED',
  };
}

/**
 * Check if a data source requires concept/data type filtering
 */
export function requiresConceptFiltering(structure: EtlStructure): boolean {
  return structure.type === 'VERTICAL';
}

/**
 * Get the data identifier column for vertical ETLs
 */
export function getDataIdentifierColumn(structure: EtlStructure): string | null {
  if (structure.type === 'VERTICAL') {
    return structure.dataIdentifierColumn;
  }
  return null;
}

/**
 * Get columns that should be filtered for vertical ETLs
 */
export function getRequiredFilterColumns(structure: EtlStructure): string[] {
  if (structure.type === 'VERTICAL' && structure.requiredFilters) {
    return structure.requiredFilters.map((f) => f.column);
  }
  return [];
}

// src/report-builder/types/theme/data-theme.types.ts

export type MainDataDomain =
    | 'OBSERVATIONS'
    | 'TEST_ORDERS'
    | 'MEDICATION_ORDERS'
    | 'APPOINTMENTS'
    | 'MEDICATION_DISPENSE'
    | 'DIAGNOSIS';

export type FieldType = 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'coded' | 'json';

export type ThemeField = {
  key: string;
  label: string;
  expr: string;
  type: FieldType;
};

export type ConditionHandler =
    | 'CONCEPT_SEARCH'
    | 'QUESTION_ANSWER_CONCEPT_SEARCH'
    | 'TEXT'
    | 'NUMBER'
    | 'DATE_RANGE'
    | 'BOOLEAN'
    | 'LOCATION_PICKER'
    | 'CODED_LIST';

/**
 * Theme-side operator tokens (legacy + UI-friendly).
 * NOTE: SQL generation will normalize these to real SQL operators.
 */
export type ConditionOperator = 'EQUALS' | 'IN' | 'NOT_IN' | 'LIKE' | 'BETWEEN' | 'GTE' | 'LTE';

export type ConditionValueType =
    | 'conceptUuid'
    | 'conceptId'
    | 'string'
    | 'number'
    | 'date'
    | 'datetime'
    | 'boolean';

export type ThemeCondition = {
  key: string;
  label: string;
  handler: ConditionHandler;
  column: string;
  operator: ConditionOperator;
  valueType: ConditionValueType;
  /** Optional reference to which sourceTable this condition applies to. If not specified, applies to all sources. */
  source?: string;
};

export type CombinationStrategy = 'UNION_ALL' | 'UNION' | 'INTERSECTION' | 'EXCEPT' | 'CUSTOM';

/**
 * Natural language labels for combination strategies
 * These are user-friendly names that map to SQL operations
 */
export const COMBINATION_STRATEGY_LABELS: Record<CombinationStrategy, { label: string; description: string; sqlLabel: string }> = {
  UNION_ALL: {
    label: 'Combine All (Union All)',
    description: 'Combine all rows from all sources, including duplicates',
    sqlLabel: 'UNION ALL',
  },
  UNION: {
    label: 'Combine Unique (Union)',
    description: 'Combine all rows from all sources, removing duplicates',
    sqlLabel: 'UNION',
  },
  INTERSECTION: {
    label: 'Common Records (Intersection)',
    description: 'Only rows that exist in ALL sources',
    sqlLabel: 'INNER JOIN',
  },
  EXCEPT: {
    label: 'Unique to First (Except)',
    description: 'Rows from the first source that are NOT in others',
    sqlLabel: 'LEFT JOIN ... WHERE ... IS NULL',
  },
  CUSTOM: {
    label: 'Custom Joins',
    description: 'Specify custom join relationships between sources',
    sqlLabel: 'CUSTOM',
  },
};

/**
 * Custom join configuration between two sources
 */
export type SourceJoinConfig = {
  /** The source table to join from */
  fromSource: string;
  /** The source table to join to */
  toSource: string;
  /** The join type */
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  /** The join condition (e.g., 'src1.patient_id = src2.patient_id') */
  joinCondition: string;
};

export type DataThemeConfig = {
  /** Array of source tables to query. Results are combined using the specified combinationStrategy. */
  sourceTables: string[];
  /** How to combine results from multiple source tables. Default: UNION_ALL */
  combinationStrategy?: CombinationStrategy;
  /** Custom join configurations (only used when combinationStrategy is CUSTOM) */
  sourceJoins?: SourceJoinConfig[];
  patientIdColumn: string;
  dateColumn: string;
  locationColumn?: string;

  joins?: Array<{ alias: string; joinSql: string }>;
  defaultFilters?: string[];

  fields: ThemeField[];

  conditions?: ThemeCondition[];

  conditionColumns?: Record<string, string>;
};

export type DataTheme = {
  uuid?: string;
  name: string;
  description?: string;
  code: string;
  domain: MainDataDomain;
  configJson: string;
  metaJson?: string;
  retired?: boolean;
};

export type DataThemeRow = {
  uuid: string;
  name: string;
  code: string;
  domain: MainDataDomain;
  description?: string;
  retired?: boolean;
};
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
    | 'TEXT'
    | 'NUMBER'
    | 'DATE_RANGE'
    | 'BOOLEAN'
    | 'LOCATION_PICKER'
    | 'CODED_LIST';

export type ConditionOperator = 'EQUALS' | 'IN' | 'LIKE' | 'BETWEEN' | 'GTE' | 'LTE';

export type ConditionValueType =
    | 'conceptUuid'
    | 'conceptId'
    | 'string'
    | 'number'
    | 'date'
    | 'datetime'
    | 'boolean';

export type ThemeCondition = {
  /**
   * Stable identifier for the condition in UI and indicator builder.
   * Example: "concept_id"
   */
  key: string;

  /** UI label */
  label: string;

  /** Which UI widget to render in indicator builder */
  handler: ConditionHandler;

  /** Which column/expression should be filtered */
  column: string;

  /** How the filter should be applied */
  operator: ConditionOperator;

  /** What kind of value(s) the widget produces */
  valueType: ConditionValueType;
};

export type DataThemeConfig = {
  sourceTable: string;
  patientIdColumn: string;
  dateColumn: string;
  locationColumn?: string;

  joins?: Array<{ alias: string; joinSql: string }>;
  defaultFilters?: string[];

  fields: ThemeField[];

  /**
   * NEW: defines filterable conditions and which UI handler to use in indicator builder
   */
  conditions?: ThemeCondition[];

  /**
   * Legacy support (optional): older themes may still have this.
   * We’ll auto-convert it to `conditions` when loading.
   */
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
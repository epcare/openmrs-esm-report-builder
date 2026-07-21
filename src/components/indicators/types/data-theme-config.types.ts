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
};

export type DataThemeConfig = {
    sourceTable: string;
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
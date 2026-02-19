/**
 * This represents what is inside DataTheme.configJson
 * (it is stored as a JSON string in the backend).
 */

export type FieldType = 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'coded' | 'json';

export type ThemeField = {
    key: string;
    label: string;
    expr: string; // column name or SQL expression
    type: FieldType;
};

export type ConditionHandler = 'CONCEPT_SEARCH' | 'TEXT' | 'NUMBER' | 'DATE' | 'LOCATION' | 'QUESTION_ANSWER_CONCEPT_SEARCH';

export type ConditionOperator =
    | 'IN'
    | 'NOT_IN'
    | '='
    | '!='
    | '>'
    | '>='
    | '<'
    | '<='
    | 'LIKE'
    | 'BETWEEN';

export type ConditionValueType =
    | 'conceptId'
    | 'conceptUuid'
    | 'string'
    | 'number'
    | 'date'
    | 'datetime'
    | 'locationUuid';

export type ThemeCondition = {
    key: string; // stable identifier (e.g. "concept_id", "condition")
    label: string; // UI label (e.g. "Diagnosis Condition")
    handler: ConditionHandler; // drives the UI widget
    column: string; // the actual DB column in sourceTable
    columns?: {
        question: string; // the actual DB column in sourceTable
        answer: string; // the actual DB column in sourceTable
    };
    operator: ConditionOperator; // e.g. IN
    valueType: ConditionValueType; // helps indicator builder interpret values
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
     * New: conditions describe how indicator builder renders filters
     * and which source column each filter binds to.
     */
    conditions?: ThemeCondition[];

    /**
     * Legacy support (your earlier approach).
     * We'll keep it optional so older themes don't break.
     */
    conditionColumns?: Record<string, string>;
};
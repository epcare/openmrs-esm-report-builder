export type MainDataDomain = 'OBSERVATIONS' | 'TEST_ORDERS' | 'MEDICATION_ORDERS' | 'APPOINTMENTS' | 'MEDICATION_DISPENSE';

export type FieldType = 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'coded' | 'json';

export type ThemeField = {
  key: string; // stable identifier for UI + builder
  label: string; // user-friendly label
  expr: string; // SQL expression or column name
  type: FieldType;
};

export type DataThemeConfig = {
  sourceTable: string; // mamba_* table/view
  patientIdColumn: string;
  dateColumn: string;
  locationColumn?: string;

  // Optional builder parts
  joins?: Array<{ alias: string; joinSql: string }>;
  defaultFilters?: string[];

  fields: ThemeField[];
};

export type DataTheme = {
  uuid?: string;
  name: string;
  description?: string;
  code: string;

  // new: belongs to one main domain
  domain: MainDataDomain;

  // persisted as string in backend
  configJson: string;

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
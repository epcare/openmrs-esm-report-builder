// indicator-types.ts

export type DataTheme = 'DIAGNOSIS' | 'OBSERVATIONS' | 'ENCOUNTERS';
export type CountingUnit = 'Patients' | 'Encounters';

export type SelectedConcept = {
  id: number;
  uuid: string;
  display: string;

  icd10Code?: string;
  icd11Code?: string;

  conceptClass?: string;
  datatype?: string;
};

export type DiagnosisBaseConfig = {
  /**
   * ✅ Self-contained selection (survives search reset)
   * This is the source of truth for what the user picked.
   */
  selectedConcepts: SelectedConcept[];

  /**
   * ✅ Derived fields (handy for SQL + UI, can be recomputed from selectedConcepts)
   */
  conceptIds: number[];    // used in SQL: a.diagnosis_coded IN (...)
  conceptUuids: string[];  // for display/tracking
  conceptLabels: string[]; // for display/inferred name

  icd10Codes: string[]; // decision support
  icd11Codes: string[]; // decision support

  certainty: 'PROVISIONAL' | 'CONFIRMED';
  dxRanksCsv: string;

  requireNonNullBirthdate: boolean;
  requireNonNullGender: boolean;
  onlyNotVoided: boolean;
};

export type CreateBaseIndicatorPayload = {
  code: string;
  name: string;
  theme: DataTheme;
  unit: CountingUnit;

  diagnosis?: DiagnosisBaseConfig;

  sqlTemplate: string;
};
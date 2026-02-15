import React from 'react';
import { Modal, Stack } from '@carbon/react';

import BaseIndicatorBasicFields from './base-indicator-basic-fields.component';
import BaseIndicatorThemeUnitFields from './base-indicator-theme-unit-fields.component';
import DiagnosisFiltersForm from './diagnosis-filters-form.component';
import SqlPreview from './sql-preview.component';

import type { CreateBaseIndicatorPayload, DataTheme, DiagnosisBaseConfig, CountingUnit } from './types/indicator-types';
import { buildDiagnosisBaseSql } from './types/sql-builders';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBaseIndicatorPayload) => void;
};

const toCode = (name: string) =>
    name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 20);

/**
 * ✅ Base indicator should NOT carry ageCategoryCode.
 * Age categories belong to FINAL indicator creation (disaggregation).
 *
 * ✅ Diagnosis selection must be self-contained:
 * we keep the full selectedConcepts objects so selection survives search reset.
 */
const defaultDiagnosis: DiagnosisBaseConfig = {
  selectedConcepts: [],

  // derived (kept for convenience + existing builder)
  conceptIds: [],
  conceptUuids: [],
  conceptLabels: [],
  icd10Codes: [],
  icd11Codes: [],

  certainty: 'PROVISIONAL',
  dxRanksCsv: '1,2',
  requireNonNullBirthdate: true,
  requireNonNullGender: true,
  onlyNotVoided: true,
};

const CreateBaseIndicatorModal: React.FC<Props> = ({ open, onClose, onSubmit }) => {
  const [code, setCode] = React.useState('MAL_CASES');
  const [name, setName] = React.useState('Malaria Cases');
  const [theme, setTheme] = React.useState<DataTheme>('DIAGNOSIS');
  const [unit, setUnit] = React.useState<CountingUnit>('Patients');

  const [diag, setDiag] = React.useState<DiagnosisBaseConfig>(defaultDiagnosis);

  // Reset diagnosis selection each time modal opens (keeps other inputs)
  React.useEffect(() => {
    if (!open) return;

    setDiag((p) => ({
      ...p,
      selectedConcepts: [],
      conceptIds: [],
      conceptUuids: [],
      conceptLabels: [],
      icd10Codes: [],
      icd11Codes: [],
    }));
  }, [open]);

  const sqlPreview = React.useMemo(() => {
    if (theme === 'DIAGNOSIS') return buildDiagnosisBaseSql(diag);
    return '-- SQL preview for this data theme will be added next.';
  }, [theme, diag]);

  const canSubmit =
      code.trim().length > 0 &&
      name.trim().length > 0 &&
      (theme !== 'DIAGNOSIS' || diag.conceptIds.length > 0);

  const submit = () => {
    if (!canSubmit) return;

    const finalCode = code.trim() ? code.trim().toUpperCase() : toCode(name);

    const payload: CreateBaseIndicatorPayload = {
      code: finalCode,
      name: name.trim(),
      theme,
      unit,
      diagnosis: theme === 'DIAGNOSIS' ? diag : undefined,
      sqlTemplate: sqlPreview,
    };

    onSubmit(payload);
  };

  return (
      <Modal
          open={open}
          modalHeading="Create Base Indicator"
          primaryButtonText="Save Indicator"
          secondaryButtonText="Cancel"
          onRequestClose={onClose}
          onRequestSubmit={submit}
          primaryButtonDisabled={!canSubmit}
      >
        <Stack gap={5}>
          <BaseIndicatorBasicFields code={code} name={name} onChangeCode={setCode} onChangeName={setName} />

          <BaseIndicatorThemeUnitFields
              theme={theme}
              unit={unit}
              onChangeTheme={setTheme}
              onChangeUnit={setUnit}
          />

          {theme === 'DIAGNOSIS' ? <DiagnosisFiltersForm value={diag} onChange={setDiag} /> : null}

          <SqlPreview value={sqlPreview} />
        </Stack>
      </Modal>
  );
};

export default CreateBaseIndicatorModal;
export type { CreateBaseIndicatorPayload };
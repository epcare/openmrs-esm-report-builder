/*
import React from 'react';
import { Select, SelectItem, TextInput } from '@carbon/react';

import type { CountingUnit, DataTheme } from './types/indicator-types';

type Props = {
  theme: DataTheme;
  unit: CountingUnit;

  onChangeTheme: (next: DataTheme) => void;
  onChangeUnit: (next: CountingUnit) => void;
};

export default function BaseIndicatorThemeUnitFields({ theme, unit, onChangeTheme, onChangeUnit }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
      <Select
        id="base-theme"
        labelText="Data theme"
        value={theme}
        onChange={(e) => onChangeTheme((e.target as HTMLSelectElement).value as DataTheme)}
      >
        <SelectItem value="DIAGNOSIS" text="Diagnosis Data" />
        <SelectItem value="OBSERVATIONS" text="Observations (coming soon)" />
        <SelectItem value="ENCOUNTERS" text="Encounters (coming soon)" />
      </Select>

      {/!* keeping this as TextInput allows future custom units, but we still type it as Patients/Encounters for now *!/}
      <TextInput
        id="base-unit"
        labelText="Unit"
        value={unit}
        onChange={(e) => onChangeUnit(((e.target as HTMLInputElement).value as CountingUnit) || 'Patients')}
      />
    </div>
  );
}
*/

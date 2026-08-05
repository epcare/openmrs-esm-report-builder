/**
 * Number Parameter Input Component
 *
 * Handles NUMBER parameter inputs with NumberInput.
 */

import React from 'react';
import { NumberInput } from '@carbon/react';

import type { LinelistParameter } from '../../types/linelist-types';

type Props = {
  parameter: LinelistParameter;
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

const NumberParameterInput: React.FC<Props> = ({ parameter, value, error, onChange }) => {
  const config = parameter.config as any;

  return (
    <NumberInput
      id={`report-param-${parameter.name}`}
      label={parameter.label}
      value={value}
      onChange={(event) => {
        onChange((event.target as HTMLInputElement).value);
      }}
      invalid={!!error}
      invalidText={error}
      min={config?.min}
      max={config?.max}
      step={config?.step}
      size="sm"
    />
  );
};

export default NumberParameterInput;

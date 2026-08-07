/**
 * Boolean Parameter Input Component
 *
 * Handles BOOLEAN parameter inputs with Toggle.
 */

import React from 'react';
import { Toggle } from '@carbon/react';

import type { LinelistParameter } from '../../../types/linelist-types';

type Props = {
  parameter: LinelistParameter;
  value: any;
  onChange: (value: boolean) => void;
};

const BooleanParameterInput: React.FC<Props> = ({ parameter, value, onChange }) => {
  const config = parameter.config as any;

  return (
    <Toggle
      id={`report-param-${parameter.name}`}
      labelA={config?.falseLabel || 'No'}
      labelB={config?.trueLabel || 'Yes'}
      toggled={value === true || value === 'true'}
      onToggle={(toggled) => {
        onChange(toggled);
      }}
    />
  );
};

export default BooleanParameterInput;

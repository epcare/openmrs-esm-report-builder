/**
 * Text Parameter Input Component
 *
 * Handles TEXT parameter inputs with TextInput.
 */

import React, { useCallback } from 'react';
import { TextInput } from '@carbon/react';

import type { LinelistParameter } from '../../types/linelist-types';

type Props = {
  parameter: LinelistParameter;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onError?: (error: string | undefined) => void;
};

const TextParameterInput: React.FC<Props> = ({ parameter, value, error, onChange, onError }) => {
  const config = parameter.config as any;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Validate min/max length if configured
    if (config?.minLength && newValue.length < config.minLength) {
      onError?.(`Minimum ${config.minLength} characters required`);
    } else if (config?.maxLength && newValue.length > config.maxLength) {
      onError?.(`Maximum ${config.maxLength} characters allowed`);
    } else if (config?.pattern && !new RegExp(config.pattern).test(newValue)) {
      onError?.('Invalid format');
    } else {
      onError?.(undefined);
      onChange(newValue);
    }
  }, [config, onChange, onError]);

  return (
    <TextInput
      id={`report-param-${parameter.name}`}
      labelText={parameter.label}
      value={value}
      onChange={handleChange}
      invalid={!!error}
      invalidText={error}
      placeholder={parameter.label}
      size="sm"
    />
  );
};

export default TextParameterInput;

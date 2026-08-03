/**
 * Date Parameter Input Component
 *
 * Handles DATE and DATETIME parameter inputs with DatePicker.
 */

import React from 'react';
import { DatePicker, DatePickerInput } from '@carbon/react';

import type { LinelistParameter } from '../../../types/linelist-types';

type Props = {
  parameter: LinelistParameter;
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

const DateParameterInput: React.FC<Props> = ({ parameter, value, error, onChange }) => {
  const config = parameter.config as any;

  // Parse the date value for the DatePicker
  const getDatePickerValue = (): Date | null => {
    if (!value) return null;
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const handleDateChange = (date: Date | Array<Date>) => {
    if (!date) {
      onChange('');
      return;
    }

    const dateObj = Array.isArray(date) ? date[0] : date;
    if (dateObj && !isNaN(dateObj.getTime())) {
      const dateStr = dateObj.toISOString().split('T')[0];
      onChange(dateStr);
    }
  };

  return (
    <DatePicker
      dateFormat="Y-m-d"
      datePickerType="single"
      minDate={config?.minDate ? new Date(config.minDate) : undefined}
      maxDate={config?.maxDate ? new Date(config.maxDate) : undefined}
      value={getDatePickerValue()}
      onChange={handleDateChange}
    >
      <DatePickerInput
        id={`report-param-${parameter.name}-input`}
        labelText={parameter.label}
        placeholder={parameter.label}
        invalid={!!error}
        invalidText={error}
        size="sm"
      />
    </DatePicker>
  );
};

export default DateParameterInput;

/**
 * Date Parameter Input Component
 *
 * Handles DATE and DATETIME parameter inputs with DatePicker.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const [internalValue, setInternalValue] = useState<Date | null>(null);
  const isUpdatingFromRef = useRef(false);

  // Parse the date value for the DatePicker - memoized to prevent re-render loops
  const parsedDate = useMemo((): Date | null => {
    if (!value) return null;
    // Parse the date string (YYYY-MM-DD format) as local time, not UTC
    const parts = value.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      if (year && month !== undefined && day !== undefined && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    return null;
  }, [value]);

  // Sync internal value with prop value when it changes from outside
  useEffect(() => {
    console.log('DateParameterInput useEffect - syncing from parent:', {
      parameterName: parameter.name,
      parsedDate,
      internalValue,
      isUpdatingFromRef: isUpdatingFromRef.current,
      value
    });

    if (!isUpdatingFromRef.current) {
      setInternalValue(parsedDate);
    }
    isUpdatingFromRef.current = false;
  }, [parsedDate]);

  const handleDateChange = (date: Date | Array<Date>) => {
    console.log('DateParameterInput handleDateChange called:', {
      date,
      parameterName: parameter.name,
      currentValue: value,
      internalValue,
      isUpdatingFromRef: isUpdatingFromRef.current
    });

    if (!date) {
      isUpdatingFromRef.current = true;
      setInternalValue(null);
      onChange('');
      return;
    }

    const dateObj = Array.isArray(date) ? date[0] : date;
    if (dateObj && !isNaN(dateObj.getTime())) {
      isUpdatingFromRef.current = true;
      setInternalValue(dateObj);

      // Format as YYYY-MM-DD using local time (not UTC)
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      console.log('Calling onChange with:', dateStr);
      onChange(dateStr);
    }
  };

  return (
    <DatePicker
      dateFormat="Y-m-d"
      datePickerType="single"
      minDate={config?.minDate ? new Date(config.minDate) : undefined}
      maxDate={config?.maxDate ? new Date(config.maxDate) : undefined}
      value={internalValue}
      onChange={handleDateChange}
    >
      <DatePickerInput
        id={`${parameter.name}-input`}
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

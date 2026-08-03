/**
 * Date Range Input Component
 *
 * Allows users to select a date using either:
 * - FIXED mode: A specific date from a date picker
 * - RELATIVE mode: A predefined relative period (Today, This Month, etc.)
 */

import React, { useEffect, useState } from 'react';
import {
  DatePicker,
  DatePickerInput,
  Select,
  SelectItem,
  RadioButtonGroup,
  RadioButton,
  InlineNotification,
} from '@carbon/react';

import type { RelativePeriod } from '../../../utils/parameter-resolution';
import {
  RELATIVE_PERIOD_OPTIONS,
  formatDate,
  formatDisplayDate,
  parseDate,
  resolveRelativePeriod,
} from '../../../utils/parameter-resolution';
import './date-range-input.component.scss';

export type DateRangeValue = {
  mode: 'FIXED' | 'RELATIVE';
  fixedDate?: string;        // YYYY-MM-DD format for FIXED mode
  relativePeriod?: RelativePeriod;  // Period identifier for RELATIVE mode
};

type Props = {
  id?: string;
  label: string;
  value?: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  required?: boolean;
  disabled?: boolean;
  minDate?: string;  // Minimum allowed date (YYYY-MM-DD)
  maxDate?: string;  // Maximum allowed date (YYYY-MM-DD)
  includeTime?: boolean;  // Whether to include time component
  invalid?: boolean;
  invalidText?: string;
  hideLabel?: boolean;
  showResolvedDate?: boolean;  // Show the resolved date for relative periods
};

const DateRangeInput: React.FC<Props> = ({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  minDate,
  maxDate,
  includeTime = false,
  invalid = false,
  invalidText,
  hideLabel = false,
  showResolvedDate = true,
}) => {
  // Internal state for mode toggle
  const [mode, setMode] = useState<'FIXED' | 'RELATIVE'>(
    value?.mode || 'FIXED'
  );

  // Sync internal mode with value changes
  useEffect(() => {
    if (value?.mode) {
      setMode(value.mode);
    }
  }, [value?.mode]);

  const handleModeChange = (newMode: 'FIXED' | 'RELATIVE') => {
    setMode(newMode);

    // Clear the value when switching modes
    if (newMode === 'FIXED') {
      onChange({ mode: 'FIXED', fixedDate: undefined });
    } else {
      onChange({ mode: 'RELATIVE', relativePeriod: undefined });
    }
  };

  const handleFixedDateChange = (date: Array<Date>) => {
    if (date && date.length > 0) {
      const dateValue = date[0];
      const formattedDate = formatDate(dateValue);
      onChange({ mode: 'FIXED', fixedDate: formattedDate });
    }
  };

  const handleRelativePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const period = e.target.value as RelativePeriod;
    onChange({ mode: 'RELATIVE', relativePeriod: period });
  };

  // Calculate the resolved date for relative periods (for display)
  const getResolvedDateDisplay = (): string => {
    if (value?.mode === 'RELATIVE' && value.relativePeriod) {
      try {
        const { start, end } = resolveRelativePeriod(value.relativePeriod);
        const startDate = formatDisplayDate(start);
        const endDate = formatDisplayDate(end);

        if (startDate === endDate) {
          return `(${startDate})`;
        }
        return `(${startDate} - ${endDate})`;
      } catch {
        return '(Invalid period)';
      }
    }
    return '';
  };

  // Parse the fixed date for the DatePicker
  const getFixedDateValue = (): Date | null => {
    if (value?.mode === 'FIXED' && value.fixedDate) {
      return parseDate(value.fixedDate);
    }
    return null;
  };

  const requiredText = required ? ' *' : '';
  const resolvedDateDisplay = getResolvedDateDisplay();

  return (
    <div className="date-range-input">
      {/* Label */}
      {!hideLabel && (
        <label className="cds--label">
          {label}{requiredText}
        </label>
      )}

      {/* Mode Toggle */}
      <RadioButtonGroup
        legendText=""
        name={`${id}-mode`}
        valueSelected={mode}
        onChange={(newMode) => handleModeChange(newMode as 'FIXED' | 'RELATIVE')}
        disabled={disabled}
      >
        <RadioButton
          id={`${id}-fixed`}
          labelText="Specific date"
          value="FIXED"
        />
        <RadioButton
          id={`${id}-relative`}
          labelText="Relative period"
          value="RELATIVE"
        />
      </RadioButtonGroup>

      {/* Fixed Date Picker */}
      {mode === 'FIXED' && (
        <DatePicker
          datePickerType="single"
          value={getFixedDateValue()}
          onChange={handleFixedDateChange}
          minDate={minDate ? parseDate(minDate) || undefined : undefined}
          maxDate={maxDate ? parseDate(maxDate) || undefined : undefined}
        >
          <DatePickerInput
            id={`${id}-date-input`}
            placeholder={includeTime ? 'dd/mm/yyyy hh:mm' : 'dd/mm/yyyy'}
            labelText=""
            invalid={invalid}
            invalidText={invalidText}
            disabled={disabled}
          />
        </DatePicker>
      )}

      {/* Relative Period Selector */}
      {mode === 'RELATIVE' && (
        <Select
          id={`${id}-period-select`}
          value={value?.relativePeriod || ''}
          onChange={handleRelativePeriodChange}
          invalid={invalid}
          invalidText={invalidText}
          disabled={disabled}
        >
          <SelectItem value="" text="Select period" />
          {RELATIVE_PERIOD_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              text={option.label}
            />
          ))}
        </Select>
      )}

      {/* Resolved Date Display (for relative periods) */}
      {showResolvedDate && mode === 'RELATIVE' && resolvedDateDisplay && (
        <div style={{
          fontSize: '12px',
          color: '#666',
          marginTop: '4px',
          fontStyle: 'italic'
        }}>
          Resolves to: {resolvedDateDisplay}
        </div>
      )}

      {/* Validation Notification */}
      {invalid && invalidText && (
        <InlineNotification
          kind="error"
          title="Invalid date"
          subtitle={invalidText}
          lowContrast
        />
      )}
    </div>
  );
};

export default DateRangeInput;

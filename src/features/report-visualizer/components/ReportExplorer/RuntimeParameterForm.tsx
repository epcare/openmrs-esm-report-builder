/**
 * Runtime Parameter Form Component
 *
 * Renders runtime parameters for the selected report.
 * Uses existing parameter input components for each parameter type.
 *
 * Phase 2.5: Parameter inputs
 */
import React, { useState, useMemo } from 'react';
import { Button, RadioButtonGroup, RadioButton, Select, SelectItem } from '@carbon/react';
import { Renew } from '@carbon/react/icons';

import type { LinelistParameter } from '../../../../types/linelist-types';
import {
  RELATIVE_PERIOD_OPTIONS,
  type RelativePeriod,
  resolveRelativePeriod,
  formatDate,
} from '../../../../utils/parameter-resolution';

// Import existing parameter input components
import DateParameterInput from '../../../../components/data-visualizer/parameter-inputs/date-parameter-input.component';
import NumberParameterInput from '../../../../components/data-visualizer/parameter-inputs/number-parameter-input.component';
import BooleanParameterInput from '../../../../components/data-visualizer/parameter-inputs/boolean-parameter-input.component';
import ListParameterInput from '../../../../components/data-visualizer/parameter-inputs/list-parameter-input.component';
import LocationParameterInput from '../../../../components/data-visualizer/parameter-inputs/location-parameter-input.component';
import ConceptParameterInput from '../../../../components/data-visualizer/parameter-inputs/concept-parameter-input.component';
import IdentifierTypeParameterInput from '../../../../components/data-visualizer/parameter-inputs/identifier-type-parameter-input.component';
import PersonAttributeParameterInput from '../../../../components/data-visualizer/parameter-inputs/person-attribute-parameter-input.component';
import TextParameterInput from '../../../../components/data-visualizer/parameter-inputs/text-parameter-input.component';

interface RuntimeParameterFormProps {
  parameters: LinelistParameter[];
  values: Record<string, any>;
  errors: Record<string, string>;
  onChange: (values: Record<string, any>) => void;
  onReset: () => void;
  disabled?: boolean;
}

type DateMode = 'FIXED' | 'RELATIVE';

const RuntimeParameterForm: React.FC<RuntimeParameterFormProps> = ({
  parameters,
  values,
  errors,
  onChange,
  onReset,
  disabled,
}) => {
  // Date mode state (FIXED or RELATIVE)
  const [dateMode, setDateMode] = useState<DateMode>('FIXED');
  const [relativePeriod, setRelativePeriod] = useState<RelativePeriod | undefined>(undefined);

  // Get date parameters
  const dateParameters = useMemo(() => {
    return parameters.filter(p => p.type === 'DATE' || p.type === 'DATETIME');
  }, [parameters]);

  // Check if report has both startDate and endDate for relative period support
  const supportsRelativePeriod = useMemo(() => {
    return dateParameters.some(p =>
      p.name.toLowerCase() === 'startdate' || p.name.toLowerCase() === 'start_date'
    ) && dateParameters.some(p =>
      p.name.toLowerCase() === 'enddate' || p.name.toLowerCase() === 'end_date'
    );
  }, [dateParameters]);

  // Handle date mode change
  const handleDateModeChange = (mode: DateMode) => {
    setDateMode(mode);
    if (mode === 'FIXED') {
      setRelativePeriod(undefined);
    }
  };

  // Handle relative period change - resolve to actual dates
  const handleRelativePeriodChange = (period: RelativePeriod) => {
    setRelativePeriod(period);

    if (period && supportsRelativePeriod) {
      // Resolve the relative period to actual dates
      const { start, end } = resolveRelativePeriod(period);

      // Update the date parameter values
      const newValues = { ...values };
      dateParameters.forEach((param, index) => {
        if (index === 0) {
          // First date parameter = start date
          newValues[param.name] = formatDate(start);
        } else if (index === 1) {
          // Second date parameter = end date
          newValues[param.name] = formatDate(end);
        }
      });

      onChange(newValues);
    }
  };

  // Handle parameter value change
  const handleValueChange = (paramName: string, newValue: any) => {
    onChange({
      ...values,
      [paramName]: newValue,
    });
  };

  // Render the appropriate input component based on parameter type
  const renderParameterInput = (param: LinelistParameter) => {
    const value = values[param.name] || '';
    const error = errors[param.name];

    const commonProps = {
      parameter: param,
      value,
      error,
      onChange: (newValue: any) => handleValueChange(param.name, newValue),
    };

    switch (param.type) {
      case 'DATE':
      case 'DATETIME':
        return <DateParameterInput key={param.name} {...commonProps} />;

      case 'NUMBER':
        return <NumberParameterInput key={param.name} {...commonProps} />;

      case 'BOOLEAN':
        return <BooleanParameterInput key={param.name} {...commonProps} />;

      case 'LIST':
        return <ListParameterInput key={param.name} {...commonProps} />;

      case 'LOCATION':
        return <LocationParameterInput key={param.name} {...commonProps} />;

      case 'CONCEPT':
        return <ConceptParameterInput key={param.name} {...commonProps} />;

      case 'IDENTIFIER_TYPE':
        return <IdentifierTypeParameterInput key={param.name} {...commonProps} />;

      case 'PERSON_ATTRIBUTE':
        return <PersonAttributeParameterInput key={param.name} {...commonProps} />;

      case 'PROVIDER':
      case 'PROGRAM':
      case 'CODED_VALUE':
        // For now, treat these as text inputs
        // TODO: Create dedicated input components for these types
        return <TextParameterInput key={param.name} {...commonProps} />;

      case 'TEXT':
      default:
        return <TextParameterInput key={param.name} {...commonProps} />;
    }
  };

  if (parameters.length === 0) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
        <p>Select a report to see its parameters</p>
      </div>
    );
  }

  return (
    <div>
      {/* Section header with reset button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
          Available filters
        </h4>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={Renew}
          onClick={onReset}
          disabled={disabled}
          hasIconOnly
          iconDescription="Reset filters"
        >
          Reset
        </Button>
      </div>

      {/* Date Mode Toggle - shown if report has date parameters */}
      {dateParameters.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <label className="cds--label" style={{ fontSize: '0.75rem', fontWeight: 400, color: '#525252' }}>
            Date Selection Mode
          </label>
          <RadioButtonGroup
            legendText=""
            name="date-mode"
            valueSelected={dateMode}
            onChange={(mode) => handleDateModeChange(mode as DateMode)}
          >
            <RadioButton
              id="date-mode-fixed"
              labelText="Specific dates"
              value="FIXED"
            />
            <RadioButton
              id="date-mode-relative"
              labelText="Relative period"
              value="RELATIVE"
            />
          </RadioButtonGroup>
        </div>
      )}

      {/* Relative Period Selector - shown in RELATIVE mode */}
      {dateMode === 'RELATIVE' && supportsRelativePeriod && (
        <div style={{ marginBottom: '0.75rem' }}>
          <Select
            id="relative-period-select"
            labelText="Select reporting period"
            value={relativePeriod}
            onChange={(e) => handleRelativePeriodChange(e.target.value as RelativePeriod)}
            size="sm"
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
        </div>
      )}

      {/* Parameter inputs - more compact spacing */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {parameters.map((param) => {
          // Skip start/end date parameters in RELATIVE mode (they're set by relative period selection)
          if (dateMode === 'RELATIVE' && supportsRelativePeriod) {
            const isStartDate = param.name.toLowerCase() === 'startdate' || param.name.toLowerCase() === 'start_date';
            const isEndDate = param.name.toLowerCase() === 'enddate' || param.name.toLowerCase() === 'end_date';
            if ((param.type === 'DATE' || param.type === 'DATETIME') && (isStartDate || isEndDate)) {
              return null; // Hide individual date inputs in RELATIVE mode
            }
          }

          return (
            <div key={param.name} style={{ marginBottom: 0 }}>
              {renderParameterInput(param)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RuntimeParameterForm;

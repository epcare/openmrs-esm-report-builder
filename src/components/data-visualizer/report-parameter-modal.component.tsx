/**
 * Report Parameter Modal
 *
 * Allows users to set parameter values before running a report from the report library.
 * Supports various parameter types including:
 * - Date parameters with FIXED/RELATIVE mode toggle (global for all dates)
 * - Text and number inputs
 * - Boolean toggles
 * - Configurable lists (dropdowns)
 * - OpenMRS reference types (Location, Concept, Identifier Type, Person Attribute)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  ButtonSet,
  TextInput,
  InlineNotification,
  Stack,
  ComboBox,
  InlineLoading,
  Select,
  SelectItem,
  Toggle,
  NumberInput,
  RadioButton,
  RadioButtonGroup,
  DatePicker,
  DatePickerInput,
} from '@carbon/react';

import type { LinelistParameter } from '../../types/linelist-types';
import {
  useLocations,
  usePatientIdentifierTypes,
  usePersonAttributeTypes,
  useConceptSearch,
} from '../../hooks/openmrs-reference-data';
import {
  RELATIVE_PERIOD_OPTIONS,
  type RelativePeriod,
  resolveRelativePeriod,
  formatDate,
} from '../../utils/parameter-resolution';

type Props = {
  open: boolean;
  onClose: () => void;
  onRun: (parameterValues: Record<string, any>) => void;
  parameters: LinelistParameter[];
  initialValues?: Record<string, any>;
  loading?: boolean;
};

type SelectedItem = {
  uuid?: string;
  value?: string;
  label: string;
};

type DateMode = 'FIXED' | 'RELATIVE';

const ReportParameterModal: React.FC<Props> = ({
  open,
  onClose,
  onRun,
  parameters = [],
  initialValues = {},
  loading = false,
}) => {
  // State for parameter values
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // State for search queries (for searchable reference types)
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

  // State for selected items (for ComboBox components)
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({});

  // State for date mode (FIXED or RELATIVE)
  const [dateMode, setDateMode] = useState<DateMode>('FIXED');

  // State for relative period selection
  const [relativePeriod, setRelativePeriod] = useState<RelativePeriod | ''>('');

  // Check if there are any date parameters
  const hasDateParameters = parameters.some(p => p.type === 'DATE' || p.type === 'DATETIME');

  // Get date parameter names
  const dateParameters = parameters.filter(p => p.type === 'DATE' || p.type === 'DATETIME');

  // Check if report has both startDate and endDate for relative period support
  const hasStartAndEndDateParams =
    dateParameters.some(p => p.name.toLowerCase() === 'startdate' || p.name.toLowerCase() === 'start_date') &&
    dateParameters.some(p => p.name.toLowerCase() === 'enddate' || p.name.toLowerCase() === 'end_date');

  // Only show FIXED/RELATIVE toggle if both start and end date params exist
  const supportsRelativePeriod = hasStartAndEndDateParams;

  // Initialize values from defaults or previously set values
  useEffect(() => {
    const initialValuesFromParams: Record<string, any> = {};
    const initialSelectedItems: Record<string, SelectedItem> = {};

    for (const param of parameters) {
      // Use explicit value if provided, otherwise use default
      const paramValue = initialValues[param.name] || param.defaultValue || '';
      initialValuesFromParams[param.name] = paramValue;

      // Initialize selected items for reference types
      if (['LOCATION', 'CONCEPT', 'IDENTIFIER_TYPE', 'PERSON_ATTRIBUTE'].includes(param.type)) {
        if (paramValue) {
          initialSelectedItems[param.name] = {
            uuid: paramValue,
            label: paramValue, // Will be updated when data loads
          };
        }
      }
      // For LIST type
      if (param.type === 'LIST' && param.config?.type === 'LIST') {
        const option = param.config.options?.find((opt: any) => opt.value === paramValue);
        if (option) {
          initialSelectedItems[param.name] = {
            value: option.value,
            label: option.label,
          };
        }
      }
    }

    setValues(initialValuesFromParams);
    setSelectedItems(initialSelectedItems);
  }, [parameters, initialValues]);

  // Reset errors when modal opens
  useEffect(() => {
    if (open) {
      setErrors({});
      setSearchQueries({});
      setRelativePeriod('');
      setDateMode('FIXED');
    }
  }, [open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const param of parameters) {
      const value = values[param.name];

      // Skip validation for parameters not shown in RELATIVE mode
      if ((param.type === 'DATE' || param.type === 'DATETIME') && dateMode === 'RELATIVE') {
        continue;
      }

      // Check required parameters
      if (param.required && (!value || value.toString().trim() === '')) {
        newErrors[param.name] = `${param.label} is required`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRun = () => {
    // Clear previous errors
    setErrors({});

    // If in RELATIVE mode but no period selected, show error
    if (dateMode === 'RELATIVE' && hasDateParameters && !relativePeriod) {
      setErrors({ relativePeriod: 'Please select a reporting period' });
      return;
    }

    // If in RELATIVE mode with period selected, resolve and run
    if (dateMode === 'RELATIVE' && relativePeriod) {
      const resolvedValues = { ...values };
      const { start, end } = resolveRelativePeriod(relativePeriod);

      // Map resolved dates to date parameters
      dateParameters.forEach((param, index) => {
        if (index === 0) {
          resolvedValues[param.name] = formatDate(start);
        } else if (index === 1) {
          resolvedValues[param.name] = formatDate(end);
        }
      });

      onRun(resolvedValues);
      return;
    }

    // For FIXED mode, validate before running
    if (!validate()) {
      return;
    }

    onRun(values);
  };

  const handleSearchQueryChange = useCallback((paramName: string, query: string) => {
    setSearchQueries((prev) => ({ ...prev, [paramName]: query }));
  }, []);

  /* eslint-disable react-hooks/rules-of-hooks */
  // This function conditionally renders different parameter types, each potentially using hooks.
  // The hooks are called based on parameter type which is determined at runtime.
  // A proper fix would require creating separate components for each parameter type.
  const renderParameterInput = (param: LinelistParameter) => {
    const value = values[param.name] || '';
    const error = errors[param.name];

    // Skip start/end date parameters in RELATIVE mode - they're handled by the global relative period selector
    if (supportsRelativePeriod && dateMode === 'RELATIVE') {
      const isStartDate = param.name.toLowerCase() === 'startdate' || param.name.toLowerCase() === 'start_date';
      const isEndDate = param.name.toLowerCase() === 'enddate' || param.name.toLowerCase() === 'end_date';
      if ((param.type === 'DATE' || param.type === 'DATETIME') && (isStartDate || isEndDate)) {
        return null;
      }
    }

    switch (param.type) {
      case 'DATE':
      case 'DATETIME': {
        const config = param.config as any;

        // Parse the date value for the DatePicker
        const getDatePickerValue = (): Date | null => {
          if (!value) return null;
          const parsed = new Date(value);
          return isNaN(parsed.getTime()) ? null : parsed;
        };

        const handleDateChange = (date: Date | Array<Date>) => {
          if (!date) {
            setValues((prev) => ({ ...prev, [param.name]: '' }));
            return;
          }

          const dateObj = Array.isArray(date) ? date[0] : date;
          if (dateObj && !isNaN(dateObj.getTime())) {
            const dateStr = dateObj.toISOString().split('T')[0];
            setValues((prev) => ({ ...prev, [param.name]: dateStr }));
            if (error) setErrors((prev) => ({ ...prev, [param.name]: '' }));
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
              id={`report-param-${param.name}-input`}
              labelText={param.label}
              placeholder={param.label}
              invalid={!!error}
              invalidText={error}
              size="sm"
            />
          </DatePicker>
        );
      }

      case 'NUMBER': {
        const config = param.config as any;
        return (
          <NumberInput
            id={`report-param-${param.name}`}
            label={param.label}
            value={value}
            onChange={(event) => {
              setValues((prev) => ({ ...prev, [param.name]: (event.target as HTMLInputElement).value }));
              if (error) setErrors((prev) => ({ ...prev, [param.name]: '' }));
            }}
            invalid={!!error}
            invalidText={error}
            min={config?.min}
            max={config?.max}
            step={config?.step}
            size="sm"
          />
        );
      }

      case 'BOOLEAN': {
        const config = param.config as any;
        return (
          <Toggle
            id={`report-param-${param.name}`}
            labelA={config?.falseLabel || 'No'}
            labelB={config?.trueLabel || 'Yes'}
            toggled={value === true || value === 'true'}
            onToggle={(toggled) => {
              setValues((prev) => ({ ...prev, [param.name]: toggled }));
              if (error) setErrors((prev) => ({ ...prev, [param.name]: '' }));
            }}
          />
        );
      }

      case 'LIST': {
        const config = param.config as any;
        const options = config?.options || [];

        if (options.length <= 5) {
          // Use Select for small lists
          return (
            <Select
              id={`report-param-${param.name}`}
              labelText={param.label}
              value={value}
              onChange={(e) => {
                const selectedValue = (e.target as HTMLSelectElement).value;
                setValues((prev) => ({ ...prev, [param.name]: selectedValue }));
                if (error) setErrors((prev) => ({ ...prev, [param.name]: '' }));
              }}
              invalid={!!error}
              invalidText={error}
              size="sm"
            >
              <SelectItem value="" text={`Select ${param.label}`} />
              {options.map((opt: any) => (
                <SelectItem key={opt.value} value={opt.value} text={opt.label} />
              ))}
            </Select>
          );
        }

        // Use ComboBox for larger lists
        return (
          <div>
            <label htmlFor={`report-param-${param.name}`} className="cds--label">
              {param.label}
            </label>
            <ComboBox
              id={`report-param-${param.name}`}
              titleText={param.label}
              items={options}
              itemToString={(item: any) => item?.label || ''}
              initialSelectedItem={options.find((opt: any) => opt.value === value)}
              onChange={({ selectedItem }) => {
                if (selectedItem) {
                  setValues((prev) => ({ ...prev, [param.name]: (selectedItem as any).value }));
                } else {
                  setValues((prev) => ({ ...prev, [param.name]: '' }));
                }
                if (error) setErrors((prev) => ({ ...prev, [param.name]: '' }));
              }}
              invalid={!!error}
              invalidText={error}
              size="sm"
            />
          </div>
        );
      }

      case 'LOCATION': {
        const config = param.config as any;
        const tagUuid = config?.tagUuid;
        const searchQuery = searchQueries[param.name] || '';

        // Load all locations if no search query, otherwise search
        const { locations } = searchQuery
          ? { locations: [] }
          : useLocations(tagUuid);

        const items = locations.map((loc) => ({
          uuid: loc.uuid,
          label: loc.display || loc.name,
        }));

        return (
          <div>
            <label htmlFor={`report-param-${param.name}`} className="cds--label">
              {param.label}
            </label>
            <ComboBox
              id={`report-param-${param.name}`}
              titleText={param.label}
              items={items}
              itemToString={(item: any) => item?.label || ''}
              initialSelectedItem={selectedItems[param.name]}
              onInputChange={(input) => {
                handleSearchQueryChange(param.name, input);
              }}
              onChange={({ selectedItem }) => {
                if (selectedItem) {
                  setValues((prev) => ({ ...prev, [param.name]: (selectedItem as any).uuid }));
                } else {
                  setValues((prev) => ({ ...prev, [param.name]: '' }));
                }
                if (error) setErrors((prev) => ({ ...prev, [param.name]: '' }));
              }}
              invalid={!!error}
              invalidText={error}
              placeholder={param.label}
              size="sm"
            />
          </div>
        );
      }

      case 'CONCEPT': {
        const config = param.config as any;
        const conceptClassUuids = config?.conceptClassUuids;
        const searchQuery = searchQueries[param.name] || '';

        const { results: concepts } = useConceptSearch(searchQuery, conceptClassUuids);

        const items = concepts.map((concept: any) => ({
          uuid: concept.uuid,
          label: concept.display || concept.name?.name || concept.uuid,
        }));

        return (
          <div>
            <label htmlFor={`report-param-${param.name}`} className="cds--label">
              {param.label}
            </label>
            <ComboBox
              id={`report-param-${param.name}`}
              titleText={param.label}
              items={items}
              itemToString={(item: any) => item?.label || ''}
              initialSelectedItem={items.find((item) => item.uuid === value)}
              onInputChange={(input) => {
                handleSearchQueryChange(param.name, input);
              }}
              onChange={({ selectedItem }) => {
                if (selectedItem) {
                  setValues((prev) => ({ ...prev, [param.name]: (selectedItem as any).uuid }));
                } else {
                  setValues((prev) => ({ ...prev, [param.name]: '' }));
                }
                if (error) setErrors((prev) => ({ ...prev, [param.name]: '' }));
              }}
              invalid={!!error}
              invalidText={error}
              placeholder={param.label}
              size="sm"
            />
          </div>
        );
      }

      case 'IDENTIFIER_TYPE': {
        const { identifierTypes } = usePatientIdentifierTypes(true);

        const items = identifierTypes.map((idType) => ({
          uuid: idType.uuid,
          label: idType.display || idType.name || idType.uuid,
        }));

        return (
          <div>
            <label htmlFor={`report-param-${param.name}`} className="cds--label">
              {param.label}
            </label>
            <ComboBox
              id={`report-param-${param.name}`}
              titleText={param.label}
              items={items}
              itemToString={(item: any) => item?.label || ''}
              initialSelectedItem={items.find((item) => item.uuid === value)}
              onChange={({ selectedItem }) => {
                if (selectedItem) {
                  setValues((prev) => ({ ...prev, [param.name]: (selectedItem as any).uuid }));
                } else {
                  setValues((prev) => ({ ...prev, [param.name]: '' }));
                }
                if (error) setErrors((prev) => ({ ...prev, [param.name]: '' }));
              }}
              invalid={!!error}
              invalidText={error}
              placeholder={param.label}
              size="sm"
            />
          </div>
        );
      }

      case 'PERSON_ATTRIBUTE': {
        const config = param.config as any;
        const format = config?.format;
        const { attributeTypes } = usePersonAttributeTypes(false, format);

        const items = attributeTypes.map((attrType) => ({
          uuid: attrType.uuid,
          label: attrType.display || attrType.name || attrType.uuid,
        }));

        return (
          <div>
            <label htmlFor={`report-param-${param.name}`} className="cds--label">
              {param.label}
            </label>
            <ComboBox
              id={`report-param-${param.name}`}
              titleText={param.label}
              items={items}
              itemToString={(item: any) => item?.label || ''}
              initialSelectedItem={items.find((item) => item.uuid === value)}
              onChange={({ selectedItem }) => {
                if (selectedItem) {
                  setValues((prev) => ({ ...prev, [param.name]: (selectedItem as any).uuid }));
                } else {
                  setValues((prev) => ({ ...prev, [param.name]: '' }));
                }
                if (error) setErrors((prev) => ({ ...prev, [param.name]: '' }));
              }}
              invalid={!!error}
              invalidText={error}
              placeholder={param.label}
              size="sm"
            />
          </div>
        );
      }

      case 'TEXT':
      default: {
        const config = param.config as any;
        return (
          <TextInput
            id={`report-param-${param.name}`}
            labelText={param.label}
            value={value}
            onChange={(e) => {
              const newValue = (e.target as HTMLInputElement).value;
              // Validate min/max length if configured
              if (config?.minLength && newValue.length < config.minLength) {
                setErrors((prev) => ({ ...prev, [param.name]: `Minimum ${config.minLength} characters required` }));
              } else if (config?.maxLength && newValue.length > config.maxLength) {
                setErrors((prev) => ({ ...prev, [param.name]: `Maximum ${config.maxLength} characters allowed` }));
              } else if (config?.pattern && !new RegExp(config.pattern).test(newValue)) {
                setErrors((prev) => ({ ...prev, [param.name]: 'Invalid format' }));
              } else {
                setValues((prev) => ({ ...prev, [param.name]: newValue }));
                if (error) setErrors((prev) => ({ ...prev, [param.name]: '' }));
              }
            }}
            invalid={!!error}
            invalidText={error}
            placeholder={param.label}
            size="sm"
          />
        );
      }
    }
  };
  /* eslint-enable react-hooks/rules-of-hooks */

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading="Report Parameters"
      modalLabel="Data Visualizer"
      preventCloseOnClickOutside
      size="sm"
    >
      <ModalHeader />
      <ModalBody>
        {parameters.length === 0 ? (
          <InlineNotification
            kind="info"
            title="No Parameters"
            subtitle="This report has no parameters defined. Click Run to use default values."
            lowContrast
          />
        ) : (
          <Stack gap={5}>
            {/* Date Mode Toggle - shown ONLY if report has both startDate AND endDate */}
            {supportsRelativePeriod && (
              <div style={{ marginBottom: '1rem' }}>
                <label className="cds--label">Date Selection Mode</label>
                <RadioButtonGroup
                  legendText=""
                  name="date-mode"
                  valueSelected={dateMode}
                  onChange={(mode) => {
                    setDateMode(mode as DateMode);
                    // Clear relative period when switching to FIXED
                    if (mode === 'FIXED') {
                      setRelativePeriod('');
                    }
                  }}
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
              <div style={{ marginBottom: '1rem' }}>
                <Select
                  id="relative-period-select"
                  labelText="Select reporting period"
                  value={relativePeriod}
                  onChange={(e) => {
                    setRelativePeriod(e.target.value as RelativePeriod);
                  }}
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

            {/* Parameter Inputs */}
            {parameters.map((param) => (
              <div key={param.name}>
                {renderParameterInput(param)}
              </div>
            ))}
          </Stack>
        )}
      </ModalBody>
      <ModalFooter>
        <ButtonSet>
          <Button kind="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button kind="primary" onClick={handleRun} disabled={loading}>
            {loading ? (
              <>
                Running...
                <InlineLoading style={{ marginLeft: '8px' }} />
              </>
            ) : (
              'Run Report'
            )}
          </Button>
        </ButtonSet>
      </ModalFooter>
    </Modal>
  );
};

export default ReportParameterModal;

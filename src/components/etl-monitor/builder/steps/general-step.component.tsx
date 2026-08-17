/**
 * General Information Step Component
 * Step 1 of the ETL Monitor Builder
 *
 * Fields: Name, Code, Description, Category, Refresh Interval, Timeout, Active
 */

import React, { useEffect } from 'react';
import {
  TextInput,
  TextArea,
  NumberInput,
  Toggle,
  Select,
  SelectItem,
  FormGroup,
  Stack,
  InlineNotification,
} from '@carbon/react';
import { Information } from '@carbon/icons-react';
import { useBuilderContext, useUpdateBuilderState } from '../etl-monitor-builder-context';
import { validateGeneralStep } from '../builder-state-machine';
import styles from './general-step.scss';

/**
 * Common category options for ETL monitors
 */
const COMMON_CATEGORIES = [
  { value: 'uganda-etl', label: 'Uganda ETL' },
  { value: 'etl-status', label: 'ETL Status' },
  { value: 'data-quality', label: 'Data Quality' },
  { value: 'system-health', label: 'System Health' },
  { value: 'performance', label: 'Performance' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'custom', label: 'Custom' },
];

/**
 * General Information Step Component
 */
export default function GeneralStep() {
  const { state } = useBuilderContext();
  const updateState = useUpdateBuilderState();

  const { general } = state;

  // Local validation state
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  /**
   * Validate the general configuration
   */
  const validateField = (field: string, value: any) => {
    const fieldErrors: Record<string, string> = {};

    switch (field) {
      case 'name':
        if (!value || value.trim() === '') {
          fieldErrors.name = 'Name is required';
        }
        break;

      case 'code':
        if (!value || value.trim() === '') {
          fieldErrors.code = 'Code is required';
        } else if (!/^[a-z0-9-]+$/.test(value)) {
          fieldErrors.code = 'Code must contain only lowercase letters, numbers, and hyphens';
        }
        break;

      case 'refreshInterval':
        if (value < 5 || value > 3600) {
          fieldErrors.refreshInterval = 'Refresh interval must be between 5 and 3600 seconds';
        }
        break;

      case 'timeout':
        if (value < 1 || value > 300) {
          fieldErrors.timeout = 'Timeout must be between 1 and 300 seconds';
        }
        break;

      default:
        break;
    }

    return fieldErrors;
  };

  /**
   * Handle field change
   */
  const handleChange = (field: string, value: any) => {
    const fieldErrors = validateField(field, value);
    setErrors((prev) => ({ ...prev, ...fieldErrors }));
    setTouched((prev) => ({ ...prev, [field]: true }));

    updateState({
      general: { ...general, [field]: value },
    });
  };

  /**
   * Handle category change with label
   */
  const handleCategoryChange = (value: string) => {
    const category = COMMON_CATEGORIES.find((c) => c.value === value);
    updateState({
      general: {
        ...general,
        category: value,
        categoryLabel: category?.label || value,
      },
    });
  };

  /**
   * Generate code from name
   */
  const handleNameBlur = () => {
    if (general.name && (!general.code || general.code === '')) {
      const generatedCode = general.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      handleChange('code', generatedCode);
    }
  };

  /**
   * Validate on mount and when general changes
   * Memoized to prevent unnecessary effect runs
   */
  const validateGeneral = React.useCallback(() => {
    const validation = validateGeneralStep(general);
    setErrors(
      validation.errors.reduce((acc, error) => {
        const field = error.split(' ')[0].toLowerCase();
        acc[field] = error;
        return acc;
      }, {} as Record<string, string>)
    );
  }, [general]);

  useEffect(() => {
    validateGeneral();
  }, [validateGeneral]);

  const hasErrors = Object.keys(errors).some((key) => errors[key]);

  return (
    <div className={styles['general-step']}>
      {/* Section Header */}
      <div className={styles['general-step__header']}>
        <h2>General Information</h2>
        <p className={styles['general-step__description']}>
          Define the basic details of your ETL monitor.
        </p>
      </div>

      {hasErrors && touched && Object.keys(touched).length > 0 && (
        <InlineNotification
          kind="error"
          title="Validation Errors"
          subtitle="Please fix the errors below before proceeding"
          lowContrast
          style={{ marginBottom: '1rem' }}
        />
      )}

      <FormGroup legendText="">
        <Stack gap={5}>
          {/* Name */}
          <TextInput
            id="monitor-name"
            labelText="Name *"
            placeholder="e.g., ETL Module Health"
            value={general.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={handleNameBlur}
            invalid={touched.name && !!errors.name}
            invalidText={errors.name}
            helperText="A friendly name for this monitor"
            autoFocus
          />

          {/* Code */}
          <TextInput
            id="monitor-code"
            labelText="Code *"
            placeholder="e.g., etl-module-health"
            value={general.code}
            onChange={(e) => handleChange('code', e.target.value)}
            invalid={touched.code && !!errors.code}
            invalidText={errors.code}
            helperText="A unique code used to identify this monitor"
          />

          {/* Description */}
          <TextArea
            id="monitor-description"
            labelText="Description"
            rows={3}
            placeholder="Optional description of what this monitor displays"
            value={general.description}
            onChange={(e) => handleChange('description', e.target.value)}
            helperText="Describe what this monitor checks and why it's important"
          />

          {/* Category */}
          <Select
            id="monitor-category"
            labelText="Category *"
            value={general.category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            helperText="Choose the category this monitor belongs to"
          >
            <SelectItem value="" text="Select a category..." />
            {COMMON_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value} text={cat.label} />
            ))}
          </Select>

          {/* Active Toggle */}
          <div className={styles['general-step__toggle']}>
            <Toggle
              id="monitor-active"
              labelText="Active *"
              labelA="Off"
              labelB="On"
              toggled={general.active}
              onToggle={(checked) => handleChange('active', checked)}
            />
            <div className={styles['general-step__toggle-helper']}>
              Enable or disable this monitor
            </div>
          </div>

          {/* Refresh Interval and Timeout */}
          <Stack orientation="horizontal" gap={5}>
            <div style={{ flex: 1 }}>
              <NumberInput
                id="refresh-interval"
                label="Refresh Interval (seconds) *"
                min={5}
                max={3600}
                step={5}
                value={general.refreshInterval}
                onChange={(event) => {
                  const val = parseInt((event.target as HTMLInputElement).value) || 30;
                  handleChange('refreshInterval', val);
                }}
                invalid={touched.refreshInterval && !!errors.refreshInterval}
                invalidText={errors.refreshInterval}
                helperText="How often the monitor runs"
              />
            </div>

            <div style={{ flex: 1 }}>
              <NumberInput
                id="timeout"
                label="Timeout (seconds) *"
                min={1}
                max={300}
                step={1}
                value={general.timeout}
                onChange={(event) => {
                  const val = parseInt((event.target as HTMLInputElement).value) || 10;
                  handleChange('timeout', val);
                }}
                invalid={touched.timeout && !!errors.timeout}
                invalidText={errors.timeout}
                helperText="Maximum time to wait for a response"
              />
            </div>
          </Stack>
        </Stack>
      </FormGroup>

      {/* Info Banner */}
      <div className={styles['general-step__info-banner']}>
        <Information size={16} />
        <span>You can configure the data source and design in the next steps.</span>
      </div>
    </div>
  );
}

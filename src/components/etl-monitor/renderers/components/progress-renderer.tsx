/**
 * Progress Renderer
 * Renders PROGRESS component type
 */

import React from 'react';
import styles from '../monitor-renderers.scss';
import type { DisplayConfigV2 } from '../../../../types/etl-monitor/etl-monitor-v2.types';

interface ProgressRendererProps {
  config: DisplayConfigV2;
  fields?: Array<{
    key: string;
    label: string;
    value: any;
    formattedValue: any;
    type: string;
    primary: boolean;
    hidden: boolean;
    order?: number;
  }>;
  arrayData?: any;
  rawData?: any;
  data?: any;
}

export function ProgressRenderer({ config, fields, data }: ProgressRendererProps) {
  // If fields are not provided but data is, transform data into fields
  const derivedFields = fields || (data ? transformDataToFields(data, config) : []);
  const safeFields = derivedFields || [];

  const percentageField = safeFields.find((f) => f.type === 'PERCENTAGE');
  const stageField = safeFields.find((f) => f.key === config.componentConfig?.stageFieldKey);

  let percentage = 0;
  if (percentageField?.value && typeof percentageField.value === 'number') {
    percentage = Math.min(100, Math.max(0, percentageField.value));
  }

  const stage = stageField?.formattedValue;

  return (
    <div className={styles['monitor-progress']}>
      <div className={styles['monitor-progress__header']}>
        {config.presentation?.title && (
          <h4 className={styles['monitor-progress__title']}>{config.presentation.title}</h4>
        )}
      </div>

      <div className={styles['monitor-progress__body']}>
        <div className={styles['monitor-progress__info']}>
          <div className={styles['monitor-progress__percentage']}>{percentage}%</div>
          <div className={styles['monitor-progress__stage']}>{stage || 'In Progress'}</div>
        </div>

        <div className={styles['monitor-progress__bar-container']}>
          <div className={styles['monitor-progress__bar']} style={{ width: `${percentage}%` }}></div>
        </div>

        {safeFields.length > 2 && (
          <div className={styles['monitor-progress__fields']}>
            {safeFields
              .filter((f) => f.key !== percentageField?.key && f.key !== stageField?.key && !f.hidden)
              .slice(0, 3)
              .map((field) => (
                <div key={field.key} className={styles['monitor-progress__field']}>
                  <span className={styles['monitor-progress__field-label']}>{field.label}:</span>
                  <span className={styles['monitor-progress__field-value']}>{field.formattedValue}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Transform raw data into formatted fields for progress renderer
 */
function transformDataToFields(data: any, config: DisplayConfigV2) {
  if (!data || typeof data !== 'object') return [];

  const fields: Array<{
    key: string;
    label: string;
    value: any;
    formattedValue: any;
    type: string;
    primary: boolean;
    hidden: boolean;
    order?: number;
  }> = [];

  // If config defines field mappings, apply them
  if (config.fields && Array.isArray(config.fields)) {
    for (const fieldConfig of config.fields) {
      const value = resolveFieldValue(data, fieldConfig.key);

      fields.push({
        key: fieldConfig.key,
        label: fieldConfig.label || fieldConfig.key,
        value,
        formattedValue: formatFieldValue(value, fieldConfig),
        type: fieldConfig.type || 'string',
        primary: fieldConfig.primary || false,
        hidden: fieldConfig.hidden || false,
        order: fieldConfig.order,
      });
    }
  } else {
    // Otherwise, use all data properties
    Object.keys(data).forEach((key, index) => {
      const value = data[key];
      fields.push({
        key,
        label: key,
        value,
        formattedValue: value,
        type: typeof value,
        primary: index === 0,
        hidden: false,
        order: index,
      });
    });
  }

  return fields;
}

/**
 * Resolve field value from data object using key path
 */
function resolveFieldValue(data: any, key: string): any {
  if (!data || !key) return undefined;

  const keys = key.split('.');
  let value = data;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Format field value based on field configuration
 */
function formatFieldValue(value: any, fieldConfig: any): any {
  if (value === null || value === undefined) return '-';

  if (fieldConfig.type === 'percentage' && typeof value === 'number') {
    return `${Math.round(value)}%`;
  }

  if (fieldConfig.type === 'date' && value) {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  }

  if (fieldConfig.type === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return value;
}

export default ProgressRenderer;

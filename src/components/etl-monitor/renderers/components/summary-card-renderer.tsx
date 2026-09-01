/**
 * Summary Card Renderer
 * Renders SUMMARY_CARD component type
 */

import React from 'react';
import styles from '../monitor-renderers.scss';
import type { DisplayConfigV2 } from '../../../../types/etl-monitor/etl-monitor-v2.types';

interface SummaryCardRendererProps {
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

export function SummaryCardRenderer({ config, fields, data }: SummaryCardRendererProps) {
  // If fields are not provided but data is, transform data into fields
  const derivedFields = fields || (data ? transformDataToFields(data, config) : []);
  const visibleFields = derivedFields.filter((f) => !f.hidden);

  return (
    <div className={styles['monitor-summary-card']}>
      <div className={styles['monitor-summary-card__header']}>
        {config.presentation?.title && (
          <h4 className={styles['monitor-summary-card__title']}>{config.presentation.title}</h4>
        )}
      </div>

      <div className={styles['monitor-summary-card__body']}>
        <div className={styles['monitor-summary-card__metrics']}>
          {visibleFields.map((field) => (
            <div key={field.key} className={styles['monitor-summary-card__metric']}>
              <div className={styles['monitor-summary-card__metric-label']}>{field.label}</div>
              <div className={styles['monitor-summary-card__metric-value']}>{field.formattedValue}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Transform raw data into formatted fields for summary card
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
    statusTone?: string;
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
        statusTone:
          fieldConfig.type === 'STATUS' && value != null
            ? mappingTone(value, fieldConfig)
            : undefined,
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

function mappingTone(value: any, fieldConfig: any): string | undefined {
  const stringValue = String(value);
  const mapping =
    fieldConfig.statusMap?.[stringValue] ?? fieldConfig.statusMap?.[stringValue.toLowerCase()];
  return mapping?.tone;
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

export default SummaryCardRenderer;

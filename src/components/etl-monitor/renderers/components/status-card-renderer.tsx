/**
 * Status Card Renderer
 * Reference widget style (docs/image-series-monitor/widgets):
 * icon tile + title header, large tone-colored status with dot,
 * description line, and footer meta slots.
 */

import React from 'react';
import { Security, Time, Grid } from '@carbon/icons-react';
import styles from '../monitor-renderers.scss';
import type { DisplayConfigV2 } from '../../../../types/etl-monitor/etl-monitor-v2.types';
import { formatRelativeTime } from '../../../../utils/etl-monitor/value-formatters.util';

interface StatusCardRendererProps {
  config: DisplayConfigV2;
  fields?: Array<{
    key: string;
    label: string;
    value: any;
    formattedValue: any;
    type: string;
    primary: boolean;
    hidden: boolean;
    statusTone?: string;
    statusMap?: Record<string, any>;
    order?: number;
  }>;
  arrayData?: any;
  rawData?: any;
  data?: any;
}

export function StatusCardRenderer({ config, fields, rawData, data }: StatusCardRendererProps) {
  // Use rawData first (from MonitorRenderer), then data (fallback), then transform
  const dataToTransform = rawData || data;

  // If fields are not provided but data is, transform data into fields
  const derivedFields = fields || (dataToTransform ? transformDataToFields(dataToTransform, config) : []);
  const safeFields = derivedFields || [];

  const primaryField = safeFields.find((f) => f.primary);
  const statusField = safeFields.find((f) => f.type === 'STATUS') || primaryField;

  const statusValue = statusField?.formattedValue;

  // Use pre-calculated tone from field, or determine from value
  const tone = statusField?.statusTone || determineStatusTone(statusValue);

  const title = config.presentation?.title || 'Status Monitor';
  const description = config.presentation?.description;

  // Remaining visible fields become footer meta slots
  const metaFields = safeFields
    .filter((f) => !f.hidden && f.key !== statusField?.key)
    .slice(0, 3);

  return (
    <div className={[styles['status-card-premium'], styles[`status-card-premium--${tone}`]].join(' ')}>
      {/* Header: icon tile + title + status pill */}
      <div className={styles['status-card-premium__header']}>
        <span className={styles['status-card-premium__icon-tile']}>
          <Security size={22} />
        </span>
        <h3 className={styles['status-card-premium__title']}>{title}</h3>
        {statusField && (
          <span
            className={[
              styles['status-card-premium__pill'],
              styles[`status-card-premium__pill--${tone}`],
            ].join(' ')}
          >
            {statusValue || 'Unknown'}
          </span>
        )}
      </div>

      {/* Body: large status + dot, description */}
      <div className={styles['status-card-premium__body']}>
        <div className={styles['status-card-premium__status-row']}>
          <span className={styles['status-card-premium__status-value']}>{statusValue || 'Unknown'}</span>
          <span className={styles['status-card-premium__dot']} />
        </div>
        {description && <p className={styles['status-card-premium__description']}>{description}</p>}
      </div>

      {/* Footer meta slots (Module, Last checked, ...) */}
      {metaFields.length > 0 && (
        <div className={styles['status-card-premium__footer']}>
          {metaFields.map((field) => (
            <div key={field.key} className={styles['status-card-premium__meta']}>
              <span className={styles['status-card-premium__meta-label']}>
                {field.type === 'TIMESTAMP' ? <Time size={12} /> : <Grid size={12} />}
                {field.label}
              </span>
              <span className={styles['status-card-premium__meta-value']}>{field.formattedValue ?? '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Determine status tone from value
 */
function determineStatusTone(value: any): string {
  if (!value) return 'neutral';

  const stringValue = String(value).toUpperCase();

  if (stringValue === 'UP' || stringValue === 'ACTIVE' || stringValue === 'SUCCESS' || stringValue === 'OK' || stringValue === 'HEALTHY') {
    return 'success';
  }
  if (stringValue === 'DOWN' || stringValue === 'ERROR' || stringValue === 'FAILED' || stringValue === 'CRITICAL' || stringValue === 'UNHEALTHY') {
    return 'critical';
  }
  if (stringValue === 'WARNING' || stringValue === 'DEGRADED') {
    return 'warning';
  }
  if (stringValue === 'INFO' || stringValue === 'PENDING') {
    return 'info';
  }

  return 'neutral';
}

/**
 * Transform raw data into formatted fields for status card
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
    statusTone?: string;
    statusMap?: Record<string, any>;
  }> = [];

  // If config defines field mappings, apply them
  if (config.fields && Array.isArray(config.fields)) {
    for (const fieldConfig of config.fields) {
      const value = resolveFieldValue(data, fieldConfig.key);

      // Determine status tone if this is a STATUS field with statusMap
      let statusTone = 'neutral';
      if (fieldConfig.type === 'STATUS' && fieldConfig.statusMap && value != null) {
        const stringValue = String(value);
        // Try exact match first, then case-insensitive match
        const mapping = fieldConfig.statusMap[stringValue] ||
                       fieldConfig.statusMap[stringValue.toLowerCase()];
        statusTone = mapping?.tone || determineStatusTone(value);
      }

      fields.push({
        key: fieldConfig.key,
        label: fieldConfig.label || fieldConfig.key,
        value,
        formattedValue: formatFieldValue(value, fieldConfig),
        type: fieldConfig.type || 'string',
        primary: fieldConfig.primary || false,
        hidden: fieldConfig.hidden || false,
        statusTone,
        statusMap: fieldConfig.statusMap,
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
        formattedValue: formatFieldValue(value, { type: typeof value }),
        type: typeof value,
        primary: index === 0,
        hidden: false,
        statusTone: determineStatusTone(value),
      });
    });
  }

  return fields;
}

/**
 * Resolve field value from data object using key path
 * Supports nested keys like 'user.name' and JSONPath like '$.status'
 */
function resolveFieldValue(data: any, key: string): any {
  if (!data || !key) return undefined;

  // Handle JSONPath-style keys (e.g., '$.status' or '$.user.name')
  let path = key;
  if (path.startsWith('$.')) {
    path = path.slice(2); // Remove '$.' prefix
  }

  const keys = path.split('.');
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

  // For STATUS fields with statusMap, use the mapped label
  if (fieldConfig.type === 'STATUS' && fieldConfig.statusMap && value != null) {
    const stringValue = String(value);
    // Try exact match first, then case-insensitive match
    const mapping = fieldConfig.statusMap[stringValue] ||
                   fieldConfig.statusMap[stringValue.toLowerCase()];
    return mapping?.label || value;
  }

  // For TIMESTAMP fields, show relative time ("2 minutes ago" / "in 5 minutes")
  if (fieldConfig.type === 'TIMESTAMP' && value) {
    return formatRelativeTime(value, { pastOnly: true });
  }

  if (fieldConfig.type === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return value;
}

export default StatusCardRenderer;

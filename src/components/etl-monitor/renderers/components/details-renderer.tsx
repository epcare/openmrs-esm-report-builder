/**
 * Details Renderer
 * Renders DETAILS/ERROR_LOG component type
 */

import React from 'react';
import { StructuredListWrapper, StructuredListBody, StructuredListRow, StructuredListCell, Tag } from '@carbon/react';
import styles from '../monitor-renderers.scss';
import type { DisplayConfigV2 } from '../../../../types/etl-monitor/etl-monitor-v2.types';
import { formatRelativeTime } from '../../../../utils/etl-monitor/value-formatters.util';

interface DetailsRendererProps {
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
    format?: any;
    path?: string;
  }>;
  arrayData?: any;
  rawData?: any;
  data?: any;
}

export function DetailsRenderer({ config, fields, data }: DetailsRendererProps) {
  // Fields are provided by MonitorRenderer's data-transformer path; fall back
  // to transforming data here if a caller passes raw data instead
  const derivedFields = fields || (data ? transformDataToFields(data, config) : []);
  const visibleFields = (derivedFields || []).filter((f) => !f.hidden);
  const isErrorLog = config.component === 'ERROR_LOG';

  return (
    <div className={styles['details-renderer']}>
      <div className={styles['details-renderer__header']}>
        {config.presentation?.title && (
          <h4 className={styles['details-renderer__title']}>{config.presentation.title}</h4>
        )}
      </div>

      {visibleFields.length === 0 ? (
        <div className={styles['details-renderer__empty']}>No details to display</div>
      ) : (
        <StructuredListWrapper>
          <StructuredListBody>
            {visibleFields.map((field) => (
              <StructuredListRow key={field.key}>
                <StructuredListCell style={{ width: '40%' }}>
                  <strong>{field.label}</strong>
                </StructuredListCell>
                <StructuredListCell>
                  {isErrorLog && field.type === 'STATUS' ? (
                    <Tag type={field.value === 'ERROR' ? 'red' : 'gray'}>
                      {field.formattedValue}
                    </Tag>
                  ) : field.type === 'STATUS' && field.statusTone ? (
                    <Tag type={field.statusTone === 'success' ? 'green' : field.statusTone === 'critical' ? 'red' : field.statusTone === 'warning' ? 'purple' : 'gray'}>
                      {field.formattedValue}
                    </Tag>
                  ) : field.type === 'TIMESTAMP' && field.format?.timestamp?.display ? (
                    <span className={styles['details-renderer__timestamp']}>
                      <span className={styles['details-renderer__value']}>{field.formattedValue}</span>
                      <span className={styles['details-renderer__timestamp-sub']}>
                        {formatRelativeTime(field.value)}
                      </span>
                    </span>
                  ) : (
                    <span className={styles['details-renderer__value']}>{field.formattedValue}</span>
                  )}
                </StructuredListCell>
              </StructuredListRow>
            ))}
          </StructuredListBody>
        </StructuredListWrapper>
      )}
    </div>
  );
}

/**
 * Transform raw data into formatted fields for details renderer
 */
export function transformDataToFields(data: any, config: DisplayConfigV2) {
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
    order?: number;
    format?: any;
    path?: string;
  }> = [];

  // If config defines field mappings, apply them
  if (config.fields && Array.isArray(config.fields)) {
    for (const fieldConfig of config.fields) {
      const value = resolveFieldValue(data, fieldConfig.key);

      // Determine status tone if this is a STATUS field with statusMap
      let statusTone = 'neutral';
      if (fieldConfig.type === 'STATUS' && fieldConfig.statusMap && value != null) {
        const stringValue = String(value);
        const mapping = fieldConfig.statusMap[stringValue];
        statusTone = mapping?.tone || 'neutral';
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

export default DetailsRenderer;

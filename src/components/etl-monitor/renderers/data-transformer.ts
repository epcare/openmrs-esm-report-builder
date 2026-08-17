/**
 * Data Transformer Utilities
 * Transforms raw data into formatted fields for monitor components
 */

import type { DisplayConfigV2 } from '../../../types/etl-monitor/etl-monitor-v2.types';

/**
 * Check if data is empty based on component configuration
 */
export function isDataEmpty(data: any, config: DisplayConfigV2): boolean {
  if (!data) return true;

  // Check based on component type
  switch (config.component) {
    case 'STATUS_CARD':
    case 'SUMMARY_CARD':
    case 'PROGRESS':
      // For single-value components, check if value exists
      return data === null || data === undefined || data === '';

    case 'TABLE':
    case 'DATA_TABLE':
    case 'METRICS_GRID':
    case 'ERROR_LOG':
    case 'DETAILS':
      // For array-based components, check if array has items
      return !Array.isArray(data) || data.length === 0;

    default:
      return !data;
  }
}

/**
 * Transform raw data into formatted fields for single-value components
 */
export function transformDataToFields(data: any, config: DisplayConfigV2): Record<string, any> {
  if (!data) return {};

  const fields: Record<string, any> = {};

  // If config defines field mappings, apply them
  if (config.fields) {
    for (const field of config.fields) {
      const value = resolveFieldValue(data, field.key);
      fields[field.key] = value;
    }
  } else {
    // Otherwise, use all data properties
    Object.keys(data).forEach(key => {
      fields[key] = data[key];
    });
  }

  return fields;
}

/**
 * Transform array data into rows for table-like components
 */
export function transformArrayDataToRows(data: any, config: DisplayConfigV2): any[] {
  if (!data) return [];

  // If data is already an array, use it directly
  if (Array.isArray(data)) {
    return data.map(item => transformRowToFields(item, config));
  }

  // If data is an object with a data property, use that
  if (data.data && Array.isArray(data.data)) {
    return data.data.map(item => transformRowToFields(item, config));
  }

  // If data is an object with items property, use that
  if (data.items && Array.isArray(data.items)) {
    return data.items.map(item => transformRowToFields(item, config));
  }

  // Otherwise, wrap single object in array
  if (typeof data === 'object') {
    return [transformRowToFields(data, config)];
  }

  return [];
}

/**
 * Transform a single row object into fields
 */
export function transformRowToFields(row: any, config: DisplayConfigV2): Record<string, any> {
  if (!row) return {};

  const fields: Record<string, any> = {};

  // If config defines field mappings, apply them
  if (config.fields) {
    for (const field of config.fields) {
      const value = resolveFieldValue(row, field.key);
      fields[field.key] = value;
    }
  } else {
    // Otherwise, use all row properties
    Object.keys(row).forEach(key => {
      fields[key] = row[key];
    });
  }

  return fields;
}

/**
 * Resolve field value from data object using key path
 * Supports nested keys like 'user.name'
 */
function resolveFieldValue(data: any, key: string): any {
  if (!data || !key) return undefined;

  // Support nested key paths
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

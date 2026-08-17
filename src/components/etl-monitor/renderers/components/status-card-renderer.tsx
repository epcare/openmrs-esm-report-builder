/**
 * Status Card Renderer - Figma-Quality Design
 * Modern, polished status card with premium visual design
 */

import React from 'react';
import {
  CheckmarkFilled,
  ErrorFilled,
  WarningFilled,
  Information,
  Time,
} from '@carbon/icons-react';
import type { DisplayConfigV2 } from '../../../../types/etl-monitor/etl-monitor-v2.types';

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
  const statusLabel = statusField?.label || 'Status';

  // Use pre-calculated tone from field, or determine from value
  const tone = statusField?.statusTone || determineStatusTone(statusValue);

  const title = config.presentation?.title || 'Status Monitor';
  const description = config.presentation?.description;

  // Get the timestamp field for display
  const timestampField = safeFields.find((f) => f.type === 'TIMESTAMP' || f.key === 'timestamp');
  const lastUpdated = timestampField?.formattedValue || formatTimestamp(new Date());

  return (
    <div className="status-card-premium">
      {/* Card Header */}
      <div className="status-card-premium__header">
        <div className="status-card-premium__header-content">
          <h3 className="status-card-premium__title">{title}</h3>
          {description && (
            <p className="status-card-premium__description">{description}</p>
          )}
        </div>
        <div className={`status-card-premium__status-indicator status-card-premium__status-indicator--${tone}`}>
          <div className="status-card-premium__status-dot"></div>
          <span className="status-card-premium__status-text">{statusValue || 'Unknown'}</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="status-card-premium__body">
        {/* Main Status Display */}
        <div className={`status-card-premium__main-status status-card-premium__main-status--${tone}`}>
          <div className="status-card-premium__status-icon">
            {getStatusIcon(tone)}
          </div>
          <div className="status-card-premium__status-content">
            <div className="status-card-premium__status-value">{statusValue || 'Unknown'}</div>
            <div className="status-card-premium__status-label">{statusLabel}</div>
          </div>
        </div>

        {/* Additional Fields */}
        {safeFields.length > 1 && (
          <div className="status-card-premium__fields">
            {safeFields
              .filter((f) => !f.hidden && f.key !== statusField?.key)
              .slice(0, 4)
              .map((field) => (
                <div key={field.key} className="status-card-premium__field">
                  <div className="status-card-premium__field-label">{field.label}</div>
                  <div className="status-card-premium__field-value">{field.formattedValue}</div>
                </div>
              ))}
          </div>
        )}

        {/* Footer with timestamp */}
        <div className="status-card-premium__footer">
          <Time size={12} className="status-card-premium__time-icon" />
          <span className="status-card-premium__timestamp">Last updated: {lastUpdated}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Determine status tone from value
 */
function determineStatusTone(value: any): string {
  if (!value) return 'neutral';

  const stringValue = String(value).toUpperCase();

  if (stringValue === 'UP' || stringValue === 'ACTIVE' || stringValue === 'SUCCESS' || stringValue === 'OK') {
    return 'success';
  }
  if (stringValue === 'DOWN' || stringValue === 'ERROR' || stringValue === 'FAILED' || stringValue === 'CRITICAL') {
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
 * Get status icon based on tone
 */
function getStatusIcon(tone: string): React.ReactNode {
  const iconSize = 24;

  switch (tone) {
    case 'success':
      return <CheckmarkFilled size={iconSize} />;
    case 'critical':
      return <ErrorFilled size={iconSize} />;
    case 'warning':
      return <WarningFilled size={iconSize} />;
    case 'info':
      return <Information size={iconSize} />;
    default:
      return <Information size={iconSize} />;
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
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

  if (fieldConfig.type === 'date' && value) {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  }

  // For TIMESTAMP fields, format as readable date
  if (fieldConfig.type === 'TIMESTAMP' && value) {
    try {
      const date = new Date(value);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hour${Math.floor(diffMins / 60) > 1 ? 's' : ''} ago`;
      return `${Math.floor(diffMins / 1440)} day${Math.floor(diffMins / 1440) > 1 ? 's' : ''} ago`;
    } catch {
      return value;
    }
  }

  if (fieldConfig.type === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return value;
}

export default StatusCardRenderer;

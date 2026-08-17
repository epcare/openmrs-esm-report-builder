/**
 * V2 Monitor Renderer
 * Renders monitors using schema version 2 configuration
 */

import React from 'react';
import type { ETLMonitorDto } from '../../../types/etl-monitor';
import type { DisplayConfigV2 } from '../../../types/etl-monitor/etl-monitor-v2.types';
import { StatusCardRenderer } from './components/status-card-renderer';
import { SummaryCardRenderer } from './components/summary-card-renderer';
import { MetricsGridRenderer } from './components/metrics-grid-renderer';
import { ProgressRenderer } from './components/progress-renderer';
import { TableRenderer } from './components/table-renderer';
import { DetailsRenderer } from './components/details-renderer';
import { MonitorError, MonitorEmpty } from './monitor-renderer';

interface V2MonitorRendererProps {
  monitor: ETLMonitorDto;
  data?: any;
  loading?: boolean;
  error?: string;
}

/**
 * Parse display configuration
 */
function parseDisplayConfig(monitor: ETLMonitorDto): DisplayConfigV2 | null {
  if (!monitor.displayConfigJson) return null;

  try {
    return JSON.parse(monitor.displayConfigJson);
  } catch {
    return null;
  }
}

/**
 * Resolve field value from data using JSONPath
 */
function resolveFieldValue(data: any, field: any): any {
  if (!data) return null;

  const path = field.path || '$.' + field.key;

  // Simple JSONPath resolution for common patterns
  if (path === '$' || path === '$.') {
    return data;
  }

  // Handle $.field.name pattern
  if (path.startsWith('$.')) {
    const parts = path.substring(2).split('.');
    let value = data;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }
    return value;
  }

  // Handle array path $.data[*].field (simplified)
  if (path.includes('[*]')) {
    const [arrayPath, fieldPath] = path.split('[*].');
    if (arrayPath.endsWith('[*]')) {
      const arrayKeyName = arrayPath.substring(2, arrayPath.length - 3);
      const array = data[arrayKeyName];
      if (Array.isArray(array)) {
        return array.map((item: any) => fieldPath ? item[fieldPath] : item);
      }
    }
  }

  return null;
}

/**
 * Format field value based on type
 */
function formatFieldValue(value: any, field: any): any {
  if (value === null || value === undefined) {
    return field.defaultValue || null;
  }

  switch (field.type) {
    case 'TIMESTAMP':
      if (typeof value === 'number') {
        return new Date(value).toLocaleString();
      }
      return value;

    case 'DURATION':
      if (typeof value === 'number') {
        // Assume milliseconds, convert to human readable
        const seconds = Math.floor(value / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
      }
      return value;

    case 'PERCENTAGE':
      if (typeof value === 'number') {
        return `${Math.round(value)}%`;
      }
      return value;

    case 'NUMBER':
    case 'INTEGER':
    case 'DECIMAL':
      if (typeof value === 'number' && field.format?.decimals !== undefined) {
        return value.toFixed(field.format.decimals);
      }
      return value;

    case 'BOOLEAN':
      return value ? 'Yes' : 'No';

    case 'STATUS':
      // Status formatting handled by component
      return value;

    default:
      return value;
  }
}

/**
 * V2 Monitor Renderer Component
 */
export function V2MonitorRenderer({ monitor, data, loading, error }: V2MonitorRendererProps) {
  const config = parseDisplayConfig(monitor);

  if (!config) {
    return <MonitorError error="Invalid display configuration" />;
  }

  if (loading) {
    return <div className="monitor-loading">Loading...</div>;
  }

  if (error) {
    return <MonitorError error={error} />;
  }

  // Check if we have data to display
  const hasData = data && typeof data === 'object';

  if (!hasData) {
    return <MonitorEmpty config={config} />;
  }

  // Resolve and format field values
  const fieldValues = config.fields?.map((field) => {
    const value = resolveFieldValue(data, field);
    const formattedValue = formatFieldValue(value, field);

    // Determine status tone for STATUS fields
    let statusTone = 'neutral';
    if (field.type === 'STATUS' && field.statusMap && value != null) {
      const stringValue = String(value);
      const mapping = field.statusMap[stringValue];
      statusTone = mapping?.tone || 'neutral';
    }

    return {
      key: field.key,
      label: field.label,
      value: value,
      formattedValue: formattedValue,
      type: field.type,
      primary: field.primary || false,
      hidden: field.hidden || false,
      path: field.path,
      statusTone: field.type === 'STATUS' ? statusTone : undefined,
      statusMap: field.statusMap,
      order: field.order,
    };
  }) || [];

  // Prepare array data for table components
  let arrayData = undefined;
  if (config.component === 'TABLE' || config.component === 'DATA_TABLE' || config.component === 'ERROR_LOG') {
    const arrayPath = config.data?.arrayPath || '$.data';
    if (arrayPath.startsWith('$.')) {
      const path = arrayPath.substring(2);
      arrayData = path.split('.').reduce((obj: any, key: string) => obj?.[key], data);
      if (!Array.isArray(arrayData)) {
        arrayData = [data];
      }
    } else {
      arrayData = Array.isArray(data) ? data : [data];
    }
  }

  // Render based on component type
  switch (config.component) {
    case 'STATUS_CARD':
      return <StatusCardRenderer config={config} fields={fieldValues} />;

    case 'SUMMARY_CARD':
      return <SummaryCardRenderer config={config} fields={fieldValues} />;

    case 'METRICS_GRID':
      return <MetricsGridRenderer config={config} fields={fieldValues} />;

    case 'PROGRESS':
      return <ProgressRenderer config={config} fields={fieldValues} />;

    case 'TABLE':
    case 'DATA_TABLE':
      return <TableRenderer config={config} fields={fieldValues} arrayData={arrayData} />;

    case 'DETAILS':
    case 'ERROR_LOG':
      return <DetailsRenderer config={config} fields={fieldValues} arrayData={arrayData} rawData={data} />;

    default:
      return <SummaryCardRenderer config={config} fields={fieldValues} />;
  }
}

export default V2MonitorRenderer;

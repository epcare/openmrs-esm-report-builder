/**
 * Shared monitor preview helpers
 * Renders the real MonitorRenderer with the config generated from builder
 * state, fed with endpoint test data or synthesized sample data.
 */

import React from 'react';
import { generateConfigFromState } from './builder-state-machine';
import { MonitorRenderer } from '../renderers/MonitorRenderer';
import type { DisplayConfigV2 } from '../../../types/etl-monitor/etl-monitor-v2.types';

interface MonitorPreviewRendererProps {
  state: any;
}

/**
 * Render the monitor exactly as it will appear on the dashboard
 */
export function MonitorPreviewRenderer({ state }: MonitorPreviewRendererProps) {
  const displayConfig: DisplayConfigV2 = generateConfigFromState(state);

  // Prefer real data captured by the endpoint test, fall back to sample data
  const sampleData = state.testResult?.data || createSampleData(state, displayConfig);

  // Rendered by the exact same MonitorRenderer the dashboard uses — no preview-specific styling
  return <MonitorRenderer config={displayConfig} data={sampleData} loading={false} error={null} />;
}

/**
 * Create sample data for preview based on configured fields
 */
export function createSampleData(state: any, config: DisplayConfigV2): any {
  const { fields, componentType } = state;

  if (!fields || fields.length === 0) {
    return {};
  }

  const sample: any = {};

  fields.forEach((field: any) => {
    const path = field.path;

    if (path.startsWith('$.')) {
      const fieldName = path.slice(2);
      sample[fieldName] = getSampleValueForField(field);
    } else {
      sample[field.key] = getSampleValueForField(field);
    }
  });

  // For table components, create an array of rows
  if (componentType === 'DATA_TABLE' || componentType === 'TABLE' || componentType === 'ERROR_LOG') {
    const arrayPath = config.data?.arrayPath || '$.data';
    const basePath = arrayPath.startsWith('$.') ? arrayPath.slice(2) : 'data';

    sample[basePath] = [
      createRowSample(fields, 0),
      createRowSample(fields, 1, { status: 'COMPLETED', result: 'SUCCESS' }),
      createRowSample(fields, 2, { status: 'FAILED', result: 'ERROR' }),
    ];
  }

  return sample;
}

/**
 * Get a sample value for a specific field type with row index variation
 */
function getSampleValueForField(field: any, rowIndex: number = 0): any {
  switch (field.type) {
    case 'STATUS':
      if (field.statusMappings && field.statusMappings.length > 0) {
        return field.statusMappings[0].rawValue || 'UP';
      }
      return 'UP';
    case 'TIMESTAMP':
      return Date.now() - (rowIndex * 3600000);
    case 'DURATION':
      return 1000 + (rowIndex * 500);
    case 'BOOLEAN':
      return rowIndex % 2 === 0;
    case 'NUMBER':
    case 'INTEGER':
    case 'DECIMAL':
      return Math.floor(Math.random() * 1000) + 100 + (rowIndex * 100);
    case 'PERCENTAGE':
      return Math.max(0, Math.min(100, 80 - (rowIndex * 20)));
    case 'DATE':
      return new Date(Date.now() - (rowIndex * 86400000)).toISOString().split('T')[0];
    case 'TIME':
      return new Date(Date.now() - (rowIndex * 3600000)).toTimeString().split(' ')[0];
    default:
      return `Sample ${field.label} ${rowIndex + 1}`;
  }
}

/**
 * Create a sample row for table components
 */
function createRowSample(fields: any[], index: number, overrides: Record<string, any> = {}): any {
  const row: any = { _id: index + 1 };

  fields.forEach((field: any) => {
    const path = field.path;
    let fieldName;

    if (path.startsWith('$.')) {
      fieldName = path.slice(2);
    } else if (path.includes('.')) {
      fieldName = path.split('.').pop();
    } else {
      fieldName = field.key;
    }

    if (overrides[fieldName] !== undefined) {
      row[fieldName] = overrides[fieldName];
    } else {
      row[fieldName] = getSampleValueForField(field, index);
    }
  });

  return row;
}

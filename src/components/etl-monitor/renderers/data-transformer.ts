/**
 * Data Transformer Utilities
 * Transforms raw data into formatted fields for monitor components
 */

import type { DisplayConfigV2, FieldConfiguration } from '../../../types/etl-monitor/etl-monitor-v2.types';
import { formatRelativeTime } from '../../../utils/etl-monitor/value-formatters.util';

/**
 * Field object consumed by the component renderers
 */
export interface RenderedField {
  key: string;
  label: string;
  value: any;
  formattedValue: any;
  type: string;
  primary: boolean;
  hidden: boolean;
  order?: number;
  path?: string;
  description?: string;
  statusTone?: string;
  statusMap?: Record<string, { label?: string; tone?: string }>;
}

/**
 * Check if data is empty based on component configuration.
 * Data may arrive object-shaped (single-record endpoints) or array-shaped
 * (row endpoints) — emptiness is evaluated per component's expectations.
 */
export function isDataEmpty(data: any, config: DisplayConfigV2): boolean {
  if (data === null || data === undefined || data === '') return true;

  switch (config.component) {
    case 'TABLE':
    case 'DATA_TABLE':
    case 'ERROR_LOG':
    case 'LOG':
      // Row-based components: empty only when no rows resolve
      return resolveRawRows(data, config).length === 0;

    case 'STATUS_CARD':
    case 'SUMMARY_CARD':
    case 'PROGRESS':
      // Single-value components render whatever object arrives
      return false;

    case 'METRICS_GRID':
    case 'DETAILS':
    default:
      if (Array.isArray(data)) return data.length === 0;
      if (typeof data === 'object') return Object.keys(data).length === 0;
      return false;
  }
}

/**
 * Resolve the raw row array for row-based components.
 * Honors config.data.arrayPath, then common wrappers (data/items/results),
 * then treats a single object as one row.
 */
export function resolveRawRows(data: any, config: DisplayConfigV2): any[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];

  const arrayPath = config.data?.arrayPath;
  if (arrayPath && arrayPath !== '$') {
    const path = arrayPath.replace(/^\$\.?/, '');
    if (path) {
      const value = path
        .split('.')
        .reduce((obj: any, key: string) => (obj == null ? undefined : obj[key]), data);
      if (Array.isArray(value)) return value;
    }
  }

  if (Array.isArray((data as any).data)) return (data as any).data;
  if (Array.isArray((data as any).items)) return (data as any).items;
  if (Array.isArray((data as any).results)) return (data as any).results;

  return [data];
}

/**
 * Transform raw data into formatted field objects for the component renderers
 */
export function transformDataToFields(data: any, config: DisplayConfigV2): RenderedField[] {
  if (!data || typeof data !== 'object') return [];

  if (Array.isArray(config.fields) && config.fields.length > 0) {
    return config.fields.map((field) => {
      const value = resolveFieldValue(data, field.path || field.key);
      return {
        key: field.key,
        label: field.label || field.key,
        value,
        formattedValue: formatFieldValue(value, field),
        type: field.type || 'TEXT',
        primary: !!field.primary,
        hidden: !!field.hidden,
        order: field.order,
        path: field.path,
        description: field.description,
        statusMap: field.statusMap as any,
        statusTone: field.type === 'STATUS' ? resolveStatusTone(value, field.statusMap) : undefined,
      };
    });
  }

  // No field mappings: expose data properties as fields
  return Object.keys(data).map((key, index) => {
    const type = semanticTypeOf(data[key]);
    const pseudoField = { key, label: key, path: `$.${key}`, type } as FieldConfiguration;
    return {
      key,
      label: key,
      value: data[key],
      formattedValue: formatFieldValue(data[key], pseudoField),
      type,
      primary: index === 0,
      hidden: false,
      order: index,
      path: `$.${key}`,
    };
  });
}

/**
 * Transform resolved rows into plain row objects for table-like components
 */
export function transformArrayDataToRows(data: any, config: DisplayConfigV2): any[] {
  return resolveRawRows(data, config).map((row, index) =>
    row !== null && typeof row === 'object' ? { ...row } : { value: row, _rowIndex: index }
  );
}

/**
 * Parse a dotted path into segments, resolving array indexing.
 * `items[0]`, bare `[0]` and `[*]` markers are supported; `[*]` resolves to
 * the first element (single-value contexts have nothing to fan out over).
 */
function toPathSegments(p: string): Array<string | number> {
  return p.split('.').flatMap((part) => {
    const named = part.match(/^(\w+)\[(\*|\d+)\]$/);
    if (named) return named[2] === '*' ? [named[1], 0] : [named[1], parseInt(named[2], 10)];
    const bare = part.match(/^\[(\*|\d+)\]$/);
    if (bare) return bare[1] === '*' ? [0] : [parseInt(bare[1], 10)];
    return [part];
  });
}

/**
 * Resolve a value from data using a JSONPath-like expression
 * Supports: $.field, $.field.nested, $.list[0].field, $.list[*].field, bare keys
 */
function resolveFieldValue(data: any, path: string): any {
  if (!data || !path) return undefined;

  let p = path;
  if (p === '$' || p === '$.') return data;
  // Legacy row paths were emitted as $[0].field — normalize to $.field
  p = p.replace(/^\$\[\*?\d*\]\.?/, '$.');
  if (p.startsWith('$.')) p = p.slice(2);
  else if (p.startsWith('$')) p = p.slice(1);

  let current = data;
  for (const part of toPathSegments(p)) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Resolve a field's value from a single row (row-based components).
 * Paths are row-relative (`$.startTime`), but root-relative paths from an
 * envelope response (e.g. `$.data.startTime`) also work: the configured
 * `arrayPath` prefix is stripped before walking. `$[0]`/`[*]` markers are
 * tolerated, and an unrecognized path form falls back to a direct
 * `field.key` lookup.
 */
export function resolveRowFieldValue(
  row: any,
  field: { path?: string; key?: string },
  arrayPath?: string,
): any {
  if (!row || typeof row !== 'object' || !field) return undefined;

  let p = field.path || (field.key ? `$.${field.key}` : '');
  if (!p) return undefined;

  // Normalize legacy "$[0].field" row paths
  p = p.replace(/^\$\[\*?\d*\]\.?/, '$.');

  // Strip the configured array prefix so root-relative paths resolve per row
  if (arrayPath && arrayPath !== '$') {
    const base = arrayPath.replace(/\[\*?\]$/, '');
    if (p === base) return row;
    if (p.startsWith(`${base}.`)) p = `$.${p.slice(base.length + 1)}`;
    else if (p.startsWith(`${base}[*].`)) p = `$.${p.slice(base.length + 4)}`;
  }

  if (!p.startsWith('$.')) {
    // Non-standard path form: direct key lookup
    return field.key && field.key in row ? row[field.key] : undefined;
  }

  let current: any = row;
  for (const part of toPathSegments(p.slice(2))) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Check whether a field path resolves to a value (not undefined) in a
 * captured response. Row-based components check against the first resolved
 * row; everything else checks the response root. Missing data (no test run
 * yet) counts as resolving, so validation only warns on real mismatches.
 */
export function pathResolvesInData(
  path: string | undefined,
  data: any,
  arrayPath?: string,
  rowBased?: boolean,
): boolean {
  if (!path || data === null || data === undefined) return true;

  if (rowBased) {
    const rows = resolveRawRows(data, { data: { arrayPath } } as unknown as DisplayConfigV2);
    if (rows.length === 0) return true;
    return resolveRowFieldValue(rows[0], { path }, arrayPath) !== undefined;
  }

  return resolveFieldValue(data, path) !== undefined;
}

/**
 * Resolve the tone for a STATUS field value via its statusMap
 */
function resolveStatusTone(
  value: any,
  statusMap?: Record<string, { label?: string; tone?: string }>
): string | undefined {
  if (value === null || value === undefined || !statusMap) return undefined;
  const raw = String(value);
  const mapping = statusMap[raw] ?? statusMap[raw.toLowerCase()] ?? statusMap[raw.toUpperCase()];
  return mapping?.tone || determineTone(value);
}

/**
 * Guess a status tone from common status values
 */
function determineTone(value: any): string {
  const s = String(value).toUpperCase();
  if (['UP', 'ACTIVE', 'SUCCESS', 'OK', 'HEALTHY', 'COMPLETED'].includes(s)) return 'success';
  if (['DOWN', 'ERROR', 'FAILED', 'CRITICAL', 'UNHEALTHY'].includes(s)) return 'critical';
  if (['WARNING', 'DEGRADED', 'PENDING'].includes(s)) return 'warning';
  return 'neutral';
}

/**
 * Format a value according to its semantic field type
 */
function formatFieldValue(value: any, field: any): any {
  if (value === null || value === undefined || value === '') {
    return field.defaultValue ?? '—';
  }

  switch (field.type) {
    case 'STATUS': {
      if (field.statusMap) {
        const raw = String(value);
        const mapping =
          field.statusMap[raw] ?? field.statusMap[raw.toLowerCase()] ?? field.statusMap[raw.toUpperCase()];
        if (mapping?.label) return mapping.label;
      }
      return String(value);
    }

    case 'PERCENTAGE':
      return typeof value === 'number' ? `${Math.round(value)}%` : String(value);

    case 'TIMESTAMP': {
      const display = field.format?.timestamp?.display;
      if (display === 'datetime' || display === 'date' || display === 'time') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          if (display === 'date') return date.toLocaleDateString();
          if (display === 'time') return date.toLocaleTimeString();
          return date.toLocaleString();
        }
      }
      return formatRelativeTime(value);
    }

    case 'DURATION': {
      if (typeof value !== 'number') return String(value);
      const unitMs =
        field.format?.duration?.inputUnit === 'seconds'
          ? 1000
          : field.format?.duration?.inputUnit === 'minutes'
            ? 60000
            : 1; // default input is milliseconds
      const totalSeconds = Math.floor((value * unitMs) / 1000);
      if (totalSeconds < 60) return `${totalSeconds}s`;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      if (minutes < 60) return `${minutes}m ${seconds}s`;
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m`;
    }

    case 'BOOLEAN':
      return value ? 'Yes' : 'No';

    case 'NUMBER':
    case 'INTEGER':
    case 'DECIMAL': {
      if (typeof value === 'number' && field.format?.number?.decimals !== undefined) {
        return value.toFixed(field.format.number.decimals);
      }
      return value;
    }

    default:
      return typeof value === 'object' ? JSON.stringify(value) : value;
  }
}

/**
 * Format a raw value according to a field's semantic type/config.
 * Shared by the table-like renderers so cells read the same as
 * the field-based components.
 */
export function formatSemanticValue(value: any, field: any): any {
  return formatFieldValue(value, field);
}

/**
 * Guess a semantic type from a raw value
 */
function semanticTypeOf(value: any): string {
  if (typeof value === 'boolean') return 'BOOLEAN';
  if (typeof value === 'number') return 'NUMBER';
  if (value instanceof Date) return 'TIMESTAMP';
  return 'TEXT';
}

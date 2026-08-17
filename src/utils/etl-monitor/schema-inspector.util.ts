/**
 * Schema Inspector Utility
 * Provides functions for inspecting JSON schema and API response structures
 */

/**
 * Inspect a JSON object and return its schema structure
 */
export function inspectSchema(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return { type: typeof obj };
  }

  if (Array.isArray(obj)) {
    return {
      type: 'array',
      items: obj.length > 0 ? inspectSchema(obj[0]) : { type: 'unknown' },
    };
  }

  const properties: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      properties[key] = inspectSchema(obj[key]);
    }
  }

  return { type: 'object', properties };
}

/**
 * Get all keys from a nested object
 */
export function getAllKeys(obj: any, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') {
    return [];
  }

  const keys: string[] = [];

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);

      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys.push(...getAllKeys(obj[key], fullKey));
      }
    }
  }

  return keys;
}

/**
 * Check if a value is empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  if (typeof value === 'string') {
    return value.trim() === '';
  }

  return false;
}

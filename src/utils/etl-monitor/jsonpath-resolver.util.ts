/**
 * JSONPath Resolver Utility
 * Extract values from JSON using JSONPath-like expressions
 */

/**
 * Get value from object using a simple path expression
 * Supports dot notation and array indexing
 */
export function resolvePath(obj: any, path: string): any {
  if (!obj || !path) {
    return undefined;
  }

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle array indexing: items[0]
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = current[key];
      if (Array.isArray(current)) {
        current = current[parseInt(index, 10)];
      }
    } else {
      current = current[part];
    }
  }

  return current;
}

/**
 * Set value in object using path
 */
export function setPath(obj: any, path: string, value: any): void {
  if (!obj || !path) {
    return;
  }

  const parts = path.split('.');
  const lastPart = parts.pop()!;
  let current = obj;

  for (const part of parts) {
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }

  current[lastPart] = value;
}

/**
 * Get all values matching a pattern
 */
export function resolvePattern(obj: any, pattern: string): any[] {
  if (!obj || !pattern) {
    return [];
  }

  // Convert * pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '[^.]*');
  const regex = new RegExp(`^${regexPattern}$`);

  const results: any[] = [];

  function traverse(current: any, currentPath: string) {
    if (typeof current !== 'object' || current === null) {
      return;
    }

    for (const key in current) {
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        if (regex.test(newPath)) {
          results.push({ path: newPath, value: current[key] });
        }
        traverse(current[key], newPath);
      }
    }
  }

  traverse(obj, '');
  return results;
}

/**
 * Extract field value using various strategies
 */
export function extractFieldValue(data: any, field: string): any {
  // Try direct property access
  if (field in data) {
    return data[field];
  }

  // Try dot notation
  const dotValue = resolvePath(data, field);
  if (dotValue !== undefined) {
    return dotValue;
  }

  // Try bracket notation
  if (data[field] !== undefined) {
    return data[field];
  }

  return undefined;
}

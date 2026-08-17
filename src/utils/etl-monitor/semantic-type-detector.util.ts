/**
 * Semantic Type Detector Utility
 * Detects semantic types from field names and values
 */

/**
 * Detect semantic type from field name and value
 */
export function detectSemanticType(fieldName: string, value: any): string {
  const name = fieldName.toLowerCase();

  // Date patterns
  if (name.includes('date') || name.includes('time')) {
    if (isValidDate(value)) {
      return name.includes('time') ? 'DATETIME' : 'DATE';
    }
  }

  // Number patterns
  if (name.includes('count') || name.includes('num') || name.includes('qty')) {
    if (typeof value === 'number') {
      return 'NUMBER';
    }
  }

  // Status patterns
  if (name.includes('status') || name.includes('state')) {
    return 'STATUS';
  }

  // ID patterns
  if (name.includes('id') || name.includes('uuid')) {
    return 'ID';
  }

  // Boolean patterns
  if (name.startsWith('is') || name.startsWith('has')) {
    if (typeof value === 'boolean') {
      return 'BOOLEAN';
    }
  }

  // Default to string
  return typeof value;
}

/**
 * Check if value is a valid date
 */
function isValidDate(value: any): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Get format hint for semantic type
 */
export function getFormatHint(semanticType: string): string {
  switch (semanticType) {
    case 'DATE':
      return 'YYYY-MM-DD';
    case 'DATETIME':
      return 'YYYY-MM-DD HH:mm:ss';
    case 'NUMBER':
      return '#,##0.00';
    case 'PERCENTAGE':
      return '0.0%';
    case 'BOOLEAN':
      return 'true/false';
    case 'STATUS':
      return 'enum';
    default:
      return 'text';
  }
}

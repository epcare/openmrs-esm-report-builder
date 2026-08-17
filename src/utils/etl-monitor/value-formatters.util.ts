/**
 * Value Formatters Utility
 * Format values for display based on type
 */

/**
 * Format value based on type
 */
export function formatValue(value: any, type: string, options?: any): string {
  if (value === null || value === undefined) {
    return '—';
  }

  switch (type) {
    case 'DATE':
      return formatDate(value);
    case 'DATETIME':
      return formatDateTime(value);
    case 'NUMBER':
      return formatNumber(value, options?.decimals);
    case 'PERCENTAGE':
      return formatPercentage(value);
    case 'CURRENCY':
      return formatCurrency(value, options?.currency);
    case 'BOOLEAN':
      return value ? 'Yes' : 'No';
    case 'DURATION':
      return formatDuration(value);
    case 'FILE_SIZE':
      return formatFileSize(value);
    default:
      return String(value);
  }
}

/**
 * Format date
 */
export function formatDate(value: any): string {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format datetime
 */
export function formatDateTime(value: any): string {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

/**
 * Format number
 */
export function formatNumber(value: any, decimals = 2): string {
  if (typeof value !== 'number') return String(value);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format percentage
 */
export function formatPercentage(value: any): string {
  if (typeof value !== 'number') return String(value);
  return `${value.toFixed(1)}%`;
}

/**
 * Format currency
 */
export function formatCurrency(value: any, currency = 'USD'): string {
  if (typeof value !== 'number') return String(value);
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format duration (milliseconds)
 */
export function formatDuration(value: any): string {
  if (typeof value !== 'number') return String(value);

  const seconds = Math.floor(value / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (typeof bytes !== 'number') return String(bytes);

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

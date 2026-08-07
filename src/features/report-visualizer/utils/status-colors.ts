/**
 * Status Color Coding Utilities
 *
 * Maps status values to Carbon Tag colors for consistent visual feedback.
 *
 * Phase 7.1: Status color coding
 */

export type StatusColorType = 'green' | 'red' | 'gray' | 'blue' | 'cool-gray' | 'warm-gray' | 'high-contrast' | 'cyan' | 'purple' | 'teal' | 'magenta' | 'outline';

/**
 * Common status values and their color mappings
 * Extend this map as needed for specific reports
 */
const STATUS_COLOR_MAP: Record<string, StatusColorType> = {
  // Positive/Success statuses
  'completed': 'green',
  'complete': 'green',
  'done': 'green',
  'finished': 'green',
  'success': 'green',
  'active': 'green',
  'open': 'green',
  'admitted': 'green',
  'started': 'green',
  'scheduled': 'blue',
  'pending': 'blue',

  // Negative/Error statuses
  'missed': 'red',
  'missed appointment': 'red',
  'failed': 'red',
  'error': 'red',
  'cancelled': 'gray',
  'canceled': 'gray',
  'closed': 'gray',
  'inactive': 'gray',
  'lost to follow-up': 'red',
  'lftu': 'red',
  'dead': 'gray',
  'deceased': 'gray',
  'died': 'gray',

  // Warning statuses - use warm-gray for warnings
  'rescheduled': 'warm-gray',
  'deferred': 'warm-gray',
  'on hold': 'warm-gray',
  'warning': 'red',

  // Default for unknown statuses
  'unknown': 'cool-gray',
};

/**
 * Get the color type for a status value
 * @param status - The status value to color
 * @returns Carbon Tag color type
 */
export function getStatusColor(status: string | undefined | null): StatusColorType {
  if (!status) return 'cool-gray';

  // Check exact match (case-insensitive)
  const normalizedStatus = status.toLowerCase().trim();
  if (STATUS_COLOR_MAP[normalizedStatus]) {
    return STATUS_COLOR_MAP[normalizedStatus];
  }

  // Check for partial matches
  if (normalizedStatus.includes('complet') || normalizedStatus.includes('success')) {
    return 'green';
  }
  if (normalizedStatus.includes('miss') || normalizedStatus.includes('fail')) {
    return 'red';
  }
  if (normalizedStatus.includes('resched') || normalizedStatus.includes('defer')) {
    return 'warm-gray';
  }
  if (normalizedStatus.includes('cancel') || normalizedStatus.includes('close')) {
    return 'gray';
  }
  if (normalizedStatus.includes('pend') || normalizedStatus.includes('sched')) {
    return 'blue';
  }

  // Default color
  return 'cool-gray';
}

/**
 * Check if a column name likely contains status values
 * @param columnName - The column name to check
 * @returns True if the column likely contains status values
 */
export function isStatusColumn(columnName: string): boolean {
  const statusKeywords = [
    'status',
    'state',
    'result',
    'outcome',
    'condition',
    'appointment',
    'visit',
  ];
  const lowerColumn = columnName.toLowerCase();
  return statusKeywords.some(keyword => lowerColumn.includes(keyword));
}

/**
 * Render a status value as a colored tag
 * @param status - The status value
 * @returns Object with color type for Carbon Tag
 */
export function getStatusTagColor(status: string | undefined | null): {
  type: StatusColorType;
} {
  return { type: getStatusColor(status) };
}

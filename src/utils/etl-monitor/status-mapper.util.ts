/**
 * Status Mapper Utility
 * Map status values to display colors and labels
 */

/**
 * Get status color for a status value
 */
export function getStatusColor(status: string): string {
  const normalizedStatus = status?.toLowerCase() || '';

  const colorMap: Record<string, string> = {
    // Success states
    success: 'green',
    completed: 'green',
    complete: 'green',
    finished: 'green',
    done: 'green',
    ok: 'green',
    active: 'blue',
    running: 'blue',
    in_progress: 'blue',
    started: 'blue',

    // Warning states
    warning: 'orange',
    pending: 'orange',
    waiting: 'orange',
    queued: 'orange',
    retry: 'orange',

    // Error states
    error: 'red',
    failed: 'red',
    failure: 'red',
    stopped: 'red',
    cancelled: 'gray',
    canceled: 'gray',

    // Information states
    info: 'blue',
    unknown: 'gray',
  };

  return colorMap[normalizedStatus] || 'gray';
}

/**
 * Get status label (human-readable)
 */
export function getStatusLabel(status: string): string {
  const normalizedStatus = status?.toLowerCase() || '';

  const labelMap: Record<string, string> = {
    success: 'Success',
    completed: 'Completed',
    complete: 'Complete',
    finished: 'Finished',
    done: 'Done',
    ok: 'OK',
    active: 'Active',
    running: 'Running',
    in_progress: 'In Progress',
    started: 'Started',
    warning: 'Warning',
    pending: 'Pending',
    waiting: 'Waiting',
    queued: 'Queued',
    retry: 'Retrying',
    error: 'Error',
    failed: 'Failed',
    failure: 'Failure',
    stopped: 'Stopped',
    cancelled: 'Cancelled',
    canceled: 'Cancelled',
    info: 'Info',
    unknown: 'Unknown',
  };

  return labelMap[normalizedStatus] || status || 'Unknown';
}

/**
 * Check if status is successful
 */
export function isSuccessfulStatus(status: string): boolean {
  const color = getStatusColor(status);
  return color === 'green';
}

/**
 * Check if status is error state
 */
export function isErrorStatus(status: string): boolean {
  const color = getStatusColor(status);
  return color === 'red';
}

/**
 * Check if status is running
 */
export function isRunningStatus(status: string): boolean {
  const color = getStatusColor(status);
  return color === 'blue';
}

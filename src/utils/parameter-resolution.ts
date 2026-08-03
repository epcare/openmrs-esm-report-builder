/**
 * Parameter Resolution Utilities
 *
 * Utilities for resolving relative periods to actual dates.
 * Used for date range parameters in reports.
 */

import dayjs from 'dayjs';

export type RelativePeriod =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'LAST_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'LAST_QUARTER'
  | 'THIS_YEAR'
  | 'LAST_YEAR'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'LAST_90_DAYS';

/**
 * Relative period options for UI dropdown
 */
export const RELATIVE_PERIOD_OPTIONS: Array<{ value: RelativePeriod; label: string }> = [
  { value: 'TODAY', label: 'Today' },
  { value: 'YESTERDAY', label: 'Yesterday' },
  { value: 'THIS_WEEK', label: 'This Week' },
  { value: 'LAST_WEEK', label: 'Last Week' },
  { value: 'THIS_MONTH', label: 'This Month' },
  { value: 'LAST_MONTH', label: 'Last Month' },
  { value: 'THIS_QUARTER', label: 'This Quarter' },
  { value: 'LAST_QUARTER', label: 'Last Quarter' },
  { value: 'THIS_YEAR', label: 'This Year' },
  { value: 'LAST_YEAR', label: 'Last Year' },
  { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
  { value: 'LAST_30_DAYS', label: 'Last 30 Days' },
  { value: 'LAST_90_DAYS', label: 'Last 90 Days' },
];

/**
 * Resolves a relative period to a date range
 * @param period - The relative period identifier
 * @returns Object with start and end dates
 */
export function resolveRelativePeriod(period: RelativePeriod): { start: Date; end: Date } {
  const now = new Date();

  switch (period) {
    case 'TODAY':
      return { start: now, end: now };

    case 'YESTERDAY': {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return { start: yesterday, end: yesterday };
    }

    case 'THIS_WEEK': {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() + (6 - now.getDay()));
      return { start: weekStart, end: weekEnd };
    }

    case 'LAST_WEEK': {
      const lastWeekStart = new Date(now);
      lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
      const lastWeekEnd = new Date(now);
      lastWeekEnd.setDate(now.getDate() - now.getDay() - 1);
      return { start: lastWeekStart, end: lastWeekEnd };
    }

    case 'THIS_MONTH': {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    }

    case 'LAST_MONTH': {
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    }

    case 'THIS_QUARTER': {
      const quarter = Math.floor(now.getMonth() / 3);
      return {
        start: new Date(now.getFullYear(), quarter * 3, 1),
        end: new Date(now.getFullYear(), (quarter + 1) * 3, 0),
      };
    }

    case 'LAST_QUARTER': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      if (currentQuarter === 0) {
        return {
          start: new Date(now.getFullYear() - 1, 9, 1),
          end: new Date(now.getFullYear() - 1, 12, 0),
        };
      }
      return {
        start: new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1),
        end: new Date(now.getFullYear(), currentQuarter * 3, 0),
      };
    }

    case 'THIS_YEAR': {
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 12, 0),
      };
    }

    case 'LAST_YEAR': {
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 12, 0),
      };
    }

    case 'LAST_7_DAYS': {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      return { start: sevenDaysAgo, end: now };
    }

    case 'LAST_30_DAYS': {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return { start: thirtyDaysAgo, end: now };
    }

    case 'LAST_90_DAYS': {
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(now.getDate() - 90);
      return { start: ninetyDaysAgo, end: now };
    }

    default:
      throw new Error(`Unknown relative period: ${period}`);
  }
}

/**
 * Formats a date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

/**
 * Formats a date as DD/MM/YYYY for display
 */
export function formatDisplayDate(date: Date): string {
  return dayjs(date).format('DD/MM/YYYY');
}

/**
 * Parses a date string in YYYY-MM-DD format to Date object
 */
export function parseDate(dateString: string): Date | null {
  const parsed = dayjs(dateString, 'YYYY-MM-DD', true);
  return parsed.isValid() ? parsed.toDate() : null;
}

/**
 * Validates if a string is a valid date in YYYY-MM-DD format
 */
export function isValidDate(dateString: string): boolean {
  return dayjs(dateString, 'YYYY-MM-DD', true).isValid();
}

/**
 * Gets a display label for a relative period
 */
export function getRelativePeriodLabel(period: RelativePeriod): string {
  const option = RELATIVE_PERIOD_OPTIONS.find(opt => opt.value === period);
  return option?.label || period;
}

/**
 * Resolves a parameter value to an actual date string
 * Handles both FIXED and RELATIVE modes
 */
export function resolveParameterValue(
  value: { mode: 'FIXED' | 'RELATIVE'; fixedDate?: string; relativePeriod?: RelativePeriod }
): string {
  if (!value) {
    return formatDate(new Date());
  }

  if (value.mode === 'FIXED' && value.fixedDate) {
    return value.fixedDate;
  }

  if (value.mode === 'RELATIVE' && value.relativePeriod) {
    const { start } = resolveRelativePeriod(value.relativePeriod);
    return formatDate(start);
  }

  return formatDate(new Date());
}

/**
 * Type guard to check if a value is a date parameter value
 */
export function isDateParameterValue(
  value: any
): value is { mode: 'FIXED' | 'RELATIVE'; fixedDate?: string; relativePeriod?: RelativePeriod } {
  return value && typeof value === 'object' && 'mode' in value;
}

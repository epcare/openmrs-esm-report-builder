/**
 * ETL Task card metadata utilities
 *
 * Pure helpers used by the ETL Tasks admin page to derive card metadata
 * (last run, next run, duration) from the OpenMRS task definition and the
 * configured task -> monitor binding.
 *
 * No framework imports — safe to unit test in isolation.
 */

import { formatDuration } from '../etl-monitor/value-formatters.util';
import type { ETLMonitorDto } from '../../types/etl-monitor';

const DAY_MS = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Parse a date leniently. OpenMRS serializes dates with colon-less UTC
 * offsets (e.g. `+0300`) which Safari's `Date` parser rejects; normalize
 * them to `+03:00` before parsing. Returns null for unusable values.
 */
export function parseLenientDate(value?: string | number | Date | null): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') return isNaN(value) ? null : new Date(value);
  if (typeof value !== 'string') return null;

  const normalized = value.trim().replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Local calendar-day difference between a date and now: 0 = today,
 * -1 = yesterday, etc.
 */
function calendarDayOffset(date: Date, now: Date): number {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS);
}

/** `Today, 09:12` / `Yesterday, 21:04` / `12 Aug, 09:12` */
function formatDayTimeLabel(date: Date, now: Date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;
  const offset = calendarDayOffset(date, now);
  if (offset === 0) return `Today, ${time}`;
  if (offset === -1) return `Yesterday, ${time}`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${time}`;
}

/**
 * Format a last-run timestamp for the card metadata row.
 */
export function formatLastRun(value?: string | number | Date | null): string {
  const date = parseLenientDate(value);
  if (!date) return value === null || value === undefined || value === '' ? '—' : String(value);
  return formatDayTimeLabel(date);
}

/**
 * Compute the next run time from the last execution time plus the repeat
 * interval (seconds). Returns null when the task is not repeating or the
 * inputs are unusable. Never clamps to the current time.
 */
export function computeNextRun(
  lastExecutionTime?: string | number | Date | null,
  repeatIntervalSeconds?: number | null,
): Date | null {
  const last = parseLenientDate(lastExecutionTime);
  if (!last) return null;
  if (typeof repeatIntervalSeconds !== 'number' || !isFinite(repeatIntervalSeconds) || repeatIntervalSeconds <= 0) {
    return null;
  }
  return new Date(last.getTime() + repeatIntervalSeconds * 1000);
}

/**
 * Format a computed next-run date for the card metadata row.
 */
export function formatNextRun(nextRun: Date | null): string {
  return nextRun ? formatDayTimeLabel(nextRun) : 'Not scheduled';
}

/**
 * Format the repeat interval (seconds) for the details view, e.g.
 * `Every 30 min`, `Every 6 h`, `Every 2 d`.
 */
export function formatRepeatInterval(seconds?: number | null): string {
  if (typeof seconds !== 'number' || !isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return `Every ${seconds} s`;
  const trim = (n: number) => String(Math.round(n * 10) / 10);
  if (seconds < 3600) return `Every ${trim(seconds / 60)} min`;
  if (seconds < DAY_MS / 1000) return `Every ${trim(seconds / 3600)} h`;
  return `Every ${trim(seconds / 86400)} d`;
}

/**
 * Resolve the ETL monitor referenced by a config value. The value may be a
 * monitor uuid (matched exactly, then case-insensitively) or a monitor code
 * (case-insensitive).
 */
export function findMonitorByRef(
  monitors: ETLMonitorDto[] | undefined | null,
  ref?: string | null,
): ETLMonitorDto | undefined {
  if (!monitors || monitors.length === 0) return undefined;
  if (typeof ref !== 'string' || !ref.trim()) return undefined;
  const value = ref.trim();

  return (
    monitors.find((m) => m?.uuid === value) ??
    monitors.find((m) => m?.uuid?.toLowerCase() === value.toLowerCase()) ??
    monitors.find((m) => m?.code?.toLowerCase() === value.toLowerCase())
  );
}

export interface ResolvedProgressMonitor {
  /** The raw config value (trimmed) this entry came from */
  ref: string;
  /** The resolved monitor, or undefined when the ref matched nothing */
  monitor?: ETLMonitorDto;
}

/**
 * Resolve the `etlTasks.progressMonitors` config list against the available
 * monitors, in config order. Entries that resolve to the same monitor are
 * deduplicated; unresolved entries are kept so typos stay visible.
 */
export function resolveProgressMonitors(
  monitors: ETLMonitorDto[] | undefined | null,
  refs?: string[] | null,
): ResolvedProgressMonitor[] {
  if (!refs || refs.length === 0) return [];

  const seenUuids = new Set<string>();
  const resolved: ResolvedProgressMonitor[] = [];

  for (const ref of refs) {
    if (typeof ref !== 'string' || !ref.trim()) continue;
    const monitor = findMonitorByRef(monitors, ref);
    if (monitor) {
      if (seenUuids.has(monitor.uuid)) continue;
      seenUuids.add(monitor.uuid);
    }
    resolved.push({ ref: ref.trim(), monitor });
  }

  return resolved;
}

const DURATION_KEY_PATTERN = /duration|elapsed|runtime/i;
const SECONDS_KEY_PATTERN = /sec/i;
const MILLISECONDS_KEY_PATTERN = /milli|_ms\b|ms$/i;
const MAX_SEARCH_DEPTH = 3;

/**
 * Normalize a numeric duration to milliseconds using its key as a hint:
 * `*ms*`/`*milli*` keys stay as-is, `*seconds*` keys scale by 1000, and
 * bare values under 1000 are assumed to be seconds (sub-second ETL
 * durations are rare, while bare seconds are common).
 */
function normalizeDurationMs(value: number, key: string): number {
  if (MILLISECONDS_KEY_PATTERN.test(key)) return value;
  if (SECONDS_KEY_PATTERN.test(key)) return value * 1000;
  return value < 1000 ? value * 1000 : value;
}

function durationFromEntry(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && isFinite(value)) {
    return formatDuration(normalizeDurationMs(value, key));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    if (!isNaN(numeric) && trimmed !== '') {
      return formatDuration(normalizeDurationMs(numeric, key));
    }
    return trimmed;
  }
  return null;
}

/**
 * Search a monitor's raw response for a duration-like value
 * (keys matching /duration|elapsed|runtime/i, bounded depth, cycle-safe).
 * Returns the formatted duration string, or null when nothing usable is found.
 */
export function extractDurationFromMonitorData(rawResponse: unknown): string | null {
  const visited = new WeakSet<object>();

  const search = (node: unknown, key: string, depth: number): string | null => {
    if (node === null || node === undefined || depth > MAX_SEARCH_DEPTH) return null;

    if (DURATION_KEY_PATTERN.test(key)) {
      const result = durationFromEntry(key, node);
      if (result !== null) return result;
    }

    if (typeof node !== 'object') return null;
    if (visited.has(node as object)) return null;
    visited.add(node as object);

    const entries = Array.isArray(node)
      ? node.map((item, index) => [String(index), item] as const)
      : Object.entries(node as Record<string, unknown>);

    for (const [childKey, childValue] of entries) {
      const result = search(childValue, childKey, depth + 1);
      if (result !== null) return result;
    }
    return null;
  };

  return search(rawResponse, '', 0);
}

const STATUS_KEY_PATTERN = /^(status|state)$/i;

/**
 * Count entries in a monitor's raw response whose status matches a pattern.
 * Two shapes are recognized (bounded depth, cycle-safe):
 * - arrays of objects with a `status`/`state` string field, e.g.
 *   `{ jobs: [{ status: 'RUNNING' }, { status: 'COMPLETED' }] }`
 * - numeric count fields whose key matches the pattern, e.g. `{ runningCount: 3 }`
 *
 * Returns undefined when nothing matches (no data / unknown), so callers can
 * distinguish "confirmed zero" from "no signal".
 */
export function countStatusEntries(rawResponse: unknown, valuePattern: RegExp): number | undefined {
  if (rawResponse === null || rawResponse === undefined || typeof rawResponse !== 'object') return undefined;

  const visited = new WeakSet<object>();
  let found: number | undefined = undefined;

  const walk = (node: unknown, depth: number): void => {
    if (node === null || node === undefined || depth > MAX_SEARCH_DEPTH) return;
    if (typeof node !== 'object' || visited.has(node as object)) return;
    visited.add(node as object);

    const entries = Array.isArray(node)
      ? node.map((item) => ['', item] as const)
      : Object.entries(node as Record<string, unknown>);

    for (const [key, value] of entries) {
      if (typeof value === 'number' && isFinite(value) && valuePattern.test(key)) {
        found = (found ?? 0) + value;
      } else if (STATUS_KEY_PATTERN.test(key) && typeof value === 'string' && valuePattern.test(value)) {
        found = (found ?? 0) + 1;
      } else if (typeof value === 'object' && value !== null) {
        walk(value, depth + 1);
      }
    }
  };

  walk(rawResponse, 0);
  return found;
}

/**
 * Sum `countStatusEntries` across several monitor raw responses.
 * Returns undefined only when no response yields a signal.
 */
export function sumStatusCounts(rawResponses: Array<unknown | null | undefined>, valuePattern: RegExp): number | undefined {
  let total: number | undefined = undefined;
  for (const raw of rawResponses) {
    const count = countStatusEntries(raw, valuePattern);
    if (count !== undefined) {
      total = (total ?? 0) + count;
    }
  }
  return total;
}

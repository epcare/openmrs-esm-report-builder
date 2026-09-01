/**
 * Dashboard Config Utilities
 * Parsing, span normalization, monitor-layout extraction and the full
 * explicit-widgets + auto-include resolution engine for dashboard configs.
 * Normative behaviour: docs/DASHBOARD_FRONTEND_INSTRUCTIONS.md §3.2.
 */

import type {
  DashboardConfigV1,
  DashboardSectionConfig,
  ResolvedDashboard,
  ResolvedDashboardSection,
  ResolvedWidgetSlot,
} from '../../../types/dashboard';
import type { ETLMonitorDto, LayoutMetadata, MonitorComponentType, ResponsiveSpan } from '../../../types/etl-monitor';
import type { ReportDto } from '../../../resources/report/reports.api';
import { adaptLegacyConfigToV2, parseDisplayConfig } from '../../../utils/etl-monitor';
import { getDefaultLayout } from '../../../types/etl-monitor/etl-monitor-v2.types';

export const DASHBOARD_CONFIG_SCHEMA_VERSION = 1;

/** Sections used when the config declares none (and their canonical defaults) */
export const DEFAULT_SECTIONS: DashboardSectionConfig[] = [
  { key: 'overview', label: 'Overview', order: 10 },
  { key: 'execution', label: 'Execution', order: 20 },
  { key: 'history', label: 'History', order: 30 },
  { key: 'errors', label: 'Errors', order: 40 },
  { key: 'configuration', label: 'Configuration & Advanced Settings', order: 50, collapsed: true },
];

export const DEFAULT_EXPLICIT_SPAN: ResponsiveSpan = { sm: 4, md: 8, lg: 8 };

/** Bucket for widgets/monitors whose section key matches no configured section */
export const OTHER_SECTION_KEY = '__other';

// ========================
// Parsing
// ========================

/**
 * Parse a dashboard's configJson. Anything other than a valid JSON object
 * with schemaVersion === 1 is treated as "unknown" — callers synthesize a
 * fallback config and show a warning banner.
 */
export function parseDashboardConfig(
  configJson?: string | null,
): { version: 1 | 'unknown'; config: DashboardConfigV1 | null; error?: string } {
  if (!configJson || !configJson.trim()) {
    return { version: 'unknown', config: null };
  }
  try {
    const parsed = JSON.parse(configJson);
    if (parsed && parsed.schemaVersion === DASHBOARD_CONFIG_SCHEMA_VERSION) {
      return { version: 1, config: parsed as DashboardConfigV1 };
    }
    return {
      version: 'unknown',
      config: null,
      error: `Unsupported schemaVersion: ${parsed?.schemaVersion}`,
    };
  } catch (e: any) {
    return { version: 'unknown', config: null, error: e?.message ?? 'Invalid JSON' };
  }
}

/**
 * The fallback config for the ETL dashboard: no explicit sections or
 * widgets — every active ETL monitor is auto-included by its own layout.
 */
export function synthesizeEtlDashboardConfig(): DashboardConfigV1 {
  return {
    schemaVersion: 1,
    sections: [],
    widgets: [],
    autoInclude: { etlMonitors: { enabled: true, arrangeBy: 'monitorLayout' } },
  };
}

// ========================
// Spans
// ========================

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Clamp a span to the Carbon grid breakpoints (sm 0-4, md 0-8, lg 0-16),
 * filling missing values from the breakpoint chain and falling back when
 * a widget would be fully hidden on desktop (lg 0).
 */
export function normalizeSpan(span?: ResponsiveSpan, fallback?: ResponsiveSpan): ResponsiveSpan {
  const fb = fallback ?? DEFAULT_EXPLICIT_SPAN;
  const raw = span ?? {};

  // Nothing specified at all — the fallback IS the span (e.g. the documented {4,8,8})
  const hasAny =
    typeof raw.sm === 'number' || typeof raw.md === 'number' || typeof raw.lg === 'number';
  if (!hasAny) {
    return {
      sm: clamp(fb.sm ?? 4, 0, 4),
      md: clamp(fb.md ?? 8, 0, 8),
      lg: clamp(fb.lg ?? 8, 1, 16),
    };
  }

  // Partial specification — fill missing breakpoints down the chain
  const sm = typeof raw.sm === 'number' && Number.isFinite(raw.sm) ? clamp(raw.sm, 0, 4) : 4;
  const md =
    typeof raw.md === 'number' && Number.isFinite(raw.md) ? clamp(raw.md, 0, 8) : Math.min(8, sm * 2);
  let lg =
    typeof raw.lg === 'number' && Number.isFinite(raw.lg) ? clamp(raw.lg, 0, 16) : Math.min(16, Math.max(md * 2, 4));
  if (lg === 0) {
    lg = clamp(fb.lg ?? 8, 1, 16); // never render an invisible widget on desktop
  }
  return { sm, md, lg };
}

// ========================
// Monitor layout extraction
// ========================

/**
 * Resolve a monitor's layout metadata (section/span/priority) from its
 * displayConfigJson — v2 directly, v1 via the legacy adapter — falling
 * back to getDefaultLayout for its component type. Single source of
 * defaults; deliberately NOT extractLayoutMetadata (category heuristics).
 */
export function extractMonitorLayout(monitor: ETLMonitorDto): LayoutMetadata {
  let component: MonitorComponentType | undefined;
  let layout: LayoutMetadata | undefined;

  try {
    const parsed = parseDisplayConfig(monitor.displayConfigJson);
    if (parsed.version === 2 && parsed.config) {
      component = parsed.config.component;
      layout = parsed.config.layout;
    } else {
      const adapted = adaptLegacyConfigToV2(monitor.displayConfigJson, monitor.monitorType);
      if (adapted) {
        component = adapted.component;
        layout = adapted.layout;
      }
    }
  } catch {
    // fall through to defaults
  }

  if (layout && layout.section) {
    return layout;
  }
  return getDefaultLayout(component ?? 'SUMMARY_CARD');
}

// ========================
// Resolution engine
// ========================

function findMonitor(
  monitors: ETLMonitorDto[],
  refUuid?: string,
  refCode?: string,
): ETLMonitorDto | undefined {
  if (refUuid) {
    const byUuid = monitors.find((m) => m.uuid === refUuid);
    if (byUuid) return byUuid;
  }
  if (refCode) {
    const byCode = monitors.find((m) => m.code === refCode);
    if (byCode) return byCode;
  }
  return undefined;
}

function findReport(reports: ReportDto[], refUuid?: string, refCode?: string): ReportDto | undefined {
  if (refUuid) {
    const byUuid = reports.find((r) => r.uuid === refUuid);
    if (byUuid) return byUuid;
  }
  if (refCode) {
    const byCode = reports.find((r) => r.code === refCode);
    if (byCode) return byCode;
  }
  return undefined;
}

/** Explicit before auto; explicit order asc; auto priority asc; then title asc */
function sortSlots(slots: ResolvedWidgetSlot[]): ResolvedWidgetSlot[] {
  return [...slots].sort((a, b) => {
    if (a.explicit !== b.explicit) return a.explicit ? -1 : 1;
    const explicitDelta = (a.explicitOrder ?? 0) - (b.explicitOrder ?? 0);
    if (explicitDelta !== 0) return explicitDelta;
    const priorityDelta = (a.priority ?? 999) - (b.priority ?? 999);
    if (priorityDelta !== 0) return priorityDelta;
    return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
  });
}

/**
 * Resolve a dashboard config into renderable sections and slots.
 *
 * Step 0 — normalize: null/invalid configs become a synthesized auto-include
 *          config (flagged via `flags.configSynthesized`).
 * Step 1 — explicit widgets first, in authoring order; missing refs become
 *          UNAVAILABLE slots so grid geometry is preserved.
 * Step 2 — autoInclude: active monitors not already placed (explicit wins,
 *          deduped on resolved monitor uuid), appended AFTER explicit slots.
 * Step 3 — unknown section keys bucket into "__other" ("Other", last).
 * Step 4 — order slots, prune empty sections (unless alwaysShow), collect
 *          the ETL monitors + min refresh interval for data fetching.
 */
export function resolveDashboardLayout(
  config: DashboardConfigV1 | null,
  monitors: ETLMonitorDto[],
  reports: ReportDto[],
): ResolvedDashboard {
  const flags = { configSynthesized: false, hadUnknownWidgetTypes: false };

  let effective = config;
  if (!effective) {
    effective = synthesizeEtlDashboardConfig();
    flags.configSynthesized = true;
  }

  // Sections in display order (explicit order, else 10 * (index + 1); ties by array index)
  const rawSections = effective.sections?.length
    ? effective.sections
    : DEFAULT_SECTIONS.map((s) => ({ ...s }));
  const orderedSections = rawSections
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (a.s.order ?? (a.i + 1) * 10) - (b.s.order ?? (b.i + 1) * 10) || a.i - b.i)
    .map((x) => x.s);

  const sectionKeys = new Set(orderedSections.map((s) => s.key));
  const buckets = new Map<string, ResolvedWidgetSlot[]>();
  const bucketFor = (key: string): ResolvedWidgetSlot[] => {
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }
    return bucket;
  };

  const usedSlotKeys = new Set<string>();
  const uniqueSlotKey = (base: string): string => {
    let key = base;
    let n = 2;
    while (usedSlotKeys.has(key)) {
      key = `${base}-${n++}`;
    }
    usedSlotKeys.add(key);
    return key;
  };

  // Step 1 — explicit widgets
  const placedMonitors = new Set<string>();
  (effective.widgets ?? []).forEach((w, idx) => {
    if (!w || !w.widgetType) return;

    const sectionKey = sectionKeys.has(w.sectionKey) ? w.sectionKey : OTHER_SECTION_KEY;
    const explicitOrder = w.order ?? (idx + 1) * 100;
    const span = normalizeSpan(w.span, DEFAULT_EXPLICIT_SPAN);
    const baseKey = w.key || `${w.widgetType}:${w.refUuid ?? w.refCode ?? idx}`;

    if (w.widgetType === 'ETL_MONITOR') {
      const monitor = findMonitor(monitors, w.refUuid, w.refCode);
      if (!monitor) {
        bucketFor(sectionKey).push({
          slotKey: uniqueSlotKey(baseKey),
          status: 'UNAVAILABLE',
          explicit: true,
          explicitOrder,
          title: w.titleOverride ?? w.refCode ?? w.refUuid ?? 'Monitor',
          sectionKey,
          span,
          unavailableReason: 'monitor-missing',
        });
        return;
      }
      if (monitor.uuid) placedMonitors.add(monitor.uuid);
      bucketFor(sectionKey).push({
        slotKey: uniqueSlotKey(baseKey),
        status: 'OK',
        kind: 'ETL',
        explicit: true,
        explicitOrder,
        title: w.titleOverride ?? monitor.name,
        footerLabel: w.footerLabel,
        sectionKey,
        span,
        monitor,
      });
    } else if (w.widgetType === 'REPORT') {
      const report = findReport(reports, w.refUuid, w.refCode);
      bucketFor(sectionKey).push({
        slotKey: uniqueSlotKey(baseKey),
        status: report ? 'OK' : 'UNAVAILABLE',
        kind: 'REPORT',
        explicit: true,
        explicitOrder,
        title: w.titleOverride ?? report?.name ?? w.refCode ?? w.refUuid ?? 'Report',
        footerLabel: w.footerLabel,
        sectionKey,
        span,
        report,
        unavailableReason: report ? undefined : 'report-missing',
      });
    } else {
      flags.hadUnknownWidgetTypes = true;
      bucketFor(sectionKey).push({
        slotKey: uniqueSlotKey(baseKey),
        status: 'UNSUPPORTED',
        explicit: true,
        explicitOrder,
        title: w.titleOverride ?? w.widgetType,
        sectionKey,
        span,
        unsupportedWidgetType: w.widgetType,
      });
    }
  });

  // Step 2 — autoInclude (explicit wins; dedupe on resolved monitor uuid)
  const autoInclude = effective.autoInclude?.etlMonitors;
  if (autoInclude?.enabled) {
    const fallbackSpan = autoInclude.defaultSpan ?? DEFAULT_EXPLICIT_SPAN;
    const queue = monitors
      .filter((m) => m.uuid && !placedMonitors.has(m.uuid))
      .sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          (a.name ?? '').toLowerCase().localeCompare((b.name ?? '').toLowerCase()),
      );

    for (const monitor of queue) {
      const layout = extractMonitorLayout(monitor);
      let sectionKey: string | null = null;
      if (layout.section && sectionKeys.has(layout.section)) {
        sectionKey = layout.section;
      } else if (autoInclude.defaultSectionKey && sectionKeys.has(autoInclude.defaultSectionKey)) {
        sectionKey = autoInclude.defaultSectionKey;
      }
      bucketFor(sectionKey ?? OTHER_SECTION_KEY).push({
        slotKey: uniqueSlotKey(`ETL_MONITOR:${monitor.uuid}`),
        status: 'OK',
        kind: 'ETL',
        explicit: false,
        priority: layout.priority ?? 999,
        title: monitor.name,
        sectionKey: sectionKey ?? OTHER_SECTION_KEY,
        span: normalizeSpan(layout.span, fallbackSpan),
        monitor,
      });
    }
  }

  // Step 3 — the "Other" bucket for unknown section keys, rendered last
  const resolvedSections: ResolvedDashboardSection[] = orderedSections.map((s) => ({
    ...s,
    slots: sortSlots(buckets.get(s.key) ?? []),
  }));
  const otherSlots = buckets.get(OTHER_SECTION_KEY);
  if (otherSlots && otherSlots.length > 0) {
    resolvedSections.push({ key: OTHER_SECTION_KEY, label: 'Other', order: 9999, slots: sortSlots(otherSlots) });
  }

  // Step 4 — prune empty sections and collect data-fetch inputs
  const visibleSections = resolvedSections.filter((s) => s.slots.length > 0 || s.alwaysShow === true);
  const etlMonitors = visibleSections.flatMap((s) =>
    s.slots.filter((slot) => slot.status === 'OK' && slot.kind === 'ETL' && slot.monitor).map((slot) => slot.monitor!),
  );
  const intervals = etlMonitors.map((m) => m.refreshInterval ?? 30);
  const minRefreshInterval = intervals.length > 0 ? Math.max(5, Math.min(...intervals)) : 30;

  return {
    sections: visibleSections,
    etlMonitors,
    minRefreshInterval,
    flags,
  };
}

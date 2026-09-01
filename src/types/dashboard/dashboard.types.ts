/**
 * Dashboard Types
 * Config-driven dashboards: a persisted ReportBuilderDashboard row whose
 * config_json composes sections and widgets (ETL monitors, reports).
 * Schema v1 — see docs/DASHBOARD_FRONTEND_INSTRUCTIONS.md §5.
 */

import type { ETLMonitorDto, ResponsiveSpan } from '../etl-monitor';
import type { ReportDto } from '../../resources/report/reports.api';

/** High-level grouping for dashboards (backend enum mirror) */
export type DashboardType = 'ETL' | 'REPORT' | 'CUSTOM';

/**
 * Widget types supported by the renderer. Open enum: TEXT, INDICATOR etc.
 * may be added later — the renderer skips unknown values and the editor
 * flags them, so widening never breaks old configs.
 */
export type DashboardWidgetType = 'ETL_MONITOR' | 'REPORT';

/** One ordered, optionally collapsible section of the dashboard */
export interface DashboardSectionConfig {
  /** Unique, lowercase kebab key. Canonical: overview | execution | history | errors | configuration */
  key: string;
  /** Rendered as the section header */
  label: string;
  /** Ascending; ties broken by array index. Default 10 * (index + 1) */
  order?: number;
  /** Render the section body inside a collapsed accordion */
  collapsed?: boolean;
  /** Render the section header even when it has no widgets */
  alwaysShow?: boolean;
}

/** An explicitly placed widget on the dashboard */
export interface DashboardWidgetConfig {
  /** Optional stable id; renderer falls back to type:ref */
  key?: string;
  widgetType: DashboardWidgetType;
  /** Exactly one of refUuid | refCode — resolution order: uuid first, then code */
  refUuid?: string;
  refCode?: string;
  /** Must match a section key at render time; unknown keys land in the "__other" bucket */
  sectionKey: string;
  /** Carbon-grid spans (sm 0-4, md 0-8, lg 0-16); 0 = hidden at that breakpoint */
  span?: ResponsiveSpan;
  /** Ordering among explicit widgets within a section. Default 100 * (index + 1) */
  order?: number;
  /** Replaces the monitor/report name in the widget header */
  titleOverride?: string;
  /** Optional footer strip text */
  footerLabel?: string;
}

/** Auto-include configuration: fill sections with monitors not explicitly placed */
export interface DashboardAutoIncludeConfig {
  etlMonitors?: {
    enabled: boolean;
    /** Only supported value in v1: arrange by each monitor's own layout metadata */
    arrangeBy?: 'monitorLayout';
    /** Section for monitors whose layout section is unknown/missing */
    defaultSectionKey?: string;
    /** Span for monitors whose layout span is missing/invalid */
    defaultSpan?: ResponsiveSpan;
  };
}

/** The full dashboard config stored in DashboardDto.configJson */
export interface DashboardConfigV1 {
  schemaVersion: 1;
  sections?: DashboardSectionConfig[];
  widgets?: DashboardWidgetConfig[];
  autoInclude?: DashboardAutoIncludeConfig;
}

/** REST DTO for ws/rest/v1/reportbuilder/dashboard */
export interface DashboardDto {
  uuid: string;
  name: string;
  description?: string;
  code?: string;
  dashboardType?: DashboardType;
  /** Stringified DashboardConfigV1 — only present with v=full */
  configJson?: string;
  active?: boolean;
  sortOrder?: number;
  retired?: boolean;
  dateCreated?: string;
  dateChanged?: string;
}

export type SaveDashboardPayload = Omit<DashboardDto, 'uuid' | 'retired' | 'dateCreated' | 'dateChanged'>;

// ========================
// Resolved (runtime) shapes
// ========================

export type WidgetSlotStatus = 'OK' | 'UNAVAILABLE' | 'UNSUPPORTED';

/** One resolved slot in the grid: an explicit widget or an auto-included monitor */
export interface ResolvedWidgetSlot {
  slotKey: string;
  status: WidgetSlotStatus;
  kind?: 'ETL' | 'REPORT';
  /** true = explicitly placed; false = auto-included */
  explicit: boolean;
  /** Explicit widgets: config order (default 100 * (index + 1)) */
  explicitOrder?: number;
  /** Auto-included widgets: monitor layout priority (default 999) */
  priority?: number;
  title: string;
  footerLabel?: string;
  sectionKey: string;
  span: ResponsiveSpan;
  monitor?: ETLMonitorDto;
  report?: ReportDto;
  unavailableReason?: 'monitor-missing' | 'report-missing';
  unsupportedWidgetType?: string;
}

export interface ResolvedDashboardSection extends DashboardSectionConfig {
  slots: ResolvedWidgetSlot[];
}

export interface ResolvedDashboard {
  sections: ResolvedDashboardSection[];
  /** All monitors that resolved to ETL slots — drives data fetching */
  etlMonitors: ETLMonitorDto[];
  /** Min refreshInterval across included ETL monitors, clamped >= 5 seconds */
  minRefreshInterval: number;
  flags: {
    /** Config was missing/invalid and a synthesized fallback is being shown */
    configSynthesized: boolean;
    /** Config contained widget types this build does not support */
    hadUnknownWidgetTypes: boolean;
  };
}

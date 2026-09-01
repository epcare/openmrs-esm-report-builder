/**
 * Dashboard config validation helpers
 * Shared by the dashboard form modal and the raw-JSON editor tab.
 * Mirrors docs/DASHBOARD_FRONTEND_INSTRUCTIONS.md §3.1 field rules.
 */

import type { DashboardConfigV1, DashboardSectionConfig, DashboardWidgetConfig } from '../../types/dashboard/dashboard.types';
import { DEFAULT_SECTIONS } from '../../features/dashboards/utils/dashboard-config.util';

export const SECTION_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,49}$/;
export const CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,99}$/;

export function createEmptyConfig(): DashboardConfigV1 {
  return {
    schemaVersion: 1,
    sections: DEFAULT_SECTIONS.map((s) => ({ ...s })),
    widgets: [],
    autoInclude: { etlMonitors: { enabled: false } },
  };
}

export function validateSectionKey(key: string): string | null {
  if (!key || !key.trim()) return 'Section key is required';
  if (!SECTION_KEY_PATTERN.test(key)) return 'Section key must be lowercase letters, numbers and dashes (max 50)';
  return null;
}

export function validateDashboardConfig(config: DashboardConfigV1): string[] {
  const errors: string[] = [];
  const sections = config.sections ?? [];

  const seenKeys = new Set<string>();
  for (const section of sections) {
    const keyError = validateSectionKey(section.key);
    if (keyError) {
      errors.push(`Section "${section.key || '(blank)'}": ${keyError}`);
      continue;
    }
    if (seenKeys.has(section.key)) {
      errors.push(`Duplicate section key: "${section.key}"`);
    }
    seenKeys.add(section.key);
    if (!section.label || !section.label.trim()) {
      errors.push(`Section "${section.key}" is missing a label`);
    }
  }

  (config.widgets ?? []).forEach((widget, index) => {
    const label = widget.titleOverride || widget.refUuid || widget.refCode || `#${index + 1}`;
    if (!widget.widgetType) {
      errors.push(`Widget ${label}: widget type is required`);
    }
    if (widget.widgetType === 'ETL_MONITOR' || widget.widgetType === 'REPORT') {
      if (!widget.refUuid && !widget.refCode) {
        errors.push(`Widget ${label}: provide a UUID or a code reference`);
      }
      if (widget.refUuid && widget.refCode) {
        errors.push(`Widget ${label}: provide only one of UUID or code reference`);
      }
    }
    if (!widget.sectionKey || !seenKeys.has(widget.sectionKey)) {
      errors.push(`Widget ${label}: assign it to one of the configured sections`);
    }
    for (const breakpoint of ['sm', 'md', 'lg'] as const) {
      const value = widget.span?.[breakpoint];
      if (value !== undefined && (value < 0 || value > { sm: 4, md: 8, lg: 16 }[breakpoint])) {
        errors.push(`Widget ${label}: span ${breakpoint} must be 0-${{ sm: 4, md: 8, lg: 16 }[breakpoint]}`);
      }
    }
  });

  return errors;
}

export interface ParsedDashboardJson {
  config?: DashboardConfigV1;
  errors: string[];
}

export function parseDashboardConfigJson(json: string): ParsedDashboardJson {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch (e: any) {
    return { errors: [`Invalid JSON: ${e?.message ?? 'parse error'}`] };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { errors: ['Config must be a JSON object'] };
  }
  if (parsed.schemaVersion !== 1) {
    return { errors: ['schemaVersion must be 1'] };
  }
  const config = parsed as DashboardConfigV1;
  return { config, errors: validateDashboardConfig(config) };
}

export type { DashboardConfigV1, DashboardSectionConfig, DashboardWidgetConfig };

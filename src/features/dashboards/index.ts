/**
 * Dashboards feature - public surface
 */
export { DashboardRendererPage, default as DashboardRendererPageDefault } from './DashboardRendererPage';
export { DashboardsPage, default as DashboardsPageDefault } from './DashboardsPage';
export { resolveDashboardLayout, parseDashboardConfig, synthesizeEtlDashboardConfig } from './utils/dashboard-config.util';
export { useDashboard } from './hooks/useDashboard';
export { useDashboards } from './hooks/useDashboards';
export { useDashboardWidgets } from './hooks/useDashboardWidgets';
export { useMonitorDataMap } from './hooks/useMonitorDataMap';
export { default as EtlDashboardPage } from './EtlDashboardPage';

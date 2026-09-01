/**
 * Dashboards feature - public surface
 */
export { DashboardRendererPage, default as DashboardRendererPageDefault } from './DashboardRendererPage';
export { DashboardsPage, default as DashboardsPageDefault } from './DashboardsPage';
export { EtlDashboardPage, default as EtlDashboardPageDefault } from './EtlDashboardPage';
export { resolveDashboardLayout, parseDashboardConfig, synthesizeEtlDashboardConfig } from './utils/dashboard-config.util';
export { useDashboard } from './hooks/useDashboard';
export { useDashboards } from './hooks/useDashboards';
export { useDashboardWidgets } from './hooks/useDashboardWidgets';
export { useMonitorDataMap } from './hooks/useMonitorDataMap';

/**
 * ETL Dashboard Page — /etl-dashboard
 * Alias for the dashboard with code "etl-dashboard". When that config
 * exists it is rendered in place (URL unchanged so nav + hard links keep
 * working); until/unless it does, a synthesized auto-include view of all
 * active ETL monitors is rendered — the pre-config behavior, zero migration.
 */

import React from 'react';
import DashboardRendererPage from './DashboardRendererPage';
import { synthesizeEtlDashboardConfig } from './utils/dashboard-config.util';
import { useDashboard } from './hooks/useDashboard';

const FALLBACK_CONFIG = synthesizeEtlDashboardConfig();

export function EtlDashboardPage() {
  const { dashboard, isLoading } = useDashboard('etl-dashboard');

  if (!isLoading && dashboard?.uuid) {
    return <DashboardRendererPage dashboard={dashboard} />;
  }

  // Loading (the auto view is a fine placeholder) or no config yet
  return (
    <DashboardRendererPage
      fallbackConfig={FALLBACK_CONFIG}
      titleOverride="ETL Monitor Dashboard"
    />
  );
}

export default EtlDashboardPage;

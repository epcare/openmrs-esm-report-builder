/**
 * Dashboard Renderer Page
 * The generic, config-driven dashboard surface: loads a
 * ReportBuilderDashboard (or accepts one as a prop), parses its config
 * (invalid configs fall back to a synthesized auto-include view with a
 * warning banner), resolves sections/widgets and renders them through the
 * shared widget implementations.
 */

import React from 'react';
import { InlineLoading, InlineNotification, Stack } from '@carbon/react';
import { useParams } from 'react-router-dom';
import { useDashboard } from './hooks/useDashboard';
import { useDashboardWidgets } from './hooks/useDashboardWidgets';
import { useMonitorDataMap } from './hooks/useMonitorDataMap';
import { parseDashboardConfig, resolveDashboardLayout } from './utils/dashboard-config.util';
import DashboardHeader from './components/DashboardHeader';
import DashboardSection from './components/DashboardSection';
import WidgetSlotDispatcher from './components/WidgetSlotDispatcher';
import DashboardEmptyState from './components/DashboardEmptyState';
import type { DashboardConfigV1, DashboardDto } from '../../types/dashboard/dashboard.types';
import styles from './dashboards.scss';

export interface DashboardRendererPageProps {
  /** Dashboard code/uuid — read from :code route params when omitted */
  code?: string;
  /** Pre-loaded dashboard (skips fetching) */
  dashboard?: DashboardDto;
  /** Used when the config is missing/invalid (e.g. the /etl-dashboard fallback) */
  fallbackConfig?: DashboardConfigV1;
  /** Overrides the persisted dashboard name in the header */
  titleOverride?: string;
}

export function DashboardRendererPage({
  code,
  dashboard: dashboardProp,
  fallbackConfig,
  titleOverride,
}: DashboardRendererPageProps) {
  const params = useParams<{ code?: string }>();
  const effectiveCode = code ?? params.code;

  const fetched = useDashboard(dashboardProp ? undefined : effectiveCode);
  const dashboard: DashboardDto | null = dashboardProp ?? fetched.dashboard;

  const parsed = React.useMemo(
    () => parseDashboardConfig(dashboard?.configJson),
    [dashboard?.configJson],
  );
  const effectiveConfig = parsed.config ?? fallbackConfig ?? null;

  const { monitors, reports, isLoading: widgetsLoading, error: widgetsError } =
    useDashboardWidgets(effectiveConfig);

  const resolved = React.useMemo(
    () => resolveDashboardLayout(effectiveConfig, monitors, reports),
    [effectiveConfig, monitors, reports],
  );

  const {
    dataMap,
    errorMap,
    loadingMap,
    lastRefreshed,
    refreshAll,
    refreshOne,
    aggregateStatus,
  } = useMonitorDataMap(resolved.etlMonitors, resolved.minRefreshInterval);

  const isLoading = (!dashboardProp && fetched.isLoading) || widgetsLoading;
  const title = titleOverride ?? dashboard?.name ?? 'Dashboard';
  const subtitle = dashboard?.description;

  const renderSlot = (
    slot: Parameters<typeof WidgetSlotDispatcher>[0]['slot'],
    position: number,
  ) => (
    <WidgetSlotDispatcher
      slot={slot}
      position={position}
      data={slot.monitor?.uuid ? dataMap[slot.monitor.uuid] : undefined}
      error={slot.monitor?.uuid ? errorMap[slot.monitor.uuid] : undefined}
      loading={!!slot.monitor?.uuid && !!loadingMap[slot.monitor.uuid]}
      onRefreshMonitor={refreshOne}
    />
  );

  if (!dashboardProp && fetched.notFound) {
    return (
      <Stack gap={5}>
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="Dashboard not found"
          subtitle={`No dashboard exists for "${effectiveCode ?? 'unknown'}".`}
        />
        <DashboardEmptyState />
      </Stack>
    );
  }

  if (!dashboardProp && fetched.error) {
    return (
      <Stack gap={5}>
        <DashboardHeader
          title={title}
          subtitle={subtitle}
          status="error"
          lastRefreshed={null}
          onRefresh={fetched.error ? refreshAll : refreshAll}
        />
        <InlineNotification
          kind="error"
          lowContrast
          title="Error"
          subtitle={fetched.error}
        />
      </Stack>
    );
  }

  if (isLoading) {
    return (
      <Stack gap={5}>
        <DashboardHeader
          title={title}
          subtitle={subtitle}
          status="success"
          lastRefreshed={null}
          onRefresh={refreshAll}
          refreshing
        />
        <InlineLoading description="Loading dashboard…" className={styles['dashboard-loading']} />
      </Stack>
    );
  }

  return (
    <Stack gap={5}>
      <DashboardHeader
        title={title}
        subtitle={subtitle}
        status={aggregateStatus}
        lastRefreshed={lastRefreshed}
        onRefresh={refreshAll}
      />

      {(widgetsError || resolved.flags.configSynthesized) && (
        <InlineNotification
          kind="warning"
          lowContrast
          title="Dashboard configuration"
          subtitle={
            widgetsError
              ? widgetsError
              : 'This dashboard’s configuration is invalid — showing all active ETL monitors instead.'
          }
        />
      )}

      {resolved.sections.length === 0 ? (
        <DashboardEmptyState synthesized={resolved.flags.configSynthesized} />
      ) : (
        resolved.sections.map((section) => (
          <DashboardSection key={section.key} section={section} renderSlot={renderSlot} />
        ))
      )}
    </Stack>
  );
}

export default DashboardRendererPage;

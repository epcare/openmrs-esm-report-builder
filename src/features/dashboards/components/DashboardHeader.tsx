/**
 * Dashboard Header
 * Wraps the shared Header with the dashboard's aggregate status pill and
 * refresh actions ("Last refreshed" + "Refresh Now").
 */

import React from 'react';
import { Button } from '@carbon/react';
import { Renew as Refresh } from '@carbon/icons-react';
import Header from '../../../components/shared/header/header.component';
import type { DashboardAggregateStatus } from '../hooks/useMonitorDataMap';

const STATUS_LABELS: Record<DashboardAggregateStatus, { label: string; kind: 'success' | 'warning' }> = {
  success: { label: 'Healthy', kind: 'success' },
  warning: { label: 'Degraded', kind: 'warning' },
  error: { label: 'Errors detected', kind: 'warning' },
};

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  status: DashboardAggregateStatus;
  lastRefreshed: Date | null;
  onRefresh: () => void;
  refreshing?: boolean;
}

export function DashboardHeader({ title, subtitle, status, lastRefreshed, onRefresh, refreshing }: DashboardHeaderProps) {
  const statusMeta = STATUS_LABELS[status];

  return (
    <Header
      title={title}
      subtitle={subtitle}
      status={{ label: statusMeta.label, kind: statusMeta.kind }}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {lastRefreshed && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary, #525252)' }}>
              Last refreshed: {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <Button
            size="sm"
            kind="ghost"
            renderIcon={Refresh}
            onClick={onRefresh}
            disabled={refreshing}
          >
            Refresh Now
          </Button>
        </div>
      }
    />
  );
}

export default DashboardHeader;

/**
 * Dashboard Empty State
 * Shown when a dashboard resolves to zero renderable widgets.
 */

import React from 'react';
import { Button, Tile } from '@carbon/react';
import { Dashboard as DashboardIcon } from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import styles from '../dashboards.scss';

interface DashboardEmptyStateProps {
  /** True when the config was synthesized (points admins at the monitor builder too) */
  synthesized?: boolean;
}

export function DashboardEmptyState({ synthesized }: DashboardEmptyStateProps) {
  const navigate = useNavigate();

  return (
    <Tile className={styles['dashboard-empty-state']}>
      <DashboardIcon size={40} className={styles['dashboard-empty-state__icon']} />
      <h3 className={styles['dashboard-empty-state__title']}>Nothing to show yet</h3>
      <p className={styles['dashboard-empty-state__message']}>
        This dashboard has no widgets configured.
      </p>
      <div className={styles['dashboard-empty-state__actions']}>
        <Button size="sm" kind="primary" onClick={() => navigate('/admin/dashboards')}>
          Configure dashboards
        </Button>
        {synthesized && (
          <Button size="sm" kind="ghost" onClick={() => navigate('/admin/etl-monitors')}>
            Manage ETL monitors
          </Button>
        )}
      </div>
    </Tile>
  );
}

export default DashboardEmptyState;

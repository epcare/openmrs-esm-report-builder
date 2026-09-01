/**
 * Monitor Widget Card
 * Shared dashboard chrome around a rendered monitor widget:
 * refresh + kebab actions overlaid on the widget header.
 * Used by the ETL dashboard and the builder's preview surfaces so the
 * preview is exactly what the dashboard renders — no separate styling.
 */

import React from 'react';
import { Button, OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { Renew as Refresh } from '@carbon/icons-react';
import styles from './monitor-widget-card.scss';

export interface MonitorWidgetMenuAction {
  label: string;
  onClick: () => void;
}

interface MonitorWidgetCardProps {
  children: React.ReactNode;
  loading?: boolean;
  onRefresh?: () => void;
  actions?: MonitorWidgetMenuAction[];
}

export function MonitorWidgetCard({ children, loading = false, onRefresh, actions }: MonitorWidgetCardProps) {
  return (
    <div className={styles['monitor-widget-card']}>
      <div className={styles['monitor-widget-card__actions']}>
        {onRefresh && (
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            renderIcon={Refresh}
            iconDescription="Refresh"
            onClick={onRefresh}
            disabled={loading}
          />
        )}
        {actions && actions.length > 0 && (
          <OverflowMenu flipped ariaLabel="Monitor actions">
            {actions.map((action) => (
              <OverflowMenuItem key={action.label} itemText={action.label} onClick={action.onClick} />
            ))}
          </OverflowMenu>
        )}
      </div>
      {children}
    </div>
  );
}

export default MonitorWidgetCard;

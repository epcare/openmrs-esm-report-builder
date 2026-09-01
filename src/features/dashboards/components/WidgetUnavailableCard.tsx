/**
 * Widget Unavailable Card
 * Placeholder for a widget whose referenced monitor/report is missing,
 * retired, or inactive — keeps the grid geometry intact.
 */

import React from 'react';
import { Tile } from '@carbon/react';
import { WarningAlt } from '@carbon/icons-react';
import styles from '../dashboards.scss';

interface WidgetUnavailableCardProps {
  title: string;
  reason?: 'monitor-missing' | 'report-missing';
}

const REASON_TEXT: Record<string, string> = {
  'monitor-missing': 'The ETL monitor for this widget no longer exists or is inactive.',
  'report-missing': 'The report for this widget no longer exists or is retired.',
};

export function WidgetUnavailableCard({ title, reason }: WidgetUnavailableCardProps) {
  return (
    <Tile className={styles['widget-unavailable-card']}>
      <div className={styles['widget-unavailable-card__icon']}>
        <WarningAlt size={24} />
      </div>
      <h4 className={styles['widget-unavailable-card__title']}>{title}</h4>
      <p className={styles['widget-unavailable-card__message']}>
        {reason ? REASON_TEXT[reason] : 'This widget is currently unavailable.'}
      </p>
    </Tile>
  );
}

export default WidgetUnavailableCard;

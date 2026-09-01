/**
 * Metrics Grid Renderer — Metric Summary Card
 * Final design (docs/image-series-monitor/widgets/metrics_final.png):
 * icon + title header, 2×2 tiles with colored icon tile LEFT and
 * label / large value / supporting subtitle stacked right,
 * TIMESTAMP fields become the "Updated Xm ago" footer.
 */

import React from 'react';
import { Time } from '@carbon/icons-react';
import type { DisplayConfigV2 } from '../../../../types/etl-monitor/etl-monitor-v2.types';
import { getTileIcon } from '../component-icons';
import styles from '../monitor-renderers.scss';

// Metric Card accent (Color & Icon System, cardsimages.png)
const METRIC_ACCENT = '#8a3ffc';

interface MetricsGridRendererProps {
  config: DisplayConfigV2;
  fields: Array<{
    key: string;
    label: string;
    value: any;
    formattedValue: any;
    type: string;
    primary: boolean;
    hidden: boolean;
    order?: number;
    path?: string;
    description?: string;
    statusTone?: string;
    statusMap?: Record<string, any>;
  }>;
  arrayData?: any;
  rawData?: any;
}

export function MetricsGridRenderer({ config, fields }: MetricsGridRendererProps) {
  const allFields = (fields || []).filter((f) => !f.hidden);
  const componentConfig = config.componentConfig || {};
  const icons = componentConfig.icons || {};
  const iconColors = componentConfig.iconColors || {};
  const valueColors = componentConfig.valueColors || {};

  // A TIMESTAMP field becomes the "Updated Xm ago" footer, not a tile
  const updatedField = allFields.find((f) => f.type === 'TIMESTAMP');
  const visibleFields = allFields.filter((f) => f !== updatedField);

  // Hero mode: a single metric renders large (Metric Card sheet: "Single metric (hero)")
  const isHero = visibleFields.length === 1;

  // Header: icon + title + subtitle ("ETL Monitor / Current run summary")
  const HeaderIcon = getTileIcon(componentConfig.icon || 'chart');

  return (
    <div className={styles['metrics-grid-renderer']}>
      {!isHero && (
        <div className={styles['metrics-grid-renderer__head']}>
          {HeaderIcon && (
            <span
              className={styles['metrics-grid-renderer__head-icon']}
              style={{ backgroundColor: `${METRIC_ACCENT}1A`, color: METRIC_ACCENT }}
            >
              <HeaderIcon size={24} />
            </span>
          )}
          <div className={styles['metrics-grid-renderer__head-text']}>
            {config.presentation?.title && (
              <h4 className={styles['metrics-grid-renderer__head-title']}>
                {config.presentation.title}
              </h4>
            )}
            {config.presentation?.description && (
              <p className={styles['metrics-grid-renderer__head-sub']}>
                {config.presentation.description}
              </p>
            )}
          </div>
        </div>
      )}

      <div
        className={[
          styles['metrics-grid-renderer__grid'],
          isHero && styles['metrics-grid-renderer__grid--hero'],
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {visibleFields.map((field) => {
          const IconComponent = getTileIcon(icons[field.key]);
          const iconColor = iconColors[field.key];
          const valueColor = valueColors[field.key];
          const value = field.formattedValue ?? '—';

          return (
            <div key={field.key} className={styles['metrics-grid-renderer__tile']}>
              {IconComponent && (
                <span
                  className={styles['metrics-grid-renderer__tile-icon']}
                  style={iconColor ? { backgroundColor: `${iconColor}1A`, color: iconColor } : undefined}
                >
                  <IconComponent size={24} />
                </span>
              )}
              <div className={styles['metrics-grid-renderer__tile-body']}>
                <span className={styles['metrics-grid-renderer__tile-label']}>{field.label}</span>
                <span
                  className={styles['metrics-grid-renderer__tile-value']}
                  style={valueColor ? { color: valueColor } : undefined}
                >
                  {value}
                </span>
                {field.description && (
                  <span className={styles['metrics-grid-renderer__tile-sub']}>{field.description}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {updatedField?.formattedValue != null && (
        <div className={styles['metrics-grid-renderer__footer']}>
          <Time size={14} />
          <span>Updated {updatedField.formattedValue}</span>
        </div>
      )}
    </div>
  );
}

export default MetricsGridRenderer;

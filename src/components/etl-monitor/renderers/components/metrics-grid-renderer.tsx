/**
 * Metrics Grid Renderer
 * Renders METRICS_GRID component type
 */

import React from 'react';
import styles from '../monitor-renderers.scss';
import type { DisplayConfigV2 } from '../../../../types/etl-monitor/etl-monitor-v2.types';

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
  }>;
  arrayData?: any;
  rawData?: any;
}

export function MetricsGridRenderer({ config, fields }: MetricsGridRendererProps) {
  const visibleFields = (fields || []).filter((f) => !f.hidden);
  const labelsAbove = config.componentConfig?.labelsAbove !== false;

  return (
    <div className={styles['metrics-grid-renderer']}>
      {config.presentation?.title && (
        <h4 className={styles['metrics-grid-renderer__title']}>{config.presentation.title}</h4>
      )}

      <div
        className={[
          styles['metrics-grid-renderer__grid'],
          labelsAbove ? styles['metrics-grid-renderer__grid--labels-above'] : '',
        ].join(' ')}
      >
        {visibleFields.map((field) => (
          <div key={field.key} className={styles['metrics-grid-renderer__metric']}>
            {labelsAbove && (
              <div className={styles['metrics-grid-renderer__metric-label']}>{field.label}</div>
            )}
            <div className={styles['metrics-grid-renderer__metric-value']}>{field.formattedValue}</div>
            {!labelsAbove && (
              <div className={styles['metrics-grid-renderer__metric-label']}>{field.label}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MetricsGridRenderer;

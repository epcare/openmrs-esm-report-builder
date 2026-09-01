/**
 * Monitor Renderer - Base Component
 *
 * Main entry point for rendering ETL monitor components
 * Dispatches to specific renderer based on component type
 */

import React from 'react';
import StatusCardRenderer from './StatusCardRenderer';
import SummaryCardRenderer from './SummaryCardRenderer';
import ProgressRenderer from './ProgressRenderer';
import TableRenderer from './TableRenderer';
import MetricsGridRenderer from './MetricsGridRenderer';
import ErrorLogRenderer from './ErrorLogRenderer';
import DetailsRenderer from './DetailsRenderer';
import LogRenderer from './components/log-renderer';
import TimeSeriesRenderer from './components/time-series-renderer';
import type { DisplayConfigV2 } from '../../../types/etl-monitor/etl-monitor-v2.types';
import { transformDataToFields, isDataEmpty, transformArrayDataToRows } from './data-transformer';
import styles from './monitor-renderers.scss';

interface MonitorRendererProps {
  config: DisplayConfigV2;
  data?: any;
  loading?: boolean;
  error?: string | null;
}

/**
 * Map component types to their renderers
 */
const COMPONENT_RENDERERS: Record<string, React.FC<any>> = {
  STATUS_CARD: StatusCardRenderer,
  SUMMARY_CARD: SummaryCardRenderer,
  PROGRESS: ProgressRenderer,
  DATA_TABLE: TableRenderer,
  TABLE: TableRenderer,
  METRICS_GRID: MetricsGridRenderer,
  ERROR_LOG: ErrorLogRenderer,
  DETAILS: DetailsRenderer,
  LOG: LogRenderer,
  TIME_SERIES: TimeSeriesRenderer,
};

/**
 * Empty state component
 */
function EmptyState({ config }: { config: DisplayConfigV2 }) {
  const emptyConfig = config.emptyState;
  const tone = emptyConfig?.tone || 'neutral';

  return (
    <div className={styles['monitor-empty-state']}>
      <div className={[styles['monitor-empty-state__icon'], styles[`monitor-empty-state__icon--${tone}`]].join(' ')}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" fill="none"/>
          <path d="M16 24L22 30L32 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h4 className={styles['monitor-empty-state__title']}>
        {emptyConfig?.title || 'No Data'}
      </h4>
      <p className={styles['monitor-empty-state__description']}>
        {emptyConfig?.description || 'No data available at this time.'}
      </p>
    </div>
  );
}

/**
 * Loading state component
 */
function LoadingState() {
  return (
    <div className={styles['monitor-loading-state']}>
      <div className={styles['monitor-loading-state__spinner']} />
      <p className={styles['monitor-loading-state__text']}>Loading monitor data...</p>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ error }: { error: string }) {
  return (
    <div className={styles['monitor-error-state']}>
      <div className={styles['monitor-error-state__icon']}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="14" stroke="#da1e28" strokeWidth="2" fill="none"/>
          <path d="M16 10V16M16 20V22" stroke="#da1e28" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <h4 className={styles['monitor-error-state__title']}>Unable to Load Monitor</h4>
      <p className={styles['monitor-error-state__description']}>{error}</p>
    </div>
  );
}

/**
 * Fallback component for unknown types
 */
function FallbackRenderer({ config, data }: { config: DisplayConfigV2; data?: any }) {
  return (
    <div className={styles['monitor-fallback']}>
      <div className={styles['monitor-fallback__header']}>
        <h5>{config.presentation?.title || 'Monitor'}</h5>
      </div>
      <div className={styles['monitor-fallback__content']}>
        <p className={styles['monitor-fallback__note']}>
          Component type <code>{config.component}</code> is not yet supported.
        </p>
        {data && (
          <pre className={styles['monitor-fallback__data']}>
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

/**
 * Main Monitor Renderer Component
 */
export function MonitorRenderer({ config, data, loading, error }: MonitorRendererProps) {
  const Renderer = COMPONENT_RENDERERS[config.component];

  // Handle loading state
  if (loading) {
    return <LoadingState />;
  }

  // Handle error state
  if (error) {
    return <ErrorState error={error} />;
  }

  // Check if data is empty
  const isEmpty = isDataEmpty(data, config);

  // Handle empty state
  if (isEmpty) {
    return <EmptyState config={config} />;
  }

  // Handle unknown component type
  if (!Renderer) {
    return <FallbackRenderer config={config} data={data} />;
  }

  // Handle different renderer signatures
  // Simple renderers (STATUS_CARD, SUMMARY_CARD, PROGRESS) transform { config, data } themselves;
  // everything else receives fields transformed by data-transformer
  const simpleRenderers = ['STATUS_CARD', 'SUMMARY_CARD', 'PROGRESS'];
  if (simpleRenderers.includes(config.component)) {
    return <Renderer config={config} data={data} />;
  }

  // Transform data into formatted fields for complex renderers
  const fields = transformDataToFields(data, config);

  // For table-like components, also provide array data
  const arrayData = ['TABLE', 'DATA_TABLE', 'ERROR_LOG', 'LOG', 'TIME_SERIES'].includes(config.component)
    ? transformArrayDataToRows(data, config)
    : null;

  // Render the specific component with formatted fields
  return <Renderer config={config} fields={fields} arrayData={arrayData} rawData={data} />;
}

export default MonitorRenderer;

// Export error and empty state components for use by other renderers
export { EmptyState as MonitorEmpty, ErrorState as MonitorError };

/**
 * Legacy Monitor Renderer
 * Renders monitors using legacy configuration (schema version 1)
 * This provides backward compatibility for existing monitors
 */

import React from 'react';
import type { ETLMonitorDto } from '../../../types/etl-monitor';
import { MonitorError, MonitorEmpty } from './monitor-renderer';
import type { DisplayConfigV2 } from '../../../types/etl-monitor/etl-monitor-v2.types';

interface LegacyMonitorRendererProps {
  monitor: ETLMonitorDto;
  data?: any;
  loading?: boolean;
  error?: string;
}

/**
 * Legacy Monitor Renderer Component
 * Renders monitors using the existing configuration format
 */
export function LegacyMonitorRenderer({ monitor, data, loading, error }: LegacyMonitorRendererProps) {
  if (loading) {
    return <div className="monitor-loading">Loading...</div>;
  }

  if (error) {
    return <MonitorError error={error} />;
  }

  // Check if we have data to display
  const hasData = data && typeof data === 'object';

  if (!hasData) {
    const emptyConfig: DisplayConfigV2 = {
      schemaVersion: 2,
      component: 'STATUS_CARD',
      fields: [],
      presentation: { title: monitor.name || 'Monitor' },
      emptyState: { title: 'No data available', tone: 'neutral' },
    };
    return <MonitorEmpty config={emptyConfig} />;
  }

  // Render based on monitor type using existing components
  switch (monitor.monitorType) {
    case 'STATUS_CARD':
      // TODO: Implement status card rendering
      // return <ETLMonitorStatusCard monitor={monitor} data={data} />;
      return (
        <div className="legacy-monitor-fallback">
          <h4>{monitor.name}</h4>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      );

    default:
      // For other types, fall back to a basic display
      return (
        <div className="legacy-monitor-fallback">
          <h4>{monitor.name}</h4>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      );
  }
}

export default LegacyMonitorRenderer;

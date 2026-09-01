/**
 * Widget Slot Dispatcher
 * Maps a resolved slot to its rendering: ETL monitors via the shared
 * EtlMonitorWidget, REPORT widgets via the launch card, missing refs via
 * the unavailable placeholder. UNSUPPORTED slots are skipped upstream.
 */

import React from 'react';
import type { ResolvedWidgetSlot } from '../../../types/dashboard/dashboard.types';
import type { MonitorDataResponse } from '../../../types/etl-monitor/etl-monitor.types';
import { EtlMonitorWidget } from '../../../components/etl-monitor/renderers/EtlMonitorWidget';
import ReportLaunchCard from './ReportLaunchCard';
import WidgetUnavailableCard from './WidgetUnavailableCard';

interface WidgetSlotDispatcherProps {
  slot: ResolvedWidgetSlot;
  position: number;
  data?: MonitorDataResponse;
  error?: string;
  loading: boolean;
  onRefreshMonitor: (uuid: string) => void;
}

export function WidgetSlotDispatcher({
  slot,
  position,
  data,
  error,
  loading,
  onRefreshMonitor,
}: WidgetSlotDispatcherProps) {
  if (slot.status === 'UNAVAILABLE') {
    return <WidgetUnavailableCard title={slot.title} reason={slot.unavailableReason} />;
  }

  if (slot.status === 'UNSUPPORTED') {
    return null;
  }

  if (slot.kind === 'ETL' && slot.monitor) {
    return (
      <EtlMonitorWidget
        monitor={slot.monitor}
        data={data}
        error={error}
        loading={loading}
        onRefresh={() => onRefreshMonitor(slot.monitor!.uuid!)}
        position={position}
        title={slot.title !== slot.monitor.name ? slot.title : undefined}
      />
    );
  }

  if (slot.kind === 'REPORT') {
    return <ReportLaunchCard title={slot.title} report={slot.report} />;
  }

  return null;
}

export default WidgetSlotDispatcher;

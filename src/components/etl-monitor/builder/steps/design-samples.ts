/**
 * Sample configurations + data for the Design step option cards.
 * Each sample renders through the real MonitorRenderer so the picker shows
 * exactly the component (and styling) the dashboard will render.
 */

import type { DisplayConfigV2, MonitorComponentType } from '../../../../types/etl-monitor';

const MINUTE = 60 * 1000;

export interface DesignSample {
  config: DisplayConfigV2;
  data: any;
}

export function getDesignSample(type: MonitorComponentType): DesignSample {
  switch (type) {
    case 'STATUS_CARD':
      return {
        config: {
          schemaVersion: 2,
          component: 'STATUS_CARD',
          presentation: { title: 'ETL Module Health', description: 'ETL module is operational.' },
          fields: [
            {
              key: 'status', label: 'Status', path: '$.status', type: 'STATUS', primary: true,
              statusMap: {
                UP: { label: 'Running', tone: 'success' },
                DOWN: { label: 'Stopped', tone: 'critical' },
              },
            },
            { key: 'lastUpdated', label: 'Last checked', path: '$.lastUpdated', type: 'TIMESTAMP' },
          ],
        },
        data: { status: 'UP', lastUpdated: Date.now() - 2 * MINUTE },
      };

    case 'METRICS_GRID':
      return {
        config: {
          schemaVersion: 2,
          component: 'METRICS_GRID',
          presentation: { title: 'ETL Monitor', description: 'Current run summary' },
          componentConfig: {
            icon: 'chart',
            icons: {
              executionId: 'badge',
              runDuration: 'clock',
              progress: 'trend',
              missedSchedule: 'calendar',
            },
            iconColors: {
              executionId: '#24a148',
              runDuration: '#8A3FFC',
              progress: '#0F62FE',
              missedSchedule: '#F1C21B',
            },
            valueColors: {
              progress: '#198038',
            },
          },
          fields: [
            {
              key: 'executionId', label: 'Execution ID', path: '$.executionId', type: 'INTEGER',
              description: 'Run #',
            },
            {
              key: 'runDuration', label: 'Run Duration', path: '$.runDuration', type: 'DURATION',
              description: 'Duration',
            },
            {
              key: 'progress', label: 'Progress', path: '$.progress', type: 'PERCENTAGE',
              description: 'Complete',
            },
            {
              key: 'missedSchedule', label: 'Missed Schedule', path: '$.missedSchedule', type: 'DURATION',
              description: 'Behind',
            },
            {
              key: 'lastUpdated', label: 'Updated', path: '$.lastUpdated', type: 'TIMESTAMP',
            },
          ],
        },
        data: {
          executionId: 17,
          runDuration: 8927000,
          progress: 100,
          missedSchedule: 5280000,
          lastUpdated: Date.now() - 2 * MINUTE,
        },
      };

    case 'PROGRESS':
      return {
        config: {
          schemaVersion: 2,
          component: 'PROGRESS',
          componentConfig: { stageFieldKey: 'stage' },
          fields: [
            { key: 'progress', label: 'Progress', path: '$.progress', type: 'PERCENTAGE', primary: true },
            { key: 'stage', label: 'Current Stage', path: '$.stage', type: 'TEXT' },
          ],
        },
        data: { progress: 100, stage: 'Completed' },
      };

    case 'TABLE':
    case 'DATA_TABLE':
      return {
        config: {
          schemaVersion: 2,
          component: 'TABLE',
          componentConfig: {
            maxRows: 5,
            viewAllUrl: '#',
            viewAllLabel: 'View all executions',
          },
          fields: [
            {
              key: 'started', label: 'Started', path: '$.started', type: 'TIMESTAMP',
              format: { timestamp: { display: 'datetime' } },
            },
            { key: 'duration', label: 'Duration', path: '$.duration', type: 'DURATION' },
            {
              key: 'result', label: 'Result', path: '$.result', type: 'STATUS',
              statusMap: {
                SUCCESS: { label: 'SUCCESS', tone: 'success' },
                FAILED: { label: 'FAILED', tone: 'critical' },
              },
            },
          ],
        },
        data: [
          { started: Date.now() - 60 * MINUTE, duration: 8927000, result: 'SUCCESS' },
          { started: Date.now() - 150 * MINUTE, duration: 1523000, result: 'SUCCESS' },
          { started: Date.now() - 300 * MINUTE, duration: 1523000, result: 'SUCCESS' },
        ],
      };

    case 'ERROR_LOG':
      return {
        config: {
          schemaVersion: 2,
          component: 'ERROR_LOG',
          fields: [
            {
              key: 'time', label: 'Time', path: '$.time', type: 'TIMESTAMP',
              format: { timestamp: { display: 'time' } },
            },
            {
              key: 'severity', label: 'Severity', path: '$.severity', type: 'STATUS',
              statusMap: {
                CRITICAL: { label: 'CRITICAL', tone: 'critical' },
                WARNING: { label: 'WARNING', tone: 'warning' },
              },
            },
            { key: 'message', label: 'Message', path: '$.message', type: 'TEXT' },
          ],
        },
        data: [
          { time: Date.now() - 45 * MINUTE, severity: 'CRITICAL', message: 'Connection timeout' },
          { time: Date.now() - 90 * MINUTE, severity: 'WARNING', message: 'Retry attempted' },
        ],
      };

    case 'DETAILS':
      return {
        config: {
          schemaVersion: 2,
          component: 'DETAILS',
          fields: [
            {
              key: 'status', label: 'status', path: '$.status', type: 'STATUS',
              statusMap: { UP: { label: 'UP', tone: 'success' } },
            },
            { key: 'module', label: 'module', path: '$.module', type: 'TEXT' },
            { key: 'description', label: 'description', path: '$.description', type: 'TEXT' },
            {
              key: 'timestamp', label: 'timestamp', path: '$.timestamp', type: 'TIMESTAMP',
              format: { timestamp: { display: 'datetime' } },
            },
          ],
        },
        data: {
          status: 'UP',
          module: 'ugandareportstetl',
          description: 'Uganda Reports ETL Module',
          timestamp: Date.now() - 5 * MINUTE,
        },
      };

    case 'SUMMARY_CARD':
      return {
        config: {
          schemaVersion: 2,
          component: 'SUMMARY_CARD',
          fields: [
            {
              key: 'completionStatus', label: 'Completion Status', path: '$.completionStatus', type: 'STATUS',
              statusMap: { SUCCESS: { label: 'SUCCESS', tone: 'success' } },
            },
            {
              key: 'transactionStatus', label: 'Transaction Status', path: '$.transactionStatus', type: 'STATUS',
              statusMap: { COMPLETED: { label: 'COMPLETED', tone: 'success' } },
            },
          ],
        },
        data: { completionStatus: 'SUCCESS', transactionStatus: 'COMPLETED' },
      };

    case 'LOG':
      return {
        config: {
          schemaVersion: 2,
          component: 'LOG',
          componentConfig: { maxRows: 5 },
          fields: [
            {
              key: 'time', label: 'Time', path: '$.time', type: 'TIMESTAMP',
              format: { timestamp: { display: 'time' } },
            },
            { key: 'event', label: 'Event', path: '$.event', type: 'TEXT' },
          ],
        },
        data: [
          { time: Date.now() - 40 * MINUTE, event: 'Execution started' },
          { time: Date.now() - 32 * MINUTE, event: 'Data extraction completed' },
          { time: Date.now() - 18 * MINUTE, event: 'Transformation completed' },
          { time: Date.now() - 5 * MINUTE, event: 'Load completed' },
        ],
      };

    case 'TIME_SERIES': {
      const now = Date.now();
      // ~6h of duration samples ending at 2h 28m (sheet example)
      const values = [
        8920000, 8610000, 8360000, 8480000, 8120000, 8240000,
        8900000, 9250000, 9030000, 8927000,
      ];
      const series = values.map((value, i) => ({
        time: now - (values.length - 1 - i) * 36 * MINUTE,
        value,
      }));
      return {
        config: {
          schemaVersion: 2,
          component: 'TIME_SERIES',
          presentation: { title: 'Execution Duration' },
          componentConfig: {
            icons: { duration: 'timer' },
            deltaLabel: 'vs previous period',
          },
          fields: [
            {
              key: 'time', label: 'Time', path: '$.time', type: 'TIMESTAMP',
              format: { timestamp: { display: 'time' } },
            },
            { key: 'value', label: 'Duration', path: '$.value', type: 'DURATION', primary: true },
          ],
        },
        data: series,
      };
    }

    default:
  }
}

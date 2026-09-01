/**
 * Log / Timeline Renderer
 * Renders the LOG component type: a vertical event timeline
 * (dots + line, time left, event right) — reference card "Log / Timeline Card"
 */

import React from 'react';
import type { DisplayConfigV2 } from '../../../../types/etl-monitor/etl-monitor-v2.types';
import { formatSemanticValue, resolveRowFieldValue } from '../data-transformer';
import styles from '../monitor-renderers.scss';

interface LogRendererProps {
  config: DisplayConfigV2;
  fields?: Array<{
    key: string;
    label: string;
    value: any;
    formattedValue: any;
    type: string;
    primary: boolean;
    hidden: boolean;
    order?: number;
    path?: string;
  }>;
  arrayData?: any[];
  rawData?: any;
  data?: any;
}

/**
 * Resolve a value from a row using the field path or key
 * (shared resolver — understands root-relative envelope paths too)
 */
function getRowValue(row: any, field: any, arrayPath?: string): any {
  return resolveRowFieldValue(row, field, arrayPath);
}

export function LogRenderer({ config, fields, arrayData, rawData }: LogRendererProps) {
  const rows = arrayData && arrayData.length > 0
    ? arrayData
    : Array.isArray(rawData)
      ? rawData
      : rawData && typeof rawData === 'object'
        ? [rawData]
        : [];

  const safeFields = fields || [];
  const timeField = safeFields.find((f) => f.type === 'TIMESTAMP');
  const messageField = safeFields.find((f) => f.type !== 'TIMESTAMP');
  const maxRows = config.componentConfig?.maxRows || 10;

  return (
    <div className={styles['log-renderer']}>
      {config.presentation?.title && (
        <h4 className={styles['log-renderer__title']}>{config.presentation.title}</h4>
      )}

      {rows.length === 0 ? (
        <div className={styles['log-renderer__empty']}>No events recorded</div>
      ) : (
        <ul className={styles['log-renderer__timeline']}>
          {rows.slice(0, maxRows).map((row: any, index: number) => {
            const rawTime = timeField ? getRowValue(row, timeField, config.data?.arrayPath) : undefined;
            const timeText = rawTime != null
              ? String(formatSemanticValue(rawTime, timeField))
              : '—';
            const rawMessage = messageField ? getRowValue(row, messageField, config.data?.arrayPath) : undefined;
            const messageText = rawMessage != null && rawMessage !== ''
              ? String(rawMessage)
              : '—';

            return (
              <li key={row?.id ?? index} className={styles['log-renderer__entry']}>
                <span className={styles['log-renderer__marker']} />
                <span className={styles['log-renderer__time']}>{timeText}</span>
                <span className={styles['log-renderer__message']}>{messageText}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default LogRenderer;

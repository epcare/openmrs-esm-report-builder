/**
 * Error Log Renderer
 * Displays error logs in a table format
 */

import React from 'react';
import { DataTable, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@carbon/react';
import styles from '../monitor-renderers.scss';
import type { DisplayConfigV2 } from '../../../../types/etl-monitor/etl-monitor-v2.types';
import { formatSemanticValue } from '../data-transformer';

interface ErrorLogRendererProps {
  config: DisplayConfigV2;
  fields?: Record<string, any>[];
  arrayData?: any[];
  rawData?: any;
}

/**
 * Error Log Renderer Component
 * Displays error logs with timestamp, level, and message
 */
export function ErrorLogRenderer({ config, arrayData, rawData }: ErrorLogRendererProps) {
  // Accept array data, a raw array, or a single object; Carbon DataTable needs row ids
  const source = arrayData && arrayData.length > 0
    ? arrayData
    : Array.isArray(rawData)
      ? rawData
      : rawData && typeof rawData === 'object'
        ? [rawData]
        : [];

  const logs = source.map((row: any, index: number) => {
    const formatted: any = {
      ...row,
      id: String(row?.id ?? row?._id ?? index),
    };
    // Format cells per semantic type so timestamps/durations read like the widgets
    config.fields?.forEach((field: any) => {
      if (field.type && field.type !== 'TEXT' && formatted[field.key] != null) {
        formatted[field.key] = formatSemanticValue(formatted[field.key], field);
      }
    });
    return formatted;
  });

  if (!logs || logs.length === 0) {
    return (
      <div className={styles['error-log-empty']}>
        <p>No error logs available</p>
      </div>
    );
  }

  // Headers keyed by field.key (matching the row objects) with label text
  const headers = (config.fields?.length
    ? config.fields.map((field: any) => ({ key: field.key, header: field.label || field.key }))
    : [
        { key: 'timestamp', header: 'Timestamp' },
        { key: 'level', header: 'Level' },
        { key: 'message', header: 'Message' },
      ]
  ).map((header: any) => ({
    key: header.key,
    header: header.header,
  }));

  return (
    <div className={styles['error-log-renderer']}>
      {config.presentation?.title && (
        <h4 className={styles['error-log-renderer__title']}>{config.presentation.title}</h4>
      )}

      <DataTable rows={logs} headers={headers}>
        {({ rows, headers, getHeaderProps, getTableProps }) => (
          <TableContainer>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableHeader {...getHeaderProps({ header })} key={header.key}>
                      {(header as any).header || (header as any).key}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.id}>{cell.value}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    </div>
  );
}

export default ErrorLogRenderer;

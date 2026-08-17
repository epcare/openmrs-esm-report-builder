/**
 * Error Log Renderer
 * Displays error logs in a table format
 */

import React from 'react';
import { DataTable, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from '@carbon/react';
import type { DisplayConfigV2 } from '../../../../types/etl-monitor/etl-monitor-v2.types';

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
  const logs = arrayData || (Array.isArray(rawData) ? rawData : []);

  if (!logs || logs.length === 0) {
    return (
      <div className="error-log-empty">
        <p>No error logs available</p>
      </div>
    );
  }

  // Determine columns based on config or default
  const columns = config.fields?.map((field: any) => field.key) || ['timestamp', 'level', 'message'];

  // Get headers from config as DataTable-compatible objects
  const headers = (config.fields?.map((field: any) => field.label || field.key) || columns).map((header: string) => ({
    key: header,
    header: header,
  }));

  return (
    <div className="error-log-renderer">
      {config.presentation?.title && (
        <h4 className="error-log-renderer__title">{config.presentation.title}</h4>
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

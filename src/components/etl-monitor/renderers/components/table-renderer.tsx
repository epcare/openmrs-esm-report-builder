/**
 * Table Renderer
 * Renders TABLE/DATA_TABLE component type
 */

import React from 'react';
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tag,
} from '@carbon/react';
import { ArrowRight } from '@carbon/icons-react';
import styles from '../monitor-renderers.scss';
import type { DisplayConfigV2 } from '../../../../types/etl-monitor/etl-monitor-v2.types';
import { formatSemanticValue, resolveRowFieldValue } from '../data-transformer';

interface TableRendererProps {
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
  }>;
  arrayData?: Array<Record<string, any>>;
}

export function TableRenderer({ config, fields, arrayData }: TableRendererProps) {
  // Use arrayData provided by MonitorRenderer
  const tableData = arrayData || [];

  const visibleFields = (fields || []).filter((f) => !f.hidden);
  const maxRows = config.componentConfig?.maxRows || 50;
  const displayData = tableData.slice(0, maxRows);

  /**
   * Extract value from row data using field path.
   * Delegates to the shared resolver so root-relative paths
   * (e.g. $.data.startTime from a { data: [...] } envelope) and
   * indexed paths resolve the same way as everywhere else.
   */
  const getRowValue = (row: any, field: any) => {
    const value = resolveRowFieldValue(row, field, config.data?.arrayPath);
    return value === undefined ? '-' : value;
  };

  /**
   * Format a cell value for display
   */
  const formatCellValue = (value: any, field: any) => {
    if (value === null || value === undefined) return '-';

    // For status fields, apply status mapping
    if (field.type === 'STATUS') {
      const mapping = field.statusMap?.[String(value)];
      if (mapping) {
        const toneToTagType: Record<string, 'green' | 'red' | 'blue' | 'gray' | 'cyan' | 'purple' | 'magenta' | 'teal' | 'warm-gray' | 'cool-gray' | 'high-contrast' | 'outline'> = {
          success: 'green',
          critical: 'red',
          warning: 'purple', // Use orange or other supported color for warnings
          info: 'blue',
          neutral: 'gray',
        };
        // Map warning to a supported color if needed
        const tagType = toneToTagType[mapping.tone] || 'gray';
        return (
          <Tag type={tagType as any}>
            {mapping.label || value}
          </Tag>
        );
      }
      // Fallback tone detection
      const str = String(value).toLowerCase();
      if (str.includes('up') || str.includes('success') || str.includes('ok')) {
        return <Tag type="green">{value}</Tag>;
      }
      if (str.includes('down') || str.includes('error') || str.includes('fail')) {
        return <Tag type="red">{value}</Tag>;
      }
      return <Tag type="gray">{value}</Tag>;
    }

    // Percentage cells render as value + inline progress bar (widget #5)
    if (field.type === 'PERCENTAGE') {
      const numeric =
        typeof value === 'number'
          ? Math.max(0, Math.min(100, value))
          : parseFloat(String(value).replace('%', '')) || 0;
      return (
        <span className={styles['table-renderer__progress']}>
          <span className={styles['table-renderer__progress-label']}>
            {formatSemanticValue(value, field)}
          </span>
          <span className={styles['table-renderer__progress-track']}>
            <span
              className={styles['table-renderer__progress-fill']}
              style={{ width: `${numeric}%` }}
            />
          </span>
        </span>
      );
    }

    return formatSemanticValue(value, field);
  };

  return (
    <div className={styles['table-renderer']}>
      <div className={styles['table-renderer__header']}>
        {config.presentation?.title && (
          <h4 className={styles['table-renderer__title']}>{config.presentation.title}</h4>
        )}
      </div>

      {displayData.length === 0 ? (
        <div className={styles['table-renderer__empty']}>No data to display</div>
      ) : (
        <div className={styles['table-renderer__table-wrapper']}>
          <Table size="sm">
            <TableHead>
              <TableRow>
                {visibleFields.map((field) => (
                  <TableHeader key={field.key}>
                    {field.label}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayData.map((row, rowIndex) => (
                <TableRow key={row._id || rowIndex}>
                  {visibleFields.map((field) => {
                    const value = getRowValue(row, field);
                    return (
                      <TableCell key={field.key}>
                        {formatCellValue(value, field)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {tableData.length > maxRows && (
        <div className={styles['table-renderer__footer']}>
          <span className={styles['table-renderer__footer-count']}>
            Showing {maxRows} of {tableData.length} rows
          </span>
          {config.componentConfig?.viewAllUrl && (
            <a
              href={config.componentConfig.viewAllUrl}
              className={styles['table-renderer__footer-link']}
            >
              {config.componentConfig.viewAllLabel || 'View all'} <ArrowRight size={12} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default TableRenderer;

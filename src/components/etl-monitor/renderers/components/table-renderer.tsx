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
import type { DisplayConfigV2 } from '../../../../types/etl-monitor/etl-monitor-v2.types';

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

  const visibleFields = fields.filter((f) => !f.hidden);
  const maxRows = config.componentConfig?.maxRows || 50;
  const displayData = tableData.slice(0, maxRows);

  /**
   * Extract value from row data using field path
   */
  const getRowValue = (row: any, field: any) => {
    if (!row) return '-';

    const path = field.path;
    if (!path) return '-';

    // Handle nested paths like $.fieldName
    if (path.startsWith('$.')) {
      const parts = path.substring(2).split('.');
      let value = row;
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return '-';
        }
      }
      return value;
    }

    // Direct key access
    if (field.key in row) {
      return row[field.key];
    }

    return '-';
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

    return String(value);
  };

  return (
    <div className="table-renderer">
      <div className="table-renderer__header">
        {config.presentation?.title && (
          <h4 className="table-renderer__title">{config.presentation.title}</h4>
        )}
      </div>

      {displayData.length === 0 ? (
        <div className="table-renderer__empty">No data to display</div>
      ) : (
        <div className="table-renderer__table-wrapper">
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
        <div className="table-renderer__footer">
          Showing {maxRows} of {tableData.length} rows
        </div>
      )}
    </div>
  );
}

export default TableRenderer;

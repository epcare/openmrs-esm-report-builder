/**
 * Sort Configuration Component for Linelist Reports
 *
 * This component allows users to configure multi-column sorting for their linelist reports.
 * Sorts are applied in priority order (first item has highest priority).
 *
 * Based on Superset/DHIS2-style sort configuration UI
 */

import React, { useState } from 'react';
import {
  Stack,
  Select,
  SelectItem,
  Button,
  ButtonSet,
  Tag,
  DataTable,
  TableRow,
  TableBody,
  TableCell,
} from '@carbon/react';
import { TrashCan, Add, ChevronUp, ChevronDown } from '@carbon/react/icons';
import type { LinelistSortConfig, LinelistColumnDraft } from '../../../types/linelist-types';
import styles from './sort-config.scss';

type Props = {
  sortConfig: LinelistSortConfig[];
  columns: LinelistColumnDraft[];
  onChange: (sortConfig: LinelistSortConfig[]) => void;
  disabled?: boolean;
};

export default function SortConfiguration({
  sortConfig,
  columns,
  onChange,
  disabled = false,
}: Props) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  /**
   * Add a new sort configuration
   */
  const addSort = () => {
    if (columns.length === 0) return;

    // Use the first column as default
    const firstColumn = columns[0];
    const newSort: LinelistSortConfig = {
      id: `sort-${Date.now()}`,
      columnId: firstColumn.id,
      columnName: firstColumn.name,
      direction: 'ASC',
      nulls: 'LAST',
      sortOrder: sortConfig.length,
    };
    onChange([...sortConfig, newSort]);
  };

  /**
   * Remove a sort configuration
   */
  const removeSort = (sortId: string) => {
    const updated = sortConfig
      .filter((s) => s.id !== sortId)
      .map((s, idx) => ({ ...s, sortOrder: idx }));
    onChange(updated);
  };

  /**
   * Update a sort configuration
   */
  const updateSort = (sortId: string, updates: Partial<LinelistSortConfig>) => {
    onChange(
      sortConfig.map((s) =>
        s.id === sortId
          ? {
              ...s,
              ...updates,
            }
          : s
      )
    );
  };

  /**
   * Move sort up or down in priority
   */
  const moveSort = (index: number, direction: 'up' | 'down') => {
    const newSortConfig = [...sortConfig];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newSortConfig.length) return;

    [newSortConfig[index], newSortConfig[targetIndex]] = [
      newSortConfig[targetIndex],
      newSortConfig[index],
    ];

    // Update sort orders
    newSortConfig.forEach((sort, idx) => {
      sort.sortOrder = idx;
    });

    onChange(newSortConfig);
  };

  /**
   * Toggle row expansion for sort details
   */
  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  /**
   * Get available columns for sort (excluding already selected ones)
   */
  const getAvailableColumns = (currentSortId?: string) => {
    const selectedColumnIds = new Set(
      sortConfig
        .filter((s) => s.id !== currentSortId)
        .map((s) => s.columnId)
    );
    return columns.filter((col) => !selectedColumnIds.has(col.id));
  };

  /**
   * Get display name for a column
   */
  const getColumnName = (columnId: string) => {
    const column = columns.find((c) => c.id === columnId);
    return column?.name || columnId;
  };

  return (
    <div className={styles['container']}>
      <Stack gap={4}>
        <div className={styles['header']}>
          <h4 className={styles['sectionTitle']}>Sort Configuration</h4>
          <p className={styles['description']}>
            Define how rows should be ordered. Sorts are applied in priority order from top to bottom.
          </p>
        </div>

        {/* Add sort button */}
        <Button
          kind="secondary"
          renderIcon={Add}
          onClick={addSort}
          disabled={disabled || columns.length === 0}
        >
          Add Sort Rule
        </Button>

        {/* Sort configurations table */}
        {sortConfig.length > 0 ? (
          <div className={styles['sortTable']}>
            <DataTable
              rows={sortConfig.map((sort) => ({ id: sort.id, ...sort }))}
              headers={[]}
            >
              {({ rows }) => (
                <TableBody>
                  {rows.map((row, idx) => {
                    const sort = sortConfig[idx];
                    const isExpanded = expandedRows.has(idx);

                    return (
                      <React.Fragment key={sort.id}>
                        <TableRow>
                          {/* Priority indicator */}
                          <TableCell className={styles['priorityCell']}>
                            <Tag type="blue">{idx + 1}</Tag>
                          </TableCell>

                          {/* Column name */}
                          <TableCell className={styles['columnCell']}>
                            <span className={styles['columnName']}>
                              {getColumnName(sort.columnId)}
                            </span>
                          </TableCell>

                          {/* Direction badge */}
                          <TableCell>
                            <Tag type={sort.direction === 'ASC' ? 'green' : 'purple'}>
                              {sort.direction === 'ASC' ? 'Ascending' : 'Descending'}
                            </Tag>
                          </TableCell>

                          {/* Nulls badge */}
                          <TableCell>
                            <Tag type={sort.nulls === 'FIRST' ? 'cyan' : 'gray'}>
                              {sort.nulls === 'FIRST' ? 'Nulls first' : 'Nulls last'}
                            </Tag>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className={styles['actionsCell']}>
                            <ButtonSet>
                              <Button
                                hasIconOnly
                                kind="ghost"
                                size="sm"
                                renderIcon={ChevronUp}
                                onClick={() => moveSort(idx, 'up')}
                                disabled={disabled || idx === 0}
                                iconDescription="Increase priority"
                              />
                              <Button
                                hasIconOnly
                                kind="ghost"
                                size="sm"
                                renderIcon={ChevronDown}
                                onClick={() => moveSort(idx, 'down')}
                                disabled={disabled || idx === sortConfig.length - 1}
                                iconDescription="Decrease priority"
                              />
                              <Button
                                hasIconOnly
                                kind="ghost"
                                size="sm"
                                renderIcon={TrashCan}
                                onClick={() => removeSort(sort.id)}
                                disabled={disabled}
                                iconDescription="Remove sort"
                              />
                              <Button
                                kind="ghost"
                                size="sm"
                                onClick={() => toggleRowExpansion(idx)}
                                disabled={disabled}
                              >
                                {isExpanded ? 'Less' : 'More'}
                              </Button>
                            </ButtonSet>
                          </TableCell>
                        </TableRow>

                        {/* Expanded config row */}
                        {isExpanded && (
                          <TableRow className={styles['expandedRow']}>
                            <TableCell colSpan={5}>
                              <div className={styles['expandedContent']}>
                                <Stack gap={3}>
                                  <p className={styles['helperText']}>
                                    Configure the sort rule for priority {idx + 1}
                                  </p>

                                  {/* Column selector */}
                                  <Select
                                    id={`sort-column-${sort.id}`}
                                    labelText="Sort by Column"
                                    value={sort.columnId}
                                    onChange={(e: any) => {
                                      const newColumnId = e.target.value;
                                      const column = columns.find((c) => c.id === newColumnId);
                                      updateSort(sort.id, {
                                        columnId: newColumnId,
                                        columnName: column?.name || newColumnId,
                                      });
                                    }}
                                    disabled={disabled}
                                  >
                                    {getAvailableColumns(sort.id).map((col) => (
                                      <SelectItem key={col.id} value={col.id} text={col.name} />
                                    ))}
                                  </Select>

                                  {/* Direction selector */}
                                  <Select
                                    id={`sort-direction-${sort.id}`}
                                    labelText="Sort Direction"
                                    value={sort.direction}
                                    onChange={(e: any) =>
                                      updateSort(sort.id, {
                                        direction: e.target.value as 'ASC' | 'DESC',
                                      })
                                    }
                                    disabled={disabled}
                                  >
                                    <SelectItem value="ASC" text="Ascending (A → Z, 1 → 10)" />
                                    <SelectItem value="DESC" text="Descending (Z → A, 10 → 1)" />
                                  </Select>

                                  {/* Nulls position */}
                                  <Select
                                    id={`sort-nulls-${sort.id}`}
                                    labelText="Null Values"
                                    value={sort.nulls}
                                    onChange={(e: any) =>
                                      updateSort(sort.id, {
                                        nulls: e.target.value as 'FIRST' | 'LAST',
                                      })
                                    }
                                    disabled={disabled}
                                  >
                                    <SelectItem value="FIRST" text="Nulls first (null → values)" />
                                    <SelectItem value="LAST" text="Nulls last (values → null)" />
                                  </Select>
                                </Stack>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              )}
            </DataTable>
          </div>
        ) : (
          <div className={styles['emptyState']}>
            <p>No sort rules defined. Rows will be returned in their natural order.</p>
            <p className={styles['helperText']}>
              Add sort rules to control how rows are ordered in the report output.
            </p>
          </div>
        )}
      </Stack>
    </div>
  );
}

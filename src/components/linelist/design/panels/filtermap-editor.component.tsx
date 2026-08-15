/**
 * FilterMap Editor Component for Linelist Reports
 *
 * Allows users to configure filterMap for base cohort SQL.
 * FilterMap enables column queries to reference the exact row that matched
 * the base cohort criteria when both reference the same table.
 *
 * Example use case: Base cohort selects patients with viral load episodes,
 * and column queries need to reference the specific episode/order that matched.
 */

import React, { useState, useMemo } from 'react';
import {
  Stack,
  Button,
  TextInput,
  Tag,
  InlineNotification,
  ComboBox,
} from '@carbon/react';
import {
  Add,
  TrashCan,
  Information,
  Checkmark,
} from '@carbon/react/icons';
import type { FilterMap } from '../../../../types/linelist-types';
import styles from './filtermap-editor.scss';

type FilterMapEntry = {
  parameterName: string;
  columnReference: string;
};

type Props = {
  /** Current filterMap configuration */
  filterMap?: FilterMap;
  /** Callback when filterMap changes */
  onChange: (filterMap: FilterMap | undefined) => void;
  /** Available columns from the SQL SELECT clause (for auto-suggest) */
  availableColumns?: Array<{ name: string; reference: string }>;
  /** Disable the component */
  disabled?: boolean;
  /** SQL query to extract columns from (for auto-suggest) */
  sqlQuery?: string;
};

/**
 * SQL keywords that should not be used as parameter names
 */
const RESERVED_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'ORDER', 'BY',
  'GROUP', 'HAVING', 'UNION', 'EXISTS', 'DISTINCT', 'NULL', 'IS',
  'patientId', 'clientId', 'startDate', 'endDate', // Reserved built-in params
];

/**
 * Extract column references from SQL SELECT clause
 */
function extractColumnsFromSQL(sql: string): Array<{ name: string; reference: string }> {
  const trimmed = sql.trim();
  if (!trimmed) return [];

  // Simple regex to extract SELECT clause columns
  // Matches: SELECT DISTINCT col1, col2, table.col3 ...
  const selectMatch = trimmed.match(/SELECT\s+(?:DISTINCT\s+)?([\s\S]+?)\s+FROM/i);
  if (!selectMatch) return [];

  const selectClause = selectMatch[1];
  const columns: Array<{ name: string; reference: string }> = [];

  // Split by comma and process each column reference
  const columnRefs = selectClause.split(',').map(s => s.trim());

  for (const ref of columnRefs) {
    if (!ref) continue;

    // Check for table.column pattern
    const tableColMatch = ref.match(/(\w+)\.(\w+)/);
    if (tableColMatch) {
      const [, table, column] = tableColMatch;
      columns.push({
        name: column,
        reference: `${table}.${column}`,
      });
    } else {
      // Simple column name
      const colName = ref.split(/\s+/)[0]; // Handle "col AS alias"
      if (colName && !colName.includes('(')) {
        columns.push({
          name: colName,
          reference: colName,
        });
      }
    }
  }

  return columns;
}

/**
 * Validate parameter name
 */
function isValidParameterName(name: string): boolean {
  if (!name || name.trim() === '') return false;
  const trimmed = name.trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) return false;
  if (RESERVED_KEYWORDS.includes(trimmed.toUpperCase())) return false;
  return true;
}

/**
 * Validate column reference
 */
function isValidColumnReference(ref: string): boolean {
  if (!ref || ref.trim() === '') return false;
  const trimmed = ref.trim();
  // Allow table.column or simple column name
  return /^[\w.]+$/.test(trimmed);
}

/**
 * Suggest parameter name from column reference
 */
function suggestParameterName(columnRef: string): string {
  const trimmed = columnRef.trim();

  // Extract column name from table.column
  const match = trimmed.match(/(\w+)\.(\w+)/);
  if (match) {
    const column = match[2];
    // Convert to camelCase
    return column.toLowerCase();
  }

  // Use the reference as-is
  return trimmed.toLowerCase();
}

const FilterMapEditor: React.FC<Props> = ({
  filterMap,
  onChange,
  availableColumns: propAvailableColumns,
  disabled = false,
  sqlQuery,
}) => {
  const [entries, setEntries] = useState<FilterMapEntry[]>(() => {
    if (!filterMap) return [];
    return Object.entries(filterMap).map(([parameterName, columnReference]) => ({
      parameterName,
      columnReference,
    }));
  });

  const [errors, setErrors] = useState<Record<number, string>>({});
  const [showInfo, setShowInfo] = useState(false);

  // Sync entries when filterMap prop changes (e.g., when loading existing report)
  React.useEffect(() => {
    if (!filterMap || Object.keys(filterMap).length === 0) {
      setEntries([]);
    } else {
      const newEntries = Object.entries(filterMap).map(([parameterName, columnReference]) => ({
        parameterName,
        columnReference,
      }));
      setEntries(newEntries);
    }
  }, [filterMap]);

  // Extract columns from SQL if availableColumns not provided
  const extractedColumns = useMemo(() => {
    if (sqlQuery) {
      return extractColumnsFromSQL(sqlQuery);
    }
    return [];
  }, [sqlQuery]);

  const availableColumns = propAvailableColumns || extractedColumns;

  /**
   * Convert entries back to filterMap format
   */
  const toFilterMap = (entries: FilterMapEntry[]): FilterMap | undefined => {
    const validEntries = entries.filter(e =>
      isValidParameterName(e.parameterName) && isValidColumnReference(e.columnReference)
    );

    if (validEntries.length === 0) return undefined;

    return Object.fromEntries(
      validEntries.map(e => [e.parameterName.trim(), e.columnReference.trim()])
    );
  };

  /**
   * Update entries and notify parent
   */
  const updateEntries = (newEntries: FilterMapEntry[]) => {
    setEntries(newEntries);

    // Validate and collect errors
    const newErrors: Record<number, string> = {};
    newEntries.forEach((entry, index) => {
      if (entry.parameterName && !isValidParameterName(entry.parameterName)) {
        newErrors[index] = 'Invalid parameter name';
      }
      if (entry.columnReference && !isValidColumnReference(entry.columnReference)) {
        newErrors[index] = 'Invalid column reference';
      }
    });
    setErrors(newErrors);

    // Notify parent
    onChange(toFilterMap(newEntries));
  };

  /**
   * Add a new filterMap entry
   */
  const addEntry = () => {
    const newEntry: FilterMapEntry = {
      parameterName: '',
      columnReference: '',
    };
    updateEntries([...entries, newEntry]);
  };

  /**
   * Remove a filterMap entry
   */
  const removeEntry = (index: number) => {
    const newEntries = entries.filter((_, i) => i !== index);
    updateEntries(newEntries);
  };

  /**
   * Update a specific entry field
   */
  const updateEntry = (index: number, field: keyof FilterMapEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    updateEntries(newEntries);
  };

  /**
   * Auto-suggest parameter name from column reference
   */
  const autoSuggestParameterName = (index: number) => {
    const entry = entries[index];
    if (!entry.columnReference) return;

    const suggested = suggestParameterName(entry.columnReference);
    updateEntry(index, 'parameterName', suggested);
  };

  /**
   * Get column reference suggestions
   */
  const getColumnSuggestions = (): string[] => {
    return availableColumns.map(col => col.reference);
  };

  const hasErrors = Object.keys(errors).length > 0;
  const hasEntries = entries.length > 0;

  return (
    <div className={styles.container}>
      <Stack gap={4}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Information size={16} />
            <h4>FilterMap Configuration</h4>
          </div>
          <Button
            kind="ghost"
            size="sm"
            onClick={() => setShowInfo(!showInfo)}
          >
            {showInfo ? 'Hide' : 'What is this?'}
          </Button>
        </div>

        {/* Info panel */}
        {showInfo && (
          <div className={styles.infoPanel}>
            <InlineNotification
              kind="info"
              title="About FilterMap"
              subtitle="FilterMap enables column queries to filter to the exact row that matched the base cohort criteria. Use this when: Base cohort SELECTs multiple identifier columns (episode_id, order_id, etc.), Column queries reference the same table as the base cohort, and Multiple rows exist per patient and you need consistent data across columns."
              hideCloseButton
              lowContrast
            />
            <div className={styles.infoDetails}>
              <p className={styles.example}>
                <strong>Example:</strong> If base cohort selects <code>patient_id, episode_id, order_id</code>,
                you can map these to parameters that column queries use:
              </p>
              <pre className={styles.codeExample}>
                {`{
  "patientId": "vl.patient_id",
  "orderId": "vl.native_order_id",
  "episodeId": "vl.episode_id"
}`}
              </pre>
              <p>
                Column SQL can then use <code>:patientId</code>, <code>:orderId</code>, <code>:episodeId</code>
                to filter to the specific episode/order.
              </p>
            </div>
          </div>
        )}

        {/* Entries */}
        {hasEntries ? (
          <div className={styles.entriesContainer}>
            {entries.map((entry, index) => (
              <div key={index} className={styles.entryRow}>
                <div className={styles.entryFields}>
                  {/* Parameter Name */}
                  <div className={styles.fieldGroup}>
                    <TextInput
                      id={`param-name-${index}`}
                      labelText="Parameter Name"
                      value={entry.parameterName || ''}
                      onChange={(e) =>
                        updateEntry(
                          index,
                          'parameterName',
                          (e.target as HTMLInputElement).value
                        )
                      }
                      placeholder="e.g., orderId"
                      disabled={disabled}
                      size="sm"
                    />
                  </div>

                  {/* Arrow */}
                  <div className={styles.arrow}>→</div>

                  {/* Column Reference */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Column Reference</label>
                    <ComboBox
                      id={`col-ref-${index}`}
                      items={getColumnSuggestions()}
                      selectedItem={entry.columnReference || undefined}
                      onChange={({ selectedItem }) =>
                        updateEntry(index, 'columnReference', selectedItem ?? '')
                      }
                      onInputChange={(value) =>
                        updateEntry(
                          index,
                          'columnReference',
                          value
                        )
                      }
                      placeholder="e.g., vl.native_order_id"
                      disabled={disabled}
                      size="sm"
                      shouldFilterItem={({ item, inputValue }) =>
                        item.toLowerCase().includes(inputValue?.toLowerCase() ?? '')
                      }
                    />
                  </div>

                  {/* Actions */}
                  <div className={styles.entryActions}>
                    <Button
                      kind="ghost"
                      size="sm"
                      hasIconOnly
                      renderIcon={Checkmark}
                      iconDescription="Auto-suggest parameter name"
                      onClick={() => autoSuggestParameterName(index)}
                      disabled={disabled || !entry.columnReference}
                      title="Auto-suggest parameter name from column reference"
                    />
                    <Button
                      kind="ghost"
                      size="sm"
                      hasIconOnly
                      renderIcon={TrashCan}
                      iconDescription="Remove"
                      onClick={() => removeEntry(index)}
                      disabled={disabled}
                    />
                  </div>
                </div>

                {/* Error for this entry */}
                {errors[index] && (
                  <div className={styles.entryError}>{errors[index]}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>
              No filterMap entries configured. Add entries to enable column queries to filter
              to specific rows from the base cohort.
            </p>
          </div>
        )}

        {/* Add button */}
        <Button
          kind="ghost"
          size="sm"
          onClick={addEntry}
          disabled={disabled}
          renderIcon={Add}
        >
          Add FilterMap Entry
        </Button>

        {/* Summary */}
        {hasEntries && !hasErrors && (
          <div className={styles.summary}>
            <Tag type="green" size="sm">
              {entries.length} filterMap entr{entries.length !== 1 ? 'ies' : 'y'} configured
            </Tag>
          </div>
        )}
      </Stack>
    </div>
  );
};

export default FilterMapEditor;

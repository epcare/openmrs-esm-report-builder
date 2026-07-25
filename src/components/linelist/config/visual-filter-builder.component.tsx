/**
 * Visual Filter Builder Component for Linelist Reports
 *
 * This component allows users to build SQL filter conditions visually.
 * Follows Superset/DHIS2-style filter builder UI with condition groups.
 */

import React, { useState, useCallback } from 'react';
import {
  Stack,
  Button,
  Select,
  SelectItem,
  TextInput,
  Toggle,
} from '@carbon/react';
import { Add, TrashCan, ChevronDown, ChevronUp } from '@carbon/react/icons';
import type {
  FilterGroup,
  FilterCondition,
  FilterFieldType,
  FilterOperator,
  LogicalOperator,
  VisualFilterState,
} from '../../../types/linelist-types';
import styles from './visual-filter-builder.scss';

/**
 * Get available operators for a field type
 */
function getOperatorsForFieldType(fieldType: FilterFieldType): FilterOperator[] {
  switch (fieldType) {
    case 'TEXT':
      return ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'STARTS_WITH', 'IS_BLANK', 'IS_NOT_BLANK'];
    case 'NUMBER':
      return ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'GREATER_EQUAL', 'LESS_EQUAL', 'BETWEEN'];
    case 'DATE':
      return ['ON', 'BEFORE', 'AFTER', 'BETWEEN_DATES', 'IN_PREVIOUS_PERIOD', 'IN_NEXT_PERIOD', 'IS_BLANK'];
    case 'CODED':
      return ['IS_ONE_OF', 'IS_NOT_ONE_OF', 'IS_BLANK'];
    case 'BOOLEAN':
      return ['IS_TRUE', 'IS_FALSE', 'NOT_RECORDED'];
    case 'LOCATION':
      return ['IN_LOCATION', 'WITHIN_HIERARCHY'];
    default:
      return ['EQUALS', 'NOT_EQUALS'];
  }
}

/**
 * Get operator label
 */
function getOperatorLabel(operator: FilterOperator): string {
  const labels: Record<FilterOperator, string> = {
    EQUALS: 'Equals',
    NOT_EQUALS: 'Not equals',
    CONTAINS: 'Contains',
    STARTS_WITH: 'Starts with',
    ENDS_WITH: 'Ends with',
    IS_BLANK: 'Is blank',
    IS_NOT_BLANK: 'Is not blank',
    GREATER_THAN: 'Greater than',
    LESS_THAN: 'Less than',
    GREATER_EQUAL: 'Greater than or equal',
    LESS_EQUAL: 'Less than or equal',
    BETWEEN: 'Between',
    ON: 'On',
    BEFORE: 'Before',
    AFTER: 'After',
    BETWEEN_DATES: 'Between',
    IN_PREVIOUS_PERIOD: 'In previous period',
    IN_NEXT_PERIOD: 'In next period',
    IS_ONE_OF: 'Is one of',
    IS_NOT_ONE_OF: 'Is not one of',
    IS_TRUE: 'Is true',
    IS_FALSE: 'Is false',
    NOT_RECORDED: 'Not recorded',
    WITHIN_HIERARCHY: 'Within hierarchy',
    IN_LOCATION: 'In location',
  };
  return labels[operator] || operator;
}

/**
 * Check if operator needs value input
 */
function operatorNeedsValue(operator: FilterOperator): boolean {
  return !['IS_BLANK', 'IS_NOT_BLANK', 'IS_TRUE', 'IS_FALSE', 'NOT_RECORDED'].includes(operator);
}

/**
 * Check if operator needs second value (for "between" operators)
 */
function operatorNeedsSecondValue(operator: FilterOperator): boolean {
  return ['BETWEEN', 'BETWEEN_DATES', 'IN_PREVIOUS_PERIOD', 'IN_NEXT_PERIOD'].includes(operator);
}

type Props = {
  visualFilter: VisualFilterState;
  onChange: (visualFilter: VisualFilterState) => void;
  onSqlChange: (sql: string) => void;
  availableFields: Array<{ name: string; label: string; type: FilterFieldType }>;
  disabled?: boolean;
};

export default function VisualFilterBuilder({
  visualFilter,
  onChange,
  onSqlChange,
  availableFields,
  disabled = false,
}: Props) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['root']));

  /**
   * Escape SQL value
   */
  const escapeValue = useCallback((val: any): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return val ? '1' : '0';
    return `'${String(val).replace(/'/g, "''")}'`;
  }, []);

  /**
   * Convert a single condition to SQL
   */
  const conditionToSql = useCallback((cond: FilterCondition): string => {
    if (!cond.field) return '';

    const field = cond.field;
    const op = cond.operator;
    const value = cond.value;
    const value2 = cond.value2;
    const negate = cond.negate;

    let sql = '';

    switch (op) {
      case 'EQUALS':
        sql = `${field} = ${escapeValue(value)}`;
        break;
      case 'NOT_EQUALS':
        sql = `${field} != ${escapeValue(value)}`;
        break;
      case 'CONTAINS':
        sql = `${field} LIKE ${escapeValue(`%${value}%`)}`;
        break;
      case 'STARTS_WITH':
        sql = `${field} LIKE ${escapeValue(`${value}%`)}`;
        break;
      case 'ENDS_WITH':
        sql = `${field} LIKE ${escapeValue(`%${value}`)}`;
        break;
      case 'IS_BLANK':
        sql = `(${field} IS NULL OR ${field} = '')`;
        break;
      case 'IS_NOT_BLANK':
        sql = `${field} IS NOT NULL AND ${field} != ''`;
        break;
      case 'GREATER_THAN':
        sql = `${field} > ${value}`;
        break;
      case 'LESS_THAN':
        sql = `${field} < ${value}`;
        break;
      case 'GREATER_EQUAL':
        sql = `${field} >= ${value}`;
        break;
      case 'LESS_EQUAL':
        sql = `${field} <= ${value}`;
        break;
      case 'BETWEEN':
        sql = `${field} BETWEEN ${value} AND ${value2}`;
        break;
      case 'ON':
        sql = `DATE(${field}) = DATE(${escapeValue(value)})`;
        break;
      case 'BEFORE':
        sql = `${field} < ${escapeValue(value)}`;
        break;
      case 'AFTER':
        sql = `${field} > ${escapeValue(value)}`;
        break;
      case 'BETWEEN_DATES':
        sql = `${field} BETWEEN ${escapeValue(value)} AND ${escapeValue(value2)}`;
        break;
      case 'IN_PREVIOUS_PERIOD':
        sql = `${field} BETWEEN DATE_SUB(:startDate, INTERVAL ${value} DAY) AND :startDate`;
        break;
      case 'IN_NEXT_PERIOD':
        sql = `${field} BETWEEN :endDate AND DATE_ADD(:endDate, INTERVAL ${value} DAY)`;
        break;
      case 'IS_ONE_OF': {
        const values = Array.isArray(value) ? value : [value];
        sql = `${field} IN (${values.map((v) => escapeValue(v)).join(', ')})`;
        break;
      }
      case 'IS_NOT_ONE_OF': {
        const notValues = Array.isArray(value) ? value : [value];
        sql = `${field} NOT IN (${notValues.map((v) => escapeValue(v)).join(', ')})`;
        break;
      }
      case 'IS_TRUE':
        sql = `${field} = 1`;
        break;
      case 'IS_FALSE':
        sql = `${field} = 0 OR ${field} IS NULL`;
        break;
      case 'NOT_RECORDED':
        sql = `${field} IS NULL`;
        break;
      case 'WITHIN_HIERARCHY':
        sql = `${field} IN (SELECT location_id FROM location_hierarchy WHERE ancestor_id = ${escapeValue(value)})`;
        break;
      case 'IN_LOCATION':
        sql = `${field} = ${escapeValue(value)}`;
        break;
      default:
        return '';
    }

    return negate ? `NOT (${sql})` : sql;
  }, [escapeValue]);

  /**
   * Convert visual filter to SQL
   */
  const filterToSql = useCallback((group: FilterGroup, depth = 0): string => {
    const conditions = group.conditions.map((cond) => conditionToSql(cond));
    const nestedSql = (group.nestedGroups || []).map((g) => filterToSql(g, depth + 1));

    const allParts = [...conditions, ...nestedSql].filter(Boolean);
    if (allParts.length === 0) return '';

    const operator = group.logicalOperator === 'AND' ? ' AND ' : ' OR ';
    const combined = allParts.join(operator);

    return depth === 0 ? combined : `(${combined})`;
  }, [conditionToSql]);

  /**
   * Add a new condition to a group
   */
  const addCondition = (groupId: string) => {
    const newCondition: FilterCondition = {
      id: `cond-${Date.now()}`,
      field: '',
      fieldLabel: '',
      fieldType: 'TEXT',
      operator: 'EQUALS',
      value: '',
    };

    const updated = updateGroupInTree(visualFilter.rootGroup, groupId, (group) => ({
      ...group,
      conditions: [...group.conditions, newCondition],
    }));

    onChange({ ...visualFilter, rootGroup: updated });
  };

  /**
   * Update a condition
   */
  const updateCondition = (groupId: string, conditionId: string, updates: Partial<FilterCondition>) => {
    const updated = updateGroupInTree(visualFilter.rootGroup, groupId, (group) => ({
      ...group,
      conditions: group.conditions.map((c) =>
        c.id === conditionId ? { ...c, ...updates } : c
      ),
    }));

    // If field changed, update fieldType
    const group = findGroupInTree(updated, groupId);
    const condition = group?.conditions.find((c) => c.id === conditionId);
    if (condition && updates.field) {
      const fieldInfo = availableFields.find((f) => f.name === updates.field);
      if (fieldInfo) {
        condition.fieldType = fieldInfo.type;
        condition.fieldLabel = fieldInfo.label;
        // Reset operator if not compatible with new field type
        const validOperators = getOperatorsForFieldType(fieldInfo.type);
        if (!validOperators.includes(condition.operator)) {
          condition.operator = validOperators[0] || 'EQUALS';
        }
      }
    }

    onChange({ ...visualFilter, rootGroup: updated });
  };

  /**
   * Remove a condition
   */
  const removeCondition = (groupId: string, conditionId: string) => {
    const updated = updateGroupInTree(visualFilter.rootGroup, groupId, (group) => ({
      ...group,
      conditions: group.conditions.filter((c) => c.id !== conditionId),
    }));

    onChange({ ...visualFilter, rootGroup: updated });
  };

  /**
   * Update group logical operator
   */
  const updateGroupOperator = (groupId: string, operator: LogicalOperator) => {
    const updated = updateGroupInTree(visualFilter.rootGroup, groupId, (group) => ({
      ...group,
      logicalOperator: operator,
    }));

    onChange({ ...visualFilter, rootGroup: updated });
  };

  /**
   * Add a nested group
   */
  const addNestedGroup = (parentGroupId: string) => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      logicalOperator: 'AND',
      conditions: [],
    };

    const updated = updateGroupInTree(visualFilter.rootGroup, parentGroupId, (group) => ({
      ...group,
      nestedGroups: [...(group.nestedGroups || []), newGroup],
    }));

    onChange({ ...visualFilter, rootGroup: updated });
  };

  /**
   * Update a group in the tree
   */
  const updateGroupInTree = (
    group: FilterGroup,
    targetId: string,
    updater: (group: FilterGroup) => FilterGroup
  ): FilterGroup => {
    if (group.id === targetId) {
      return updater(group);
    }

    return {
      ...group,
      nestedGroups: (group.nestedGroups || []).map((g) => updateGroupInTree(g, targetId, updater)),
    };
  };

  /**
   * Find a group in the tree
   */
  const findGroupInTree = (group: FilterGroup, targetId: string): FilterGroup | null => {
    if (group.id === targetId) return group;
    for (const nested of group.nestedGroups || []) {
      const found = findGroupInTree(nested, targetId);
      if (found) return found;
    }
    return null;
  };

  /**
   * Toggle group expansion
   */
  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  /**
   * Generate SQL when visual filter changes
   */
  React.useEffect(() => {
    if (visualFilter.useVisualBuilder) {
      const sql = filterToSql(visualFilter.rootGroup);
      onSqlChange(sql);
    }
  }, [visualFilter, filterToSql, onSqlChange]);

  /**
   * Render a filter group
   */
  const renderGroup = (group: FilterGroup, depth = 0): React.ReactNode => {
    const isExpanded = expandedGroups.has(group.id);
    const hasContent = group.conditions.length > 0 || (group.nestedGroups?.length || 0) > 0;

    return (
      <div
        key={group.id}
        className={`${styles['filterGroup']} ${depth > 0 ? styles['nestedGroup'] : ''}`}
      >
        {/* Group header */}
        <div className={styles['groupHeader']}>
          <Select
            id={`group-op-${group.id}`}
            size="sm"
            value={group.logicalOperator}
            onChange={(e: any) => updateGroupOperator(group.id, e.target.value)}
            disabled={disabled}
          >
            <SelectItem value="AND" text="AND" />
            <SelectItem value="OR" text="OR" />
          </Select>

          {depth === 0 && <span>where:</span>}

          {hasContent && (
            <Button
              kind="ghost"
              size="sm"
              renderIcon={isExpanded ? ChevronUp : ChevronDown}
              onClick={() => toggleGroupExpansion(group.id)}
            >
              {isExpanded ? 'Hide' : 'Show'}
            </Button>
          )}

          <Button
            kind="ghost"
            size="sm"
            renderIcon={Add}
            onClick={() => addCondition(group.id)}
            disabled={disabled}
          >
            Add Condition
          </Button>

          <Button
            kind="ghost"
            size="sm"
            onClick={() => addNestedGroup(group.id)}
            disabled={disabled}
          >
            Add Group
          </Button>
        </div>

        {/* Group content */}
        {isExpanded && (
          <div className={styles['groupContent']}>
            {/* Conditions */}
            {group.conditions.map((condition) => (
              <div key={condition.id} className={styles['conditionRow']}>
                <Select
                  id={`cond-field-${condition.id}`}
                  size="sm"
                  value={condition.field}
                  onChange={(e: any) => {
                    const fieldName = e.target.value;
                    const fieldInfo = availableFields.find((f) => f.name === fieldName);
                    updateCondition(group.id, condition.id, {
                      field: fieldName,
                      fieldLabel: fieldInfo?.label || fieldName,
                      fieldType: fieldInfo?.type || 'TEXT',
                    });
                  }}
                  disabled={disabled}
                >
                  <SelectItem value="" text="Select field..." />
                  {availableFields.map((field) => (
                    <SelectItem key={field.name} value={field.name} text={field.label} />
                  ))}
                </Select>

                {condition.field && (
                  <>
                    <Select
                      id={`cond-op-${condition.id}`}
                      size="sm"
                      value={condition.operator}
                      onChange={(e: any) =>
                        updateCondition(group.id, condition.id, { operator: e.target.value })
                      }
                      disabled={disabled}
                    >
                      {getOperatorsForFieldType(condition.fieldType).map((op) => (
                        <SelectItem
                          key={op}
                          value={op}
                          text={getOperatorLabel(op)}
                        />
                      ))}
                    </Select>

                    {operatorNeedsValue(condition.operator) && (
                      <TextInput
                        id={`cond-val-${condition.id}`}
                        labelText=""
                        hideLabel
                        size="sm"
                        placeholder="Value"
                        value={
                          Array.isArray(condition.value) ? condition.value[0] : String(condition.value || '')
                        }
                        onChange={(e) =>
                          updateCondition(group.id, condition.id, {
                            value: (e.target as HTMLInputElement).value,
                          })
                        }
                        disabled={disabled}
                      />
                    )}

                    {operatorNeedsSecondValue(condition.operator) && (
                      <TextInput
                        id={`cond-val2-${condition.id}`}
                        labelText=""
                        hideLabel
                        size="sm"
                        placeholder="To"
                        value={String(condition.value2 || '')}
                        onChange={(e) =>
                          updateCondition(group.id, condition.id, {
                            value2: (e.target as HTMLInputElement).value,
                          })
                        }
                        disabled={disabled}
                      />
                    )}

                    <Toggle
                      id={`cond-negate-${condition.id}`}
                      labelText="Not"
                      toggled={condition.negate || false}
                      onToggle={(checked) =>
                        updateCondition(group.id, condition.id, { negate: checked })
                      }
                      disabled={disabled}
                      size="sm"
                    />

                    <Button
                      kind="ghost"
                      size="sm"
                      hasIconOnly
                      renderIcon={TrashCan}
                      onClick={() => removeCondition(group.id, condition.id)}
                      disabled={disabled}
                      iconDescription="Remove condition"
                    />
                  </>
                )}
              </div>
            ))}

            {/* Nested groups */}
            {group.nestedGroups?.map((nestedGroup) => renderGroup(nestedGroup, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles['container']}>
      <Stack gap={4}>
        {/* Toggle between visual and SQL */}
        <div className={styles['modeToggle']}>
          <Toggle
            id="filter-mode-toggle"
            labelText="Use visual filter builder"
            toggled={visualFilter.useVisualBuilder}
            onToggle={(checked) =>
              onChange({ ...visualFilter, useVisualBuilder: checked })
            }
            disabled={disabled}
          />
        </div>

        {/* Visual filter builder */}
        {visualFilter.useVisualBuilder ? (
          <div className={styles['visualBuilder']}>
            <p className={styles['helperText']}>
              Build your filter conditions by selecting fields and operators. Conditions will be
              combined with AND/OR logic.
            </p>
            {renderGroup(visualFilter.rootGroup)}
          </div>
        ) : (
          <p className={styles['helperText']}>
            Visual builder is disabled. Edit SQL directly in the editor below.
          </p>
        )}
      </Stack>
    </div>
  );
}

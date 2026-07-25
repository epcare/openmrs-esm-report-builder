/**
 * Query Configuration Panel - Redesigned to match mockup
 *
 * Accordion-style panel with:
 * - Dataset
 * - Population (with visual filter builder)
 * - Columns
 * - Filters
 * - Sort
 * - Parameters
 * - Display & Export
 */

import React, { useState, useCallback } from 'react';
import {
  Stack,
  Button,
  Select,
  SelectItem,
  TextInput,
  Tag,
  Toggle,
} from '@carbon/react';
import {
  DataTable,
  Filter,
  Settings,
  SortAscending,
  List,
  Export,
  ChevronDown,
  ChevronUp,
  Add,
  TrashCan,
  Document,
  Code,
} from '@carbon/react/icons';
import type {
  LinelistReportDraft,
  FilterFieldType,
  FilterCondition,
  PopulationMode,
  LogicalOperator,
} from '../../types/linelist-types';
import type { IndicatorDto } from '../../resources/indicator/indicators.api';
import type { IndicatorOption } from '../indicators/types/composite-indicator.types';
import IndicatorSearchSelect from '../indicators/indicator-search-select.component';
import JsonPreview from './json-preview.component';
import ColumnCategorySelector from './column-category-selector.component';
import styles from './query-config-panel.scss';

type Props = {
  draft: LinelistReportDraft;
  onDraftChange: (updates: Partial<LinelistReportDraft>) => void;
  availableFields?: Array<{ name: string; label: string; type: FilterFieldType }>; // From data source (for columns)
  populationFields?: Array<{ name: string; label: string; type: FilterFieldType }>; // From theme (for population filters)
  indicators?: IndicatorDto[]; // Available indicators
  onRemoveColumn?: (columnId: string) => void; // Handler to remove a column
  disabled?: boolean;
};

type IndicatorRule = {
  id: string;
  indicatorUuid: string;
  name: string;
  logicalOperator?: 'AND' | 'OR';
  negate?: boolean;
};

/**
 * Get operators for field type
 */
function getOperatorsForFieldType(fieldType: FilterFieldType): string[] {
  switch (fieldType) {
    case 'TEXT':
      return ['equals', 'not equals', 'contains', 'starts with', 'is blank'];
    case 'NUMBER':
      return ['equals', 'not equals', 'greater than', 'less than', 'between'];
    case 'DATE':
      return ['on', 'before', 'after', 'between'];
    case 'CODED':
      return ['is one of', 'is not one of'];
    case 'BOOLEAN':
      return ['is true', 'is false', 'not recorded'];
    case 'LOCATION':
      return ['equals', 'within hierarchy'];
    default:
      return ['equals', 'not equals'];
  }
}

/**
 * Section state type
 */
type SectionKey = 'dataset' | 'population' | 'columns' | 'filters' | 'sort' | 'parameters' | 'display' | 'json-preview';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function QueryConfigPanel({ draft, onDraftChange, availableFields = [], populationFields = [], indicators = [], onRemoveColumn, disabled = false }: Props) {
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set(['population']));
  const [populationMode, setPopulationMode] = useState<PopulationMode>(draft.populationMode || 'SQL');

  // Drag and drop state for columns (for future use)
  // const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  // const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  /**
   * Toggle section expansion
   */
  const toggleSection = useCallback((key: SectionKey) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  /**
   * Add a condition to population filter
   */
  const addPopulationCondition = useCallback(() => {
    const newCondition: FilterCondition = {
      id: `cond-${Date.now()}`,
      field: '',
      fieldLabel: '',
      fieldType: 'DATE',
      operator: 'BETWEEN_DATES',
      value: '',
    };

    // Ensure visualFilter and rootGroup exist
    const currentConditions = draft.visualFilter?.rootGroup?.conditions || [];
    const updatedFilter = {
      rootGroup: {
        id: 'root',
        logicalOperator: (draft.visualFilter?.rootGroup?.logicalOperator || 'AND') as LogicalOperator,
        conditions: [...currentConditions, newCondition],
      },
      useVisualBuilder: true,
    };

    onDraftChange({ visualFilter: updatedFilter });
  }, [draft.visualFilter, onDraftChange]);

  /**
   * Update a condition in population filter
   */
  const updatePopulationCondition = useCallback((conditionId: string, updates: Partial<FilterCondition>) => {
    const currentConditions = draft.visualFilter?.rootGroup?.conditions || [];
    const updatedConditions = currentConditions.map((c) =>
      c.id === conditionId ? { ...c, ...updates } : c
    );

    // If field changed, update fieldType and reset operator if needed
    const updatedCondition = updatedConditions.find((c) => c.id === conditionId);
    if (updatedCondition && updates.field) {
      const fieldInfo = populationFields.find((f) => f.name === updates.field);
      if (fieldInfo) {
        updatedCondition.fieldType = fieldInfo.type;
        updatedCondition.fieldLabel = fieldInfo.label;
        // Reset operator if not compatible
        const validOps = getOperatorsForFieldType(fieldInfo.type);
        if (!validOps.includes(updatedCondition.operator.toLowerCase())) {
          updatedCondition.operator = 'EQUALS';
        }
      }
    }

    const updatedFilter = {
      rootGroup: {
        id: draft.visualFilter?.rootGroup?.id || 'root',
        logicalOperator: (draft.visualFilter?.rootGroup?.logicalOperator || 'AND') as LogicalOperator,
        conditions: updatedConditions,
      },
      useVisualBuilder: true,
    };

    onDraftChange({ visualFilter: updatedFilter });
  }, [draft.visualFilter, onDraftChange, populationFields]);

  /**
   * Remove a condition from population filter
   */
  const removePopulationCondition = useCallback((conditionId: string) => {
    const currentConditions = draft.visualFilter?.rootGroup?.conditions || [];
    const updatedConditions = currentConditions.filter(
      (c) => c.id !== conditionId
    );

    const updatedFilter = {
      rootGroup: {
        id: draft.visualFilter?.rootGroup?.id || 'root',
        logicalOperator: (draft.visualFilter?.rootGroup?.logicalOperator || 'AND') as LogicalOperator,
        conditions: updatedConditions,
      },
      useVisualBuilder: true,
    };

    onDraftChange({ visualFilter: updatedFilter });
  }, [draft.visualFilter, onDraftChange]);

  /**
   * Handle population mode change
   */
  const handlePopulationModeChange = useCallback((mode: PopulationMode) => {
    setPopulationMode(mode);
    onDraftChange({ populationMode: mode });

    // Initialize indicatorRules array if switching to INDICATOR mode
    if (mode === 'INDICATOR' && !draft.indicatorRules) {
      onDraftChange({ indicatorRules: [] });
    }
  }, [onDraftChange, draft.indicatorRules]);

  /**
   * Add an indicator rule
   */
  const addIndicatorRule = useCallback(() => {
    const newRule: IndicatorRule = {
      id: `rule-${Date.now()}`,
      indicatorUuid: '',
      name: '',
      logicalOperator: 'AND',
      negate: false,
    };

    const updatedRules = [...(draft.indicatorRules || []), newRule];
    onDraftChange({ indicatorRules: updatedRules });
  }, [draft.indicatorRules, onDraftChange]);

  /**
   * Update an indicator rule
   */
  const updateIndicatorRule = useCallback((ruleId: string, updates: Partial<IndicatorRule>) => {
    const updatedRules = (draft.indicatorRules || []).map((rule) =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );
    onDraftChange({ indicatorRules: updatedRules });
  }, [draft.indicatorRules, onDraftChange]);

  /**
   * Handle indicator selection from IndicatorSearchSelect
   */
  const handleIndicatorSelect = useCallback((ruleId: string, indicatorUuid: string, option: IndicatorOption | null) => {
    const updatedRules = (draft.indicatorRules || []).map((rule) =>
      rule.id === ruleId
        ? { ...rule, indicatorUuid, name: option?.name || '' }
        : rule
    );
    onDraftChange({ indicatorRules: updatedRules });
  }, [draft.indicatorRules, onDraftChange]);

  /**
   * Remove an indicator rule
   */
  const removeIndicatorRule = useCallback((ruleId: string) => {
    const updatedRules = (draft.indicatorRules || []).filter((rule) => rule.id !== ruleId);
    onDraftChange({ indicatorRules: updatedRules });
  }, [draft.indicatorRules, onDraftChange]);

  const conditions = draft.visualFilter?.rootGroup?.conditions || [];

  /**
   * Drag and drop handlers for columns (for future use)
   */
  // const handleDragStart = useCallback((index: number) => {
  //   setDraggedIndex(index);
  // }, []);

  // const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
  //   e.preventDefault();
  //   if (draggedIndex === null || draggedIndex === index) return;
  //   setDragOverIndex(index);
  // }, [draggedIndex]);

  // const handleDragEnd = useCallback(() => {
  //   setDraggedIndex(null);
  //   setDragOverIndex(null);
  // }, []);

  // const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
  //   e.preventDefault();
  //   if (draggedIndex === null || draggedIndex === dropIndex) return;

  //   // Create new columns array with reordered items
  //   const newColumns = [...draft.columns];
  //   const [removed] = newColumns.splice(draggedIndex, 1);
  //   newColumns.splice(dropIndex, 0, removed);

  //   onDraftChange({ columns: newColumns });
  //   handleDragEnd();
  // }, [draft.columns, draggedIndex, onDraftChange, handleDragEnd]);

  return (
    <div className={styles.container}>
      {/* Dataset Section */}
      <div className={styles.section}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection('dataset')}
          type="button"
        >
          <div className={styles.sectionHeaderLeft}>
            <DataTable size={20} />
            <span className={styles.sectionTitle}>Dataset</span>
          </div>
          <div className={styles.sectionHeaderRight}>
            {expandedSections.has('dataset') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>
        {expandedSections.has('dataset') && (
          <div className={styles.sectionContent}>
            <div className={styles.datasetInfo}>
              <div className={styles.datasetRow}>
                <span className={styles.datasetLabel}>Data theme:</span>
                <span className={styles.datasetValue}>{draft.themeUuid || 'Not selected'}</span>
              </div>
              <div className={styles.datasetRow}>
                <span className={styles.datasetLabel}>Data source:</span>
                <span className={styles.datasetValue}>{draft.dataSourceUuid || 'Not selected'}</span>
              </div>
              <div className={styles.datasetRow}>
                <span className={styles.datasetLabel}>Row grain:</span>
                <span className={styles.datasetValue}>{draft.rowGrain || 'Not set'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Population Section */}
      <div className={styles.section}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection('population')}
          type="button"
        >
          <div className={styles.sectionHeaderLeft}>
            <DataTable size={20} />
            <span className={styles.sectionTitle}>Population</span>
            <Tag size="sm" type="blue">{populationMode === 'INDICATOR' ? (draft.indicatorRules?.length || 0) : conditions.length}</Tag>
          </div>
          <div className={styles.sectionHeaderRight}>
            {expandedSections.has('population') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>
        {expandedSections.has('population') && (
          <div className={styles.sectionContent}>
            {/* Population Mode Selector */}
            <div className={styles.populationModeSelector}>
              <span className={styles.modeLabel}>Define population using:</span>
              <Select
                id="population-mode"
                size="sm"
                value={populationMode}
                onChange={(e: any) => handlePopulationModeChange(e.target.value as PopulationMode)}
                disabled={disabled}
                labelText=""
                inline
              >
                <SelectItem value="SQL" text="SQL Query" />
                <SelectItem value="INDICATOR" text="Indicators" />
                <SelectItem value="HYBRID" text="Hybrid (SQL + Indicators)" />
              </Select>
            </div>

            {populationMode === 'SQL' && (
              <>
                <div className={styles.populationHeader}>
                  <span className={styles.populationLabel}>All patients where (SQL):</span>
                </div>

                <Stack gap={3} className={styles.conditionsStack}>
                  {conditions.map((condition, index) => (
                    <div key={condition.id} className={styles.conditionRow}>
                      {/* Field dropdown */}
                      <Select
                        id={`field-${condition.id}`}
                        size="sm"
                        value={condition.field}
                        onChange={(e: any) => {
                          const fieldName = e.target.value;
                          const fieldInfo = populationFields.find((f) => f.name === fieldName);
                          updatePopulationCondition(condition.id, {
                            field: fieldName,
                            fieldLabel: fieldInfo?.label || fieldName,
                            fieldType: fieldInfo?.type || 'TEXT',
                          });
                        }}
                        disabled={disabled}
                        labelText=""
                      >
                        <SelectItem value="" text="Select field..." />
                        {populationFields.map((field) => (
                          <SelectItem key={field.name} value={field.name} text={field.label} />
                        ))}
                      </Select>

                      {/* Operator dropdown */}
                      <Select
                        id={`operator-${condition.id}`}
                        size="sm"
                        value={condition.operator}
                        onChange={(e: any) => updatePopulationCondition(condition.id, { operator: e.target.value })}
                        disabled={disabled || !condition.field}
                        labelText=""
                      >
                        {getOperatorsForFieldType(condition.fieldType).map((op) => (
                          <SelectItem
                            key={op.toUpperCase()}
                            value={op.toUpperCase()}
                            text={op.charAt(0).toUpperCase() + op.slice(1)}
                          />
                        ))}
                      </Select>

                      {/* Value input(s) */}
                      {condition.operator !== 'IS_BLANK' && condition.operator !== 'IS_TRUE' &&
                       condition.operator !== 'IS_FALSE' && condition.operator !== 'NOT_RECORDED' && (
                        <TextInput
                          id={`value-${condition.id}`}
                          size="sm"
                          placeholder={condition.fieldType === 'DATE' ? 'Start Date' : 'Value'}
                          value={Array.isArray(condition.value) ? condition.value[0] || '' : (condition.value || '')}
                          onChange={(e) =>
                            updatePopulationCondition(condition.id, { value: (e.target as HTMLInputElement).value })
                          }
                          disabled={disabled || !condition.field}
                          labelText=""
                        />
                      )}

                      {/* Second value for "between" operators */}
                      {(condition.operator === 'BETWEEN' || condition.operator === 'BETWEEN_DATES') && (
                        <TextInput
                          id={`value2-${condition.id}`}
                          size="sm"
                          placeholder={condition.fieldType === 'DATE' ? 'End Date' : 'To'}
                          value={condition.value2 || ''}
                          onChange={(e) =>
                            updatePopulationCondition(condition.id, { value2: (e.target as HTMLInputElement).value })
                          }
                          disabled={disabled || !condition.field}
                          labelText=""
                        />
                      )}

                      {/* "and" text between conditions */}
                      {index < conditions.length - 1 && (
                        <span className={styles.andText}>and</span>
                      )}

                      {/* Delete button */}
                      <Button
                        kind="ghost"
                        size="sm"
                        hasIconOnly
                        renderIcon={TrashCan}
                        onClick={() => removePopulationCondition(condition.id)}
                        disabled={disabled}
                        iconDescription="Remove condition"
                      />
                    </div>
                  ))}

                  {/* Add condition button */}
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={Add}
                    onClick={addPopulationCondition}
                    disabled={disabled}
                  >
                    Add condition
                  </Button>
                </Stack>
              </>
            )}

            {populationMode === 'INDICATOR' && (
              <>
                <div className={styles.populationHeader}>
                  <span className={styles.populationLabel}>All patients matching these indicators:</span>
                  <span className={styles.populationHint}>
                    Use indicators with prebuilt query definitions for patient selection
                  </span>
                </div>

                <Stack gap={3} className={styles.conditionsStack}>
                  {(draft.indicatorRules || []).map((rule, index) => (
                    <div key={rule.id} className={styles.conditionRow}>
                      <Document size={16} className={styles.rowIcon} />

                      {/* Indicator search select */}
                      <div className={styles.indicatorSearch}>
                        <IndicatorSearchSelect
                          id={`indicator-${rule.id}`}
                          titleText=""
                          selectedId={rule.indicatorUuid}
                          disabled={disabled}
                          onChange={(indicatorUuid, option) => handleIndicatorSelect(rule.id, indicatorUuid, option)}
                          placeholder="Search indicators..."
                        />
                      </div>

                      {/* Logical operator */}
                      <Select
                        id={`logical-${rule.id}`}
                        size="sm"
                        value={rule.logicalOperator || 'AND'}
                        onChange={(e: any) => updateIndicatorRule(rule.id, { logicalOperator: e.target.value })}
                        disabled={disabled || !rule.indicatorUuid}
                        labelText=""
                      >
                        <SelectItem value="AND" text="AND" />
                        <SelectItem value="OR" text="OR" />
                      </Select>

                      {/* Negate toggle - only show when indicator is selected */}
                      {rule.indicatorUuid && (
                        <div className={styles.negateToggle}>
                          <Toggle
                            id={`negate-${rule.id}`}
                            labelA="Include"
                            labelB="Exclude"
                            toggled={rule.negate ?? false}
                            onToggle={(checked) => updateIndicatorRule(rule.id, { negate: checked })}
                            disabled={disabled}
                          />
                        </div>
                      )}

                      {/* "and" text between conditions */}
                      {index < (draft.indicatorRules?.length || 0) - 1 && (
                        <span className={styles.andText}>and</span>
                      )}

                      {/* Delete button */}
                      <Button
                        kind="ghost"
                        size="sm"
                        hasIconOnly
                        renderIcon={TrashCan}
                        onClick={() => removeIndicatorRule(rule.id)}
                        disabled={disabled}
                        iconDescription="Remove indicator"
                      />
                    </div>
                  ))}

                  {/* Add indicator button */}
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={Add}
                    onClick={addIndicatorRule}
                    disabled={disabled}
                  >
                    Add indicator
                  </Button>
                </Stack>
              </>
            )}

            {populationMode === 'HYBRID' && (
              <div className={styles.placeholderContent}>
                <p>Hybrid mode combines SQL and Indicators.</p>
                <p className={styles.placeholderSubtext}>
                  Select indicators from your theme and add custom SQL conditions.
                </p>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Add}
                  onClick={addIndicatorRule}
                  disabled={disabled}
                >
                  Add indicator
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Columns Section */}
      <div className={styles.section}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection('columns')}
          type="button"
        >
          <div className={styles.sectionHeaderLeft}>
            <List size={20} />
            <span className={styles.sectionTitle}>Columns</span>
            <Tag size="sm" type="gray">{draft.columns.length}</Tag>
          </div>
          <div className={styles.sectionHeaderRight}>
            {expandedSections.has('columns') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>
        {expandedSections.has('columns') && (
          <div className={styles.sectionContent}>
            <ColumnCategorySelector
              columns={draft.columns}
              onChange={(columns) => onDraftChange({ columns })}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Filters Section */}
      <div className={styles.section}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection('filters')}
          type="button"
        >
          <div className={styles.sectionHeaderLeft}>
            <Filter size={20} />
            <span className={styles.sectionTitle}>Filters</span>
            <Tag size="sm" type="gray">0</Tag>
          </div>
          <div className={styles.sectionHeaderRight}>
            {expandedSections.has('filters') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>
        {expandedSections.has('filters') && (
          <div className={styles.sectionContent}>
            <div className={styles.placeholderContent}>
              <p>Runtime filters configuration will be shown here.</p>
              <p className={styles.placeholderSubtext}>Filters shown when running the report</p>
            </div>
          </div>
        )}
      </div>

      {/* Sort Section */}
      <div className={styles.section}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection('sort')}
          type="button"
        >
          <div className={styles.sectionHeaderLeft}>
            <SortAscending size={20} />
            <span className={styles.sectionTitle}>Sort</span>
            <Tag size="sm" type="gray">{draft.sortConfig.length}</Tag>
          </div>
                   <div className={styles.sectionHeaderRight}>
            {expandedSections.has('sort') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>
        {expandedSections.has('sort') && (
          <div className={styles.sectionContent}>
            <div className={styles.placeholderContent}>
              <p>Sort configuration will be shown here.</p>
              <p className={styles.placeholderSubtext}>
                {draft.sortConfig.length} sort rule{draft.sortConfig.length !== 1 ? 's' : ''} defined
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Parameters Section */}
      <div className={styles.section}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection('parameters')}
          type="button"
        >
          <div className={styles.sectionHeaderLeft}>
            <Settings size={20} />
            <span className={styles.sectionTitle}>Parameters</span>
            <Tag size="sm" type="gray">{draft.parameters.length}</Tag>
          </div>
          <div className={styles.sectionHeaderRight}>
            {expandedSections.has('parameters') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>
        {expandedSections.has('parameters') && (
          <div className={styles.sectionContent}>
            <div className={styles.placeholderContent}>
              <p>Parameters configuration will be shown here.</p>
              <p className={styles.placeholderSubtext}>
                {draft.parameters.length} parameter{draft.parameters.length !== 1 ? 's' : ''} defined
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Display & Export Section */}
      <div className={styles.section}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection('display')}
          type="button"
        >
          <div className={styles.sectionHeaderLeft}>
            <Export size={20} />
            <span className={styles.sectionTitle}>Display & Export</span>
          </div>
          <div className={styles.sectionHeaderRight}>
            {expandedSections.has('display') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>
        {expandedSections.has('display') && (
          <div className={styles.sectionContent}>
            <div className={styles.placeholderContent}>
              <p>Display and export settings will be shown here.</p>
              <p className={styles.placeholderSubtext}>Page size, export formats, etc.</p>
            </div>
          </div>
        )}
      </div>

      {/* JSON Preview Section */}
      <div className={styles.section}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection('json-preview')}
          type="button"
        >
          <div className={styles.sectionHeaderLeft}>
            <Code size={20} />
            <span className={styles.sectionTitle}>JSON Preview</span>
            <Tag size="sm" type="teal">Live</Tag>
          </div>
          <div className={styles.sectionHeaderRight}>
            {expandedSections.has('json-preview') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>
        {expandedSections.has('json-preview') && (
          <div className={styles.sectionContent}>
            <JsonPreview draft={draft} indicators={indicators} />
          </div>
        )}
      </div>
    </div>
  );
}

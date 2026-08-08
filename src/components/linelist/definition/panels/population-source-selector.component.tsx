/**
 * Population Source Selector Component for Linelist Reports
 *
 * Allows users to select multiple datasources for population definition.
 * Each datasource can have a different join type (JOIN, INTERSECT, UNION, EXCEPT).
 * Selected sources are shown as tags with controls for join type and removal.
 *
 * This replaces the theme-based approach with direct datasource selection.
 */

import React, { useMemo, useState } from 'react';
import {
  Button,
  Tag,
  Stack,
  MultiSelect,
  Select,
  SelectItem,
  Toggle,
  TextInput,
} from '@carbon/react';
import {
  Close,
  Information,
  ChevronDown,
  ChevronUp,
} from '@carbon/react/icons';
import type { PopulationSource, PopulationJoinType } from '../../../../types/linelist-types';
import { useETLTables } from '../../../../hooks/theme';
import styles from './population-source-selector.scss';

type Props = {
  /** Currently selected population sources */
  populationSources: PopulationSource[];
  /** Callback when population sources change */
  onChange: (populationSources: PopulationSource[]) => void;
  /** Disable the component */
  disabled?: boolean;
  /** Show advanced options (custom join conditions) */
  showAdvanced?: boolean;
};

const CORE_SOURCES: Omit<PopulationSource, 'enabled' | 'order'>[] = [
  {
    uuid: 'person_attributes',
    name: 'Person Attributes',
    type: 'CORE',
    joinType: 'JOIN',
  },
];

const JOIN_TYPE_OPTIONS: Array<{ value: PopulationJoinType; label: string; description: string }> = [
  { value: 'JOIN', label: 'JOIN', description: 'Combine sources with matching patient_ids (INNER JOIN)' },
  { value: 'LEFT_JOIN', label: 'LEFT JOIN', description: 'All patients from first source, match from second' },
  { value: 'INTERSECT', label: 'INTERSECT', description: 'Patients present in ALL sources (AND logic)' },
  { value: 'UNION', label: 'UNION', description: 'Patients from ANY source (OR logic)' },
  { value: 'EXCEPT', label: 'EXCEPT', description: 'Patients in first source but NOT in second' },
];

const PopulationSourceSelector: React.FC<Props> = ({
  populationSources,
  onChange,
  disabled = false,
  showAdvanced = false,
}) => {
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);

  // Fetch available ETL tables
  const { tables, loading: tablesLoading, error: tablesError } = useETLTables(true);

  /**
   * Get the next order number for new sources
   */
  const nextOrder = useMemo(() => {
    if (populationSources.length === 0) return 0;
    return Math.max(...populationSources.map(ps => ps.order)) + 1;
  }, [populationSources]);

  /**
   * Prepare items for MultiSelect - combine all available tables and core sources
   */
  const allAvailable = useMemo(() => {
    const allTables = tables || [];
    const tableItems = allTables.map(t => ({ id: t, label: t, type: 'ETL' as const }));
    const coreItems = CORE_SOURCES.map(ds => ({ id: ds.uuid, label: ds.name, type: 'CORE' as const }));
    return [...tableItems, ...coreItems];
  }, [tables]);

  /**
   * Selected items for MultiSelect
   */
  const selectedItems = useMemo(() => {
    return populationSources.map(ps => ({ id: ps.uuid, label: ps.name }));
  }, [populationSources]);

  /**
   * Handle MultiSelect change - add/remove datasources
   */
  const handleMultiSelectChange = ({ selectedItems }: { selectedItems: Array<{ id: string }> }) => {
    const currentUuids = new Set(populationSources.map(ps => ps.uuid));
    const newSelections = selectedItems.filter(item => !currentUuids.has(item.id));
    const removedUuids = populationSources
      .map(ps => ps.uuid)
      .filter(uuid => !selectedItems.some(item => item.id === uuid));

    // Add new selections
    const toAdd: PopulationSource[] = newSelections.map((item) => {
      const coreSource = CORE_SOURCES.find(ds => ds.uuid === item.id);
      const baseSource = coreSource || {
        uuid: item.id,
        name: item.id,
        type: item.id.startsWith('mamba_') ? 'ETL' : 'SQL',
        joinType: 'JOIN' as PopulationJoinType,
      };
      return {
        ...baseSource,
        enabled: true,
        order: nextOrder + newSelections.findIndex(s => s.id === item.id),
      };
    });

    // Remove datasources
    const updated = populationSources.filter(ps => !removedUuids.includes(ps.uuid));

    // Combine existing with new additions
    onChange([...updated, ...toAdd]);
  };

  /**
   * Handle source property changes
   */
  const handleSourceChange = (uuid: string, updates: Partial<PopulationSource>) => {
    onChange(
      populationSources.map(ps =>
        ps.uuid === uuid ? { ...ps, ...updates } : ps
      )
    );
  };

  /**
   * Remove a source
   */
  const handleRemoveSource = (uuid: string) => {
    onChange(populationSources.filter(ps => ps.uuid !== uuid));
    if (expandedSourceId === uuid) {
      setExpandedSourceId(null);
    }
  };

  /**
   * Toggle source expansion
   */
  const toggleExpand = (uuid: string) => {
    setExpandedSourceId(expandedSourceId === uuid ? null : uuid);
  };

  /**
   * Move source up in order
   */
  const handleMoveUp = (uuid: string) => {
    const sources = [...populationSources];
    const index = sources.findIndex(ps => ps.uuid === uuid);
    if (index > 0) {
      [sources[index - 1], sources[index]] = [sources[index], sources[index - 1]];
      // Update orders
      sources.forEach((ps, i) => ps.order = i);
      onChange(sources);
    }
  };

  /**
   * Move source down in order
   */
  const handleMoveDown = (uuid: string) => {
    const sources = [...populationSources];
    const index = sources.findIndex(ps => ps.uuid === uuid);
    if (index < sources.length - 1) {
      [sources[index], sources[index + 1]] = [sources[index + 1], sources[index]];
      // Update orders
      sources.forEach((ps, i) => ps.order = i);
      onChange(sources);
    }
  };

  /**
   * Get join type color
   */
  const getJoinTypeColor = (joinType: PopulationJoinType): 'blue' | 'green' | 'purple' | 'red' | 'gray' => {
    switch (joinType) {
      case 'JOIN':
      case 'LEFT_JOIN':
        return 'blue';
      case 'INTERSECT':
        return 'green';
      case 'UNION':
        return 'purple';
      case 'EXCEPT':
        return 'red';
      default:
        return 'gray';
    }
  };

  /**
   * Get enabled sources count
   */
  const enabledCount = populationSources.filter(ps => ps.enabled).length;

  return (
    <div className={styles.container}>
      <Stack gap={4}>
        {/* Header with info */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Information size={16} />
            <h4>Population Sources</h4>
          </div>
          <p className={styles.headerDescription}>
            Select multiple datasources to define the patient population. Each source can have a different join type.
          </p>
        </div>

        {/* Sources MultiSelect */}
        <div className={styles.addSection}>
          <MultiSelect
            id="population-sources-multiselect"
            titleText="Add Population Sources"
            label="Search and select datasources..."
            placeholder="Type to search datasources..."
            items={allAvailable}
            selectedItems={selectedItems}
            itemToString={(item: any) => item?.label || ''}
            onChange={handleMultiSelectChange}
            disabled={disabled || tablesLoading}
            size="sm"
            selectionFeedback="fixed"
          />
          {tablesError && (
            <div className={styles.error}>Failed to load tables: {tablesError}</div>
          )}
        </div>

        {/* Selected Sources List */}
        {populationSources.length > 0 && (
          <div className={styles.listSection}>
            <div className={styles.listHeader}>
              <h5 className={styles.listTitle}>
                Selected Sources ({enabledCount} enabled)
              </h5>
              {enabledCount < populationSources.length && (
                <Button
                  kind="ghost"
                  size="sm"
                  onClick={() => onChange(populationSources.map(ps => ({ ...ps, enabled: true })))}
                  disabled={disabled}
                >
                  Enable All
                </Button>
              )}
            </div>

            <Stack gap={2}>
              {populationSources
                .sort((a, b) => a.order - b.order)
                .map((ps, index) => (
                  <div
                    key={ps.uuid}
                    className={`${styles.sourceCard} ${!ps.enabled ? styles.sourceCardDisabled : ''}`}
                    data-join-type={ps.joinType}
                  >
                    <div className={styles.cardHeader}>
                      <div className={styles.cardInfo}>
                        <Tag
                          type={ps.enabled ? getJoinTypeColor(ps.joinType) : 'gray'}
                          size="sm"
                        >
                          {ps.joinType}
                        </Tag>
                        <span className={styles.dsName}>{ps.name}</span>
                        <Tag type="cool-gray" size="sm">{ps.type}</Tag>
                      </div>
                      <div className={styles.cardActions}>
                        <Button
                          kind="ghost"
                          size="sm"
                          hasIconOnly
                          renderIcon={ChevronUp}
                          iconDescription="Move up"
                          onClick={() => handleMoveUp(ps.uuid)}
                          disabled={disabled || index === 0}
                        />
                        <Button
                          kind="ghost"
                          size="sm"
                          hasIconOnly
                          renderIcon={ChevronDown}
                          iconDescription="Move down"
                          onClick={() => handleMoveDown(ps.uuid)}
                          disabled={disabled || index === populationSources.length - 1}
                        />
                        <Button
                          kind="ghost"
                          size="sm"
                          hasIconOnly
                          renderIcon={Close}
                          iconDescription="Remove"
                          onClick={() => handleRemoveSource(ps.uuid)}
                          disabled={disabled}
                        />
                      </div>
                    </div>

                    <div className={styles.cardControls}>
                      <div className={styles.controlRow}>
                        <Toggle
                          id={`enable-${ps.uuid}`}
                          labelText="Enabled"
                          toggled={ps.enabled}
                          onToggle={(checked) => handleSourceChange(ps.uuid, { enabled: checked })}
                          disabled={disabled}
                          size="sm"
                        />
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() => toggleExpand(ps.uuid)}
                          disabled={disabled}
                        >
                          {expandedSourceId === ps.uuid ? 'Hide Options' : 'Show Options'}
                        </Button>
                      </div>

                      {expandedSourceId === ps.uuid && (
                        <div className={styles.expandedOptions}>
                          <div className={styles.optionRow}>
                            <Select
                              id={`join-type-${ps.uuid}`}
                              labelText="Join Type"
                              value={ps.joinType}
                              onChange={(e) => handleSourceChange(ps.uuid, {
                                joinType: e.target.value as PopulationJoinType
                              })}
                              disabled={disabled || !ps.enabled}
                              size="sm"
                            >
                              {JOIN_TYPE_OPTIONS.map(opt => (
                                <SelectItem
                                  key={opt.value}
                                  value={opt.value}
                                  text={opt.label}
                                  title={opt.description}
                                />
                              ))}
                            </Select>
                          </div>

                          {(ps.joinType === 'JOIN' || ps.joinType === 'LEFT_JOIN') && showAdvanced && (
                            <div className={styles.optionRow}>
                              <TextInput
                                id={`join-condition-${ps.uuid}`}
                                labelText="Custom Join Condition"
                                placeholder="e.g., a.patient_id = b.patient_id"
                                value={ps.joinCondition || ''}
                                onChange={(e) => handleSourceChange(ps.uuid, {
                                  joinCondition: e.target.value
                                })}
                                disabled={disabled || !ps.enabled}
                                size="sm"
                              />
                            </div>
                          )}

                          <div className={styles.optionDescription}>
                            {JOIN_TYPE_OPTIONS.find(opt => opt.value === ps.joinType)?.description}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </Stack>
          </div>
        )}

        {/* Empty State */}
        {populationSources.length === 0 && (
          <div className={styles.emptyState}>
            <p>No population sources selected. Add datasources above to define the patient cohort.</p>
          </div>
        )}

        {/* Summary */}
        {populationSources.length > 0 && (
          <div className={styles.summary}>
            <span>{populationSources.length} source{populationSources.length !== 1 ? 's' : ''} selected</span>
            <span>{enabledCount} enabled</span>
            {enabledCount > 1 && (
              <span>Order matters for INTERSECT/EXCEPT operations</span>
            )}
          </div>
        )}
      </Stack>
    </div>
  );
};

export default PopulationSourceSelector;

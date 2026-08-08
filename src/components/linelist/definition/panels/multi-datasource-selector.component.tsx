/**
 * Multi-Datasource Selector Component for Linelist Reports
 *
 * Allows users to select multiple datasources to browse columns from.
 * Uses the 'Add button' pattern - single dropdown + 'Add' button builds a list.
 *
 * This component is about column selection, not population definition.
 * Users can pick columns from multiple datasources and the backend handles joining.
 */

import React, { useMemo } from 'react';
import {
  Button,
  ButtonSet,
  Tag,
  Stack,
  MultiSelect,
} from '@carbon/react';
import { Close, Information } from '@carbon/react/icons';
import type { DataSourceInfo } from '../../../../types/linelist-types';
import { useETLTables } from '../../../../hooks/theme';
import styles from './multi-datasource-selector.scss';

type Props = {
  /** Currently selected datasources */
  dataSources: DataSourceInfo[];
  /** Callback when datasources change */
  onChange: (dataSources: DataSourceInfo[]) => void;
  /** Disable the component */
  disabled?: boolean;
};

const CORE_DATASOURCES: DataSourceInfo[] = [
  {
    uuid: 'person_attributes',
    name: 'Person Attributes',
    type: 'CORE',
    role: 'REFERENCE',
  },
  {
    uuid: 'patient_identifiers',
    name: 'Patient Identifiers',
    type: 'CORE',
    role: 'REFERENCE',
  },
];

const MultiDatasourceSelector: React.FC<Props> = ({
  dataSources,
  onChange,
  disabled = false,
}) => {
  // const [showCore, setShowCore] = useState(false);

  // Fetch available ETL tables
  const { tables, loading: tablesLoading, error: tablesError } = useETLTables(true);

  /**
   * Get primary datasource (should be exactly one)
   */
  const primaryDs = dataSources.find(ds => ds.role === 'PRIMARY');
  const secondaryDs = dataSources.filter(ds => ds.role === 'SECONDARY');
  const referenceDs = dataSources.filter(ds => ds.role === 'REFERENCE');

  /**
   * Check if a datasource is already selected
   */
  // const isSelected = (uuid: string) => {
  //   return dataSources.some(ds => ds.uuid === uuid);
  // };

  /**
   * Handle MultiSelect change - add/remove datasources
   */
  const handleMultiSelectChange = ({ selectedItems }: { selectedItems: Array<{ id: string }> }) => {
    // Get the newly selected items (items in selectedItems but not in current dataSources)
    const currentUuids = new Set(dataSources.map(ds => ds.uuid));
    const newSelections = selectedItems.filter(item => !currentUuids.has(item.id));

    // Get the removed items (items in current dataSources but not in selectedItems)
    const removedUuids = dataSources
      .map(ds => ds.uuid)
      .filter(uuid => !selectedItems.some(item => item.id === uuid));

    // Determine role for new selections - if no primary exists, first new one becomes primary
    let needsPrimary = !primaryDs;

    // Add new selections
    const toAdd: DataSourceInfo[] = newSelections.map((item) => {
      const isCore = CORE_DATASOURCES.some(ds => ds.uuid === item.id);
      const role = needsPrimary && !isCore ? 'PRIMARY' : (isCore ? 'REFERENCE' : 'SECONDARY');
      if (role === 'PRIMARY') needsPrimary = false;

      const coreDs = CORE_DATASOURCES.find(ds => ds.uuid === item.id);
      if (coreDs) {
        return { ...coreDs, role: role as any };
      }

      return {
        uuid: item.id,
        name: item.id,
        type: item.id.startsWith('mamba_') ? 'ETL' : 'SQL',
        role: role as any,
        tables: [],
      };
    });

    // Remove datasources (but protect the primary if it's the only one)
    let updated = dataSources;
    removedUuids.forEach(uuid => {
      const dsToRemove = updated.find(ds => ds.uuid === uuid);
      // Don't allow removing if it would leave no primary
      if (dsToRemove?.role === 'PRIMARY' && updated.filter(ds => ds.role === 'PRIMARY').length <= 1) {
        return;
      }
      updated = updated.filter(ds => ds.uuid !== uuid);
    });

    // Combine existing with new additions
    onChange([...updated, ...toAdd]);
  };

  /**
   * Remove a datasource
   */
  const handleRemoveDatasource = (uuid: string) => {
    const dsToRemove = dataSources.find(ds => ds.uuid === uuid);

    // Don't allow removing if it would leave no primary
    if (dsToRemove?.role === 'PRIMARY' && dataSources.filter(ds => ds.role === 'PRIMARY').length <= 1) {
      return;
    }

    onChange(dataSources.filter(ds => ds.uuid !== uuid));
  };

  /**
   * Change datasource role
   */
  const handleChangeRole = (uuid: string, newRole: 'PRIMARY' | 'SECONDARY' | 'REFERENCE') => {
    // Ensure only one primary
    if (newRole === 'PRIMARY') {
      onChange(
        dataSources.map(ds => ({
          ...ds,
          role: ds.uuid === uuid ? 'PRIMARY' : ds.role === 'PRIMARY' ? 'SECONDARY' : ds.role,
        }))
      );
    } else {
      onChange(
        dataSources.map(ds =>
          ds.uuid === uuid ? { ...ds, role: newRole } : ds
        )
      );
    }
  };

  /**
   * Add a core datasource (person attributes or identifiers)
   */
  // const handleAddCoreDatasource = (coreDs: DataSourceInfo) => {
  //   if (isSelected(coreDs.uuid)) {
  //     return;
  //   }
  //
  //   onChange([...dataSources, { ...coreDs }]);
  // };

  // Prepare items for MultiSelect - combine all available tables and core datasources
  const allAvailable = useMemo(() => {
    const allTables = tables || [];
    const tableItems = allTables.map(t => ({ id: t, label: t }));
    const coreItems = CORE_DATASOURCES.map(ds => ({ id: ds.uuid, label: ds.name }));
    return [...tableItems, ...coreItems];
  }, [tables]);

  // Selected items for MultiSelect
  const selectedItems = useMemo(() => {
    return dataSources.map(ds => ({ id: ds.uuid, label: ds.name }));
  }, [dataSources]);

  // const availableCore = CORE_DATASOURCES.filter(ds => !isSelected(ds.uuid));

  return (
    <div className={styles.container}>
      <Stack gap={4}>
        {/* Header with info */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Information size={16} />
            <h4>Data Sources</h4>
          </div>
          <p className={styles.headerDescription}>
            Select multiple datasources to browse and add columns from. The backend will handle joining the data.
          </p>
        </div>

        {/* Data Sources MultiSelect */}
        <div className={styles.addSection}>
          <MultiSelect
            id="datasources-multiselect"
            titleText="Data Sources"
            label="Search and select datasources"
            placeholder="Search datasources..."
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

        {/* Selected Datasources List */}
        {dataSources.length > 0 && (
          <div className={styles.listSection}>
            <h5 className={styles.listTitle}>Selected Data Sources ({dataSources.length})</h5>

            <Stack gap={2}>
              {/* Primary Datasource */}
              {primaryDs && (
                <div className={styles.datasourceCard} data-role="primary">
                  <div className={styles.cardHeader}>
                    <div className={styles.cardInfo}>
                      <Tag type="green" size="sm">Primary</Tag>
                      <span className={styles.dsName}>{primaryDs.name}</span>
                    </div>
                    <Button
                      kind="ghost"
                      size="sm"
                      hasIconOnly
                      renderIcon={Close}
                      iconDescription="Remove"
                      onClick={() => handleRemoveDatasource(primaryDs.uuid)}
                      disabled={disabled || dataSources.length <= 1}
                    />
                  </div>
                  <p className={styles.cardDescription}>Main datasource for this report</p>
                </div>
              )}

              {/* Secondary Datasources */}
              {secondaryDs.map(ds => (
                <div key={ds.uuid} className={styles.datasourceCard} data-role="secondary">
                  <div className={styles.cardHeader}>
                    <div className={styles.cardInfo}>
                      <Tag type="blue" size="sm">Secondary</Tag>
                      <span className={styles.dsName}>{ds.name}</span>
                    </div>
                    <ButtonSet>
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => handleChangeRole(ds.uuid, 'PRIMARY')}
                        disabled={disabled}
                      >
                        Make Primary
                      </Button>
                      <Button
                        kind="ghost"
                        size="sm"
                        hasIconOnly
                        renderIcon={Close}
                        iconDescription="Remove"
                        onClick={() => handleRemoveDatasource(ds.uuid)}
                        disabled={disabled}
                      />
                    </ButtonSet>
                  </div>
                  <p className={styles.cardDescription}>Additional datasource for columns</p>
                </div>
              ))}

              {/* Reference Datasources */}
              {referenceDs.map(ds => (
                <div key={ds.uuid} className={styles.datasourceCard} data-role="reference">
                  <div className={styles.cardHeader}>
                    <div className={styles.cardInfo}>
                      <Tag type="purple" size="sm">Reference</Tag>
                      <span className={styles.dsName}>{ds.name}</span>
                    </div>
                    <ButtonSet>
                      <Button
                        kind="ghost"
                        size="sm"
                        onClick={() => handleChangeRole(ds.uuid, 'SECONDARY')}
                        disabled={disabled}
                      >
                        Make Secondary
                      </Button>
                      <Button
                        kind="ghost"
                        size="sm"
                        hasIconOnly
                        renderIcon={Close}
                        iconDescription="Remove"
                        onClick={() => handleRemoveDatasource(ds.uuid)}
                        disabled={disabled}
                      />
                    </ButtonSet>
                  </div>
                  <p className={styles.cardDescription}>Lookup/reference data</p>
                </div>
              ))}
            </Stack>
          </div>
        )}

        {/* Empty State */}
        {dataSources.length === 0 && (
          <div className={styles.emptyState}>
            <p>No datasources selected. Add datasources above to browse their columns.</p>
          </div>
        )}

        {/* Summary */}
        {dataSources.length > 0 && (
          <div className={styles.summary}>
            <span>{dataSources.length} datasource{dataSources.length !== 1 ? 's' : ''} selected</span>
            <span>Columns from all datasources will be joined by patient_id</span>
          </div>
        )}
      </Stack>
    </div>
  );
};

export default MultiDatasourceSelector;

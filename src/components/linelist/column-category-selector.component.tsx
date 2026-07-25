/**
 * Column Category Selector Component for Linelist Reports
 *
 * Displays selected columns organized into categories.
 * Selection is done in the Data Catalogue panel.
 *
 * Categories:
 * 1. Calculated Fields - Computed values like Age, BMI
 * 2. Person Attributes - Custom attributes (Telephone, Civil Status, etc.)
 * 3. Patient Identifiers - Identifiers (Clinic Number, EID Number, etc.)
 * 4. Demographics - Built-in demographic fields (name, gender, birthdate, etc.)
 * 5. Other - ETL table columns and other fields
 */

import React, { useMemo, useCallback } from 'react';
import {
  Stack,
  Button,
  Tag,
  Accordion,
  AccordionItem,
} from '@carbon/react';
import { TrashCan } from '@carbon/react/icons';
import type {
  LinelistColumnDraft,
} from '../../types/linelist-types';
import styles from './column-category-selector.scss';

/**
 * Category definitions for organizing columns
 */
const COLUMN_CATEGORIES = {
  calculated: {
    id: 'calculated',
    name: 'Calculated Fields',
    description: 'Fields calculated from other data (Age, BMI, etc.)',
    icon: '🧮',
  },
  attributes: {
    id: 'attributes',
    name: 'Person Attributes',
    description: 'Custom person attributes (Telephone, Civil Status, etc.)',
    icon: '🏷️',
  },
  identifiers: {
    id: 'identifiers',
    name: 'Patient Identifiers',
    description: 'Patient identification numbers (Clinic Number, EID Number, etc.)',
    icon: '🆔',
  },
  demographics: {
    id: 'demographics',
    name: 'Demographics',
    description: 'Built-in demographic fields (Name, Gender, Birth Date, etc.)',
    icon: '👤',
  },
  other: {
    id: 'other',
    name: 'Other Fields',
    description: 'ETL table columns and other fields',
    icon: '📊',
  },
} as const;

type ColumnCategory = keyof typeof COLUMN_CATEGORIES;

type Props = {
  columns: LinelistColumnDraft[];
  onChange: (columns: LinelistColumnDraft[]) => void;
  disabled?: boolean;
  error?: string;
};

export default function ColumnCategorySelector({ columns, onChange, disabled = false, error }: Props) {
  /**
   * Categorize a column based on its dataDefinitionType and config
   */
  const categorizeColumn = useCallback((col: LinelistColumnDraft): ColumnCategory => {
    if (col.dataDefinitionType === 'CALCULATION') {
      return 'calculated';
    }

    if (col.dataDefinitionType === 'IDENTIFIER') {
      return 'identifiers';
    }

    if (col.dataDefinitionType === 'PERSON_ATTRIBUTE') {
      // Check if it's a built-in demographic attribute (Sex, Birth Date)
      const isBuiltInDemographic = col.config.type === 'GENDER' || col.config.type === 'BIRTHDATE';
      if (isBuiltInDemographic) {
        return 'demographics';
      }
      return 'attributes';
    }

    if (col.dataDefinitionType === 'PERSON_NAME' || col.dataDefinitionType === 'PERSON_ADDRESS') {
      return 'demographics';
    }

    // Check if it's a known demographic field by name
    const colName = col.name.toLowerCase().replace(/[\s-]+/g, '_');
    const demographicFieldNames = ['full_name', 'given_name', 'family_name', 'sex', 'gender', 'birth_date', 'death_date', 'village', 'parish', 'city_village', 'address1', 'state_province', 'country'];
    if (demographicFieldNames.includes(colName)) {
      return 'demographics';
    }

    return 'other';
  }, []);

  /**
   * Group selected columns by category
   */
  const groupedColumns = useMemo(() => {
    const result: Record<ColumnCategory, LinelistColumnDraft[]> = {
      calculated: [],
      attributes: [],
      identifiers: [],
      demographics: [],
      other: [],
    };

    columns.forEach((col) => {
      const category = categorizeColumn(col);
      result[category].push(col);
    });

    return result;
  }, [columns, categorizeColumn]);

  /**
   * Remove a column
   */
  const removeColumn = useCallback((columnId: string) => {
    const updatedColumns = columns.filter((c) => c.id !== columnId);
    onChange(updatedColumns);
  }, [columns, onChange]);

  const totalColumns = columns.length;

  return (
    <div className={styles.container}>
      <Stack gap={4}>
        {/* Error message */}
        {error && <div className={styles.error}>{error}</div>}

        {/* Summary */}
        <div className={styles.summary}>
          <span className={styles.summaryText}>
            {totalColumns} column{totalColumns !== 1 ? 's' : ''} selected
          </span>
          {totalColumns > 0 && (
            <Button
              kind="ghost"
              size="sm"
              onClick={() => onChange([])}
              disabled={disabled}
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Empty state */}
        {totalColumns === 0 && (
          <div className={styles.emptyState}>
            <p>No columns selected. Use the Data Catalogue panel to add columns to your linelist report.</p>
          </div>
        )}

        {/* Column Categories */}
        {totalColumns > 0 && (
          <Accordion className={styles.accordion}>
            {Object.values(COLUMN_CATEGORIES).map((category) => {
              const categoryColumns = groupedColumns[category.id as ColumnCategory];
              const count = categoryColumns.length;

              if (count === 0) return null;

              return (
                <AccordionItem
                  key={category.id}
                  title={
                    <div className={styles.categoryHeader}>
                      <span className={styles.categoryIcon}>{category.icon}</span>
                      <span className={styles.categoryName}>{category.name}</span>
                      <Tag size="sm" type="cool-gray">{count}</Tag>
                    </div>
                  }
                  open={true}
                >
                  <div className={styles.categoryContent}>
                    <p className={styles.categoryDescription}>{category.description}</p>
                    <div className={styles.columnList}>
                      {categoryColumns.map((col) => (
                        <div key={col.id} className={styles.columnItem}>
                          <span className={styles.columnOrder}>{col.sortOrder + 1}.</span>
                          <span className={styles.columnName}>{col.name}</span>
                          <Tag size="sm" type="gray">{col.dataDefinitionType}</Tag>
                          <div className={styles.columnActions}>
                            <Button
                              kind="ghost"
                              size="sm"
                              hasIconOnly
                              renderIcon={TrashCan}
                              onClick={() => removeColumn(col.id)}
                              disabled={disabled}
                              iconDescription="Remove column"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </Stack>
    </div>
  );
}

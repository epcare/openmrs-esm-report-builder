/**
 * Transformation Pipeline Component for Linelist Columns
 *
 * This component allows users to define value transformations for columns.
 * Transformations are applied in sequence to column values.
 */

import React, { useState } from 'react';
import {
  Stack,
  Button,
  ButtonSet,
  TextInput,
  Toggle,
  Tag,
  DataTable,
  TableRow,
  TableBody,
  TableCell,
  Select,
  SelectItem,
} from '@carbon/react';
import { TrashCan, Add, ChevronUp, ChevronDown } from '@carbon/react/icons';
import type { LinelistColumnTransformation } from '../../types/linelist-types';
import styles from './transformation-pipeline.scss';

type TransformationType =
  | 'DATE_FORMAT'
  | 'AGE_ON_DATE'
  | 'CODED_TO_DISPLAY'
  | 'BOOLEAN_MAPPING'
  | 'REPLACE_NULL'
  | 'NUMERIC_ROUNDING'
  | 'CATEGORIZE_NUMERIC'
  | 'CONCATENATE_TEXT'
  | 'MASK_IDENTIFIER';

type Props = {
  transformations: LinelistColumnTransformation[];
  onChange: (transformations: LinelistColumnTransformation[]) => void;
  disabled?: boolean;
};

/**
 * Available transformation types with descriptions
 */
const TRANSFORMATION_TYPES: Array<{
  value: TransformationType;
  label: string;
  description: string;
  needsConfig: boolean;
}> = [
  {
    value: 'DATE_FORMAT',
    label: 'Date Format',
    description: 'Format date values (e.g., dd/MM/yyyy)',
    needsConfig: true,
  },
  {
    value: 'AGE_ON_DATE',
    label: 'Age on Date',
    description: 'Calculate age as of a specific date',
    needsConfig: true,
  },
  {
    value: 'CODED_TO_DISPLAY',
    label: 'Coded to Display',
    description: 'Convert coded values to display names',
    needsConfig: true,
  },
  {
    value: 'BOOLEAN_MAPPING',
    label: 'Boolean Mapping',
    description: 'Map true/false to custom strings',
    needsConfig: true,
  },
  {
    value: 'REPLACE_NULL',
    label: 'Replace Null',
    description: 'Replace null/empty values',
    needsConfig: true,
  },
  {
    value: 'NUMERIC_ROUNDING',
    label: 'Numeric Rounding',
    description: 'Round numeric values to precision',
    needsConfig: true,
  },
  {
    value: 'CATEGORIZE_NUMERIC',
    label: 'Categorize Numeric',
    description: 'Categorize numeric values into ranges',
    needsConfig: true,
  },
  {
    value: 'CONCATENATE_TEXT',
    label: 'Concatenate Text',
    description: 'Combine multiple field values',
    needsConfig: true,
  },
  {
    value: 'MASK_IDENTIFIER',
    label: 'Mask Identifier',
    description: 'Mask sensitive identifiers for privacy',
    needsConfig: true,
  },
];

/**
 * Transformation type colors for visual indication
 */
const TYPE_COLORS: Record<TransformationType, 'blue' | 'cyan' | 'gray' | 'green' | 'magenta' | 'purple' | 'red' | 'teal' | 'warm-gray' | 'cool-gray'> = {
  DATE_FORMAT: 'blue',
  AGE_ON_DATE: 'cyan',
  CODED_TO_DISPLAY: 'green',
  BOOLEAN_MAPPING: 'purple',
  REPLACE_NULL: 'gray',
  NUMERIC_ROUNDING: 'teal',
  CATEGORIZE_NUMERIC: 'magenta',
  CONCATENATE_TEXT: 'warm-gray',
  MASK_IDENTIFIER: 'red',
};

export default function TransformationPipeline({
  transformations,
  onChange,
  disabled = false,
}: Props) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  /**
   * Add a new transformation
   */
  const addTransformation = (type: TransformationType) => {
    const baseTransform = {
      type,
      enabled: true,
    };

    let newTransform: LinelistColumnTransformation;

    switch (type) {
      case 'DATE_FORMAT':
        newTransform = {
          ...baseTransform,
          type: 'DATE_FORMAT',
          format: 'dd/MM/yyyy',
        } as LinelistColumnTransformation;
        break;
      case 'AGE_ON_DATE':
        newTransform = {
          ...baseTransform,
          type: 'AGE_ON_DATE',
          years: true,
        } as LinelistColumnTransformation;
        break;
      case 'CODED_TO_DISPLAY':
        newTransform = {
          ...baseTransform,
          type: 'CODED_TO_DISPLAY',
          fallback: 'Unknown',
        } as LinelistColumnTransformation;
        break;
      case 'BOOLEAN_MAPPING':
        newTransform = {
          ...baseTransform,
          type: 'BOOLEAN_MAPPING',
          trueValue: 'Yes',
          falseValue: 'No',
        } as LinelistColumnTransformation;
        break;
      case 'REPLACE_NULL':
        newTransform = {
          ...baseTransform,
          type: 'REPLACE_NULL',
          replacementValue: '-',
        } as LinelistColumnTransformation;
        break;
      case 'NUMERIC_ROUNDING':
        newTransform = {
          ...baseTransform,
          type: 'NUMERIC_ROUNDING',
          decimalPlaces: 2,
        } as LinelistColumnTransformation;
        break;
      case 'CATEGORIZE_NUMERIC':
        newTransform = {
          ...baseTransform,
          type: 'CATEGORIZE_NUMERIC',
          ranges: [],
        } as LinelistColumnTransformation;
        break;
      case 'CONCATENATE_TEXT':
        newTransform = {
          ...baseTransform,
          type: 'CONCATENATE_TEXT',
          fields: [],
          separator: ', ',
        } as LinelistColumnTransformation;
        break;
      case 'MASK_IDENTIFIER':
        newTransform = {
          ...baseTransform,
          type: 'MASK_IDENTIFIER',
          maskChar: '*',
          visibleStart: 0,
          visibleEnd: 4,
        } as LinelistColumnTransformation;
        break;
      default:
        return;
    }

    onChange([...transformations, newTransform]);
  };

  /**
   * Remove a transformation
   */
  const removeTransformation = (index: number) => {
    onChange(transformations.filter((_, idx) => idx !== index));
  };

  /**
   * Update a transformation
   */
  const updateTransformation = (
    index: number,
    updates: Partial<LinelistColumnTransformation>
  ) => {
    const newTransformations = transformations.map((transform, idx) => {
      if (idx === index) {
        return { ...transform, ...updates } as LinelistColumnTransformation;
      }
      return transform;
    });
    onChange(newTransformations);
  };

  /**
   * Move transformation up or down in the pipeline
   */
  const moveTransformation = (index: number, direction: 'up' | 'down') => {
    const newTransformations = [...transformations];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newTransformations.length) return;

    [newTransformations[index], newTransformations[targetIndex]] = [
      newTransformations[targetIndex],
      newTransformations[index],
    ];

    onChange(newTransformations);
  };

  /**
   * Toggle row expansion for transformation details
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
   * Get config fields based on transformation type
   */
  const renderConfigFields = (
    transformation: LinelistColumnTransformation,
    index: number
  ) => {
    const updateField = (field: string, value: any) => {
      updateTransformation(index, { [field]: value });
    };

    switch (transformation.type) {
      case 'DATE_FORMAT':
        return (
          <>
            <TextInput
              id={`transform-format-${index}`}
              labelText="Output Format"
              placeholder="e.g., dd/MM/yyyy, yyyy-MM-dd"
              value={(transformation as any).format || ''}
              onChange={(e) => updateField('format', (e.target as HTMLInputElement).value)}
              disabled={disabled}
              helperText="Java SimpleDateFormat pattern or custom format"
            />
            <TextInput
              id={`transform-input-format-${index}`}
              labelText="Input Format (optional)"
              placeholder="e.g., yyyy-MM-dd"
              value={(transformation as any).inputFormat || ''}
              onChange={(e) =>
                updateField('inputFormat', (e.target as HTMLInputElement).value)
              }
              disabled={disabled}
              helperText="Required if input needs parsing"
            />
          </>
        );

      case 'AGE_ON_DATE':
        return (
          <>
            <TextInput
              id={`transform-date-field-${index}`}
              labelText="Date Field (optional)"
              placeholder="e.g., endDate, encounter_date"
              value={(transformation as any).dateField || ''}
              onChange={(e) => updateField('dateField', (e.target as HTMLInputElement).value)}
              disabled={disabled}
              helperText="Leave empty to use report end date"
            />
            <Toggle
              id={`transform-years-${index}`}
              labelText="Include Years"
              toggled={(transformation as any).years !== false}
              onToggle={(checked) => updateField('years', checked)}
              disabled={disabled}
            />
            <Toggle
              id={`transform-months-${index}`}
              labelText="Include Months"
              toggled={(transformation as any).months || false}
              onToggle={(checked) => updateField('months', checked)}
              disabled={disabled}
            />
          </>
        );

      case 'CODED_TO_DISPLAY':
        return (
          <TextInput
            id={`transform-fallback-${index}`}
            labelText="Fallback Value"
            placeholder="e.g., Unknown, N/A"
            value={(transformation as any).fallback || ''}
            onChange={(e) => updateField('fallback', (e.target as HTMLInputElement).value)}
            disabled={disabled}
            helperText="Value to use if coded value lookup fails"
          />
        );

      case 'BOOLEAN_MAPPING':
        return (
          <>
            <TextInput
              id={`transform-true-${index}`}
              labelText="True Value"
              placeholder="e.g., Yes, True, 1"
              value={(transformation as any).trueValue || ''}
              onChange={(e) => updateField('trueValue', (e.target as HTMLInputElement).value)}
              disabled={disabled}
            />
            <TextInput
              id={`transform-false-${index}`}
              labelText="False Value"
              placeholder="e.g., No, False, 0"
              value={(transformation as any).falseValue || ''}
              onChange={(e) => updateField('falseValue', (e.target as HTMLInputElement).value)}
              disabled={disabled}
            />
            <TextInput
              id={`transform-null-${index}`}
              labelText="Null Value (optional)"
              placeholder="e.g., Unknown"
              value={(transformation as any).nullValue || ''}
              onChange={(e) => updateField('nullValue', (e.target as HTMLInputElement).value)}
              disabled={disabled}
            />
          </>
        );

      case 'REPLACE_NULL':
        return (
          <TextInput
            id={`transform-replacement-${index}`}
            labelText="Replacement Value"
            placeholder="e.g., -, N/A, 0"
            value={(transformation as any).replacementValue || ''}
            onChange={(e) =>
              updateField('replacementValue', (e.target as HTMLInputElement).value)
            }
            disabled={disabled}
            helperText="Value to use when original value is null or empty"
          />
        );

      case 'NUMERIC_ROUNDING':
        return (
          <>
            <TextInput
              id={`transform-decimals-${index}`}
              labelText="Decimal Places"
              type="number"
              min={0}
              max={10}
              value={String((transformation as any).decimalPlaces || 2)}
              onChange={(e) =>
                updateField('decimalPlaces', Number((e.target as HTMLInputElement).value))
              }
              disabled={disabled}
            />
            <Select
              id={`transform-rounding-${index}`}
              labelText="Rounding Mode"
              value={(transformation as any).roundingMode || 'HALF_UP'}
              onChange={(e) =>
                updateField('roundingMode', (e.target as HTMLSelectElement).value)
              }
              disabled={disabled}
            >
              <SelectItem value="UP" text="Always round up" />
              <SelectItem value="DOWN" text="Always round down" />
              <SelectItem value="HALF_UP" text="Round half up (standard)" />
              <SelectItem value="HALF_DOWN" text="Round half down" />
            </Select>
          </>
        );

      case 'CATEGORIZE_NUMERIC':
        return (
          <div>
            <p className={styles['helperText']}>
              Define numeric ranges and their labels. Values will be categorized into matching ranges.
            </p>
            {/* Simplified UI for ranges - in production, this would be a more sophisticated range editor */}
            <TextInput
              id={`transform-default-${index}`}
              labelText="Default Label"
              placeholder="e.g., Other, Not categorized"
              value={(transformation as any).defaultValue || ''}
              onChange={(e) => updateField('defaultValue', (e.target as HTMLInputElement).value)}
              disabled={disabled}
              helperText="Label for values not in any range"
            />
            <p className={styles['helperText']}>
              Note: Range editing UI would be added here for production use
            </p>
          </div>
        );

      case 'CONCATENATE_TEXT':
        return (
          <>
            <TextInput
              id={`transform-fields-${index}`}
              labelText="Fields to Concatenate"
              placeholder="e.g., given_name, family_name"
              value={(transformation as any).fields?.join(', ') || ''}
              onChange={(e) =>
                updateField(
                  'fields',
                  (e.target as HTMLInputElement).value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              disabled={disabled}
              helperText="Comma-separated list of field names"
            />
            <TextInput
              id={`transform-separator-${index}`}
              labelText="Separator"
              placeholder="e.g., ', ', ' - ', '/'"
              value={(transformation as any).separator || ', '}
              onChange={(e) => updateField('separator', (e.target as HTMLInputElement).value)}
              disabled={disabled}
            />
            <Toggle
              id={`transform-nulls-${index}`}
              labelText="Include Null Values"
              toggled={(transformation as any).includeNulls || false}
              onToggle={(checked) => updateField('includeNulls', checked)}
              disabled={disabled}
            />
          </>
        );

      case 'MASK_IDENTIFIER':
        return (
          <>
            <TextInput
              id={`transform-mask-char-${index}`}
              labelText="Mask Character"
              placeholder="e.g., *, •, x"
              value={(transformation as any).maskChar || '*'}
              onChange={(e) => updateField('maskChar', (e.target as HTMLInputElement).value)}
              disabled={disabled}
            />
            <TextInput
              id={`transform-visible-start-${index}`}
              labelText="Visible Characters at Start"
              type="number"
              min={0}
              value={String((transformation as any).visibleStart || 0)}
              onChange={(e) =>
                updateField('visibleStart', Number((e.target as HTMLInputElement).value))
              }
              disabled={disabled}
            />
            <TextInput
              id={`transform-visible-end-${index}`}
              labelText="Visible Characters at End"
              type="number"
              min={0}
              value={String((transformation as any).visibleEnd || 4)}
              onChange={(e) =>
                updateField('visibleEnd', Number((e.target as HTMLInputElement).value))
              }
              disabled={disabled}
              helperText="Last few characters remain visible (e.g., last 4 digits of ID)"
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles['container']}>
      <Stack gap={4}>
        <div className={styles['header']}>
          <h4 className={styles['sectionTitle']}>Value Transformations</h4>
          <p className={styles['description']}>
            Transformations are applied in sequence to column values. Drag to reorder.
          </p>
        </div>

        {/* Add transformation buttons */}
        <div className={styles['quickAdd']}>
          <p className={styles['helperText']}>Add a transformation:</p>
          <div className={styles['transformButtons']}>
            {TRANSFORMATION_TYPES.map((type) => (
              <Button
                key={type.value}
                kind="ghost"
                size="sm"
                renderIcon={Add}
                onClick={() => addTransformation(type.value)}
                disabled={disabled}
                title={type.description}
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Transformations Table */}
        {transformations.length > 0 && (
          <div className={styles['transformationsTable']}>
            <DataTable
              rows={transformations.map((transform, idx) => ({ id: String(idx) }))}
              headers={[]}
            >
              {({ rows }) => (
                <TableBody>
                  {rows.map((row, idx) => {
                    const transform = transformations[idx];
                    const isExpanded = expandedRows.has(idx);
                    const typeInfo = TRANSFORMATION_TYPES.find(
                      (t) => t.value === transform.type
                    );

                    return (
                      <React.Fragment key={idx}>
                        <TableRow>
                          {/* Order number */}
                          <TableCell className={styles['orderCell']}>{idx + 1}</TableCell>

                          {/* Transformation type */}
                          <TableCell>
                            <Tag type={TYPE_COLORS[transform.type as TransformationType]}>
                              {typeInfo?.label || transform.type}
                            </Tag>
                          </TableCell>

                          {/* Enabled status */}
                          <TableCell>
                            {transform.enabled !== false && (
                              <Tag type="green" size="sm">
                                Active
                              </Tag>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className={styles['actionsCell']}>
                            <ButtonSet>
                              <Button
                                hasIconOnly
                                kind="ghost"
                                size="sm"
                                renderIcon={ChevronUp}
                                onClick={() => moveTransformation(idx, 'up')}
                                disabled={disabled || idx === 0}
                                iconDescription="Move up"
                              />
                              <Button
                                hasIconOnly
                                kind="ghost"
                                size="sm"
                                renderIcon={ChevronDown}
                                onClick={() => moveTransformation(idx, 'down')}
                                disabled={disabled || idx === transformations.length - 1}
                                iconDescription="Move down"
                              />
                              <Button
                                hasIconOnly
                                kind="ghost"
                                size="sm"
                                renderIcon={TrashCan}
                                onClick={() => removeTransformation(idx)}
                                disabled={disabled}
                                iconDescription="Remove transformation"
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
                            <TableCell colSpan={4}>
                              <div className={styles['expandedContent']}>
                                <Stack gap={3}>
                                  {/* Helper text */}
                                  {typeInfo?.description && (
                                    <p className={styles['helperText']}>{typeInfo.description}</p>
                                  )}

                                  {/* Enabled toggle */}
                                  <Toggle
                                    id={`transform-enabled-${idx}`}
                                    labelText="Enabled"
                                    toggled={transform.enabled !== false}
                                    onToggle={(checked) => updateTransformation(idx, { enabled: checked })}
                                    disabled={disabled}
                                  />

                                  {/* Type-specific config */}
                                  {renderConfigFields(transform, idx)}
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
        )}

        {/* Empty state */}
        {transformations.length === 0 && (
          <div className={styles['emptyState']}>
            <p>No transformations defined. Add transformations to modify column values.</p>
            <p className={styles['helperText']}>
              Examples: Format dates, calculate age, map boolean values, mask identifiers
            </p>
          </div>
        )}
      </Stack>
    </div>
  );
}

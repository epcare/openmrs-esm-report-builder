/**
 * Parameter Editor Component for Linelist Reports
 *
 * This component allows users to define runtime parameters for their linelist reports.
 * Parameters allow users to filter or configure report output at runtime.
 *
 * Examples:
 * - Start Date / End Date (for time-based filtering)
 * - Location (for facility-based filtering)
 * - Program (for program-specific reports)
 */

import React, { useState } from 'react';
import {
  Stack,
  TextInput,
  Select,
  SelectItem,
  Button,
  ButtonSet,
  Toggle,
  Tag,
  DataTable,
  TableRow,
  TableBody,
  TableCell,
} from '@carbon/react';
import { TrashCan, Add, ChevronUp, ChevronDown } from '@carbon/react/icons';
import type {
  LinelistParameterDraft,
  LinelistParameterType,
} from '../../types/linelist-types';
import styles from './parameter-editor.scss';

type Props = {
  parameters: LinelistParameterDraft[];
  onChange: (parameters: LinelistParameterDraft[]) => void;
  disabled?: boolean;
};

/**
 * Available parameter types with descriptions
 */
const PARAMETER_TYPES: Array<{
  value: LinelistParameterType;
  label: string;
  description: string;
  needsConfig: boolean;
}> = [
  {
    value: 'DATE',
    label: 'Date',
    description: 'Date value (e.g., for report start/end dates)',
    needsConfig: false,
  },
  {
    value: 'DATETIME',
    label: 'Date & Time',
    description: 'Date and time value with time component',
    needsConfig: false,
  },
  {
    value: 'LOCATION',
    label: 'Location',
    description: 'Facility or location picker',
    needsConfig: true,
  },
  {
    value: 'PROGRAM',
    label: 'Program',
    description: 'Program selection (e.g., HIV, TB)',
    needsConfig: true,
  },
  {
    value: 'PROVIDER',
    label: 'Provider',
    description: 'Healthcare provider selection',
    needsConfig: true,
  },
  {
    value: 'CONCEPT',
    label: 'Concept',
    description: 'OpenMRS concept/value selection',
    needsConfig: true,
  },
  {
    value: 'CODED_VALUE',
    label: 'Coded Value',
    description: 'Coded value from a defined answer list',
    needsConfig: true,
  },
  {
    value: 'BOOLEAN',
    label: 'Boolean',
    description: 'Yes/No toggle',
    needsConfig: false,
  },
  {
    value: 'NUMBER',
    label: 'Number',
    description: 'Numeric value',
    needsConfig: false,
  },
  {
    value: 'TEXT',
    label: 'Text',
    description: 'Free text input',
    needsConfig: false,
  },
];

/**
 * Parameter type colors for visual indication
 */
const TYPE_COLORS: Record<LinelistParameterType, 'blue' | 'cyan' | 'gray' | 'green' | 'magenta' | 'purple' | 'red' | 'teal' | 'warm-gray' | 'cool-gray'> = {
  DATE: 'blue',
  DATETIME: 'cyan',
  LOCATION: 'green',
  PROGRAM: 'purple',
  PROVIDER: 'magenta',
  CONCEPT: 'red',
  CODED_VALUE: 'warm-gray',
  BOOLEAN: 'gray',
  NUMBER: 'teal',
  TEXT: 'cool-gray',
};

export default function ParameterEditor({
  parameters,
  onChange,
  disabled = false,
}: Props) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  /**
   * Add a new parameter
   */
  const addParameter = () => {
    const newParameter: LinelistParameterDraft = {
      id: `param-${Date.now()}`,
      name: '',
      label: '',
      type: 'TEXT',
      required: false,
      defaultValue: '',
      displayOrder: parameters.length,
      config: {},
    };
    onChange([...parameters, newParameter]);
  };

  /**
   * Add a default date range parameter
   */
  const addDateRangeParameter = (type: 'startDate' | 'endDate') => {
    const newParameter: LinelistParameterDraft = {
      id: `param-${Date.now()}`,
      name: type,
      label: type === 'startDate' ? 'Start Date' : 'End Date',
      type: 'DATE',
      required: true,
      defaultValue: '',
      displayOrder: parameters.length,
      config: {},
    };
    onChange([...parameters, newParameter]);
  };

  /**
   * Remove a parameter
   */
  const removeParameter = (parameterId: string) => {
    const updated = parameters
      .filter((p) => p.id !== parameterId)
      .map((p, idx) => ({ ...p, displayOrder: idx }));
    onChange(updated);
  };

  /**
   * Update a parameter
   */
  const updateParameter = (
    parameterId: string,
    updates: Partial<LinelistParameterDraft>
  ) => {
    onChange(
      parameters.map((p) =>
        p.id === parameterId
          ? {
              ...p,
              ...updates,
            }
          : p
      )
    );
  };

  /**
   * Move parameter up or down in the list
   */
  const moveParameter = (index: number, direction: 'up' | 'down') => {
    const newParameters = [...parameters];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newParameters.length) return;

    [newParameters[index], newParameters[targetIndex]] = [
      newParameters[targetIndex],
      newParameters[index],
    ];

    // Update display orders
    newParameters.forEach((param, idx) => {
      param.displayOrder = idx;
    });

    onChange(newParameters);
  };

  /**
   * Toggle row expansion for parameter details
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
   * Get config fields based on parameter type
   */
  const renderConfigFields = (parameter: LinelistParameterDraft) => {
    switch (parameter.type) {
      case 'DATE':
      case 'DATETIME':
        return (
          <Toggle
            id={`param-include-time-${parameter.id}`}
            labelText="Include time component"
            toggled={parameter.config?.includeTime || false}
            onToggle={(checked) =>
              updateParameter(parameter.id, {
                config: { ...parameter.config, includeTime: checked },
              })
            }
            disabled={disabled}
          />
        );

      case 'LOCATION':
        return (
          <TextInput
            id={`param-locations-${parameter.id}`}
            labelText="Allowed Location UUIDs (comma-separated)"
            placeholder="e.g., uuid1,uuid2,uuid3"
            value={parameter.config?.locationUuids?.join(',') || ''}
            onChange={(e) =>
              updateParameter(parameter.id, {
                config: {
                  ...parameter.config,
                  locationUuids: (e.target as HTMLInputElement).value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              })
            }
            disabled={disabled}
            helperText="Leave empty for all locations"
          />
        );

      case 'PROGRAM':
      case 'PROVIDER':
      case 'CONCEPT':
      case 'CODED_VALUE':
        return (
          <TextInput
            id={`param-source-${parameter.id}`}
            labelText="Source UUID (for data source)"
            placeholder="e.g., program-uuid, concept-uuid"
            value={parameter.config?.sourceUuid || ''}
            onChange={(e) =>
              updateParameter(parameter.id, {
                config: { ...parameter.config, sourceUuid: (e.target as HTMLInputElement).value },
              })
            }
            disabled={disabled}
            helperText="The UUID of the data source for this parameter type"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles['container']}>
      <Stack gap={4}>
        {/* Quick add buttons */}
        <div className={styles['quickAdd']}>
          <h4 className={styles['sectionTitle']}>Quick Add Common Parameters</h4>
          <ButtonSet>
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Add}
              onClick={() => addDateRangeParameter('startDate')}
              disabled={disabled}
            >
              Start Date
            </Button>
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Add}
              onClick={() => addDateRangeParameter('endDate')}
              disabled={disabled}
            >
              End Date
            </Button>
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Add}
              onClick={() => {
                const newParam: LinelistParameterDraft = {
                  id: `param-${Date.now()}`,
                  name: 'location',
                  label: 'Location',
                  type: 'LOCATION',
                  required: false,
                  defaultValue: '',
                  displayOrder: parameters.length,
                  config: {},
                };
                onChange([...parameters, newParam]);
              }}
              disabled={disabled}
            >
              Location
            </Button>
          </ButtonSet>
        </div>

        {/* Custom Parameter Button */}
        <Button kind="secondary" renderIcon={Add} onClick={addParameter} disabled={disabled}>
          Add Custom Parameter
        </Button>

        {/* Parameters Table */}
        {parameters.length > 0 && (
          <div className={styles['parametersTable']}>
            <h4 className={styles['sectionTitle']}>Parameters ({parameters.length})</h4>

            <DataTable
              rows={parameters.map((param, idx) => ({ id: idx, ...param }))}
              headers={[]}
            >
              {({ rows }) => (
                <TableBody>
                  {rows.map((row, idx) => {
                    const param = parameters[idx];
                    const isExpanded = expandedRows.has(idx);
                    const typeInfo = PARAMETER_TYPES.find((t) => t.value === param.type);

                    return (
                      <React.Fragment key={param.id}>
                        <TableRow>
                          {/* Order number */}
                          <TableCell className={styles['orderCell']}>{idx + 1}</TableCell>

                          {/* Parameter name */}
                          <TableCell>
                            <TextInput
                              id={`param-name-${param.id}`}
                              labelText=""
                              hideLabel
                              placeholder="parameter_name"
                              value={param.name}
                              onChange={(e) =>
                                updateParameter(param.id, {
                                  name: (e.target as HTMLInputElement).value,
                                })
                              }
                              disabled={disabled}
                            />
                          </TableCell>

                          {/* Parameter label */}
                          <TableCell>
                            <TextInput
                              id={`param-label-${param.id}`}
                              labelText=""
                              hideLabel
                              placeholder="Display Label"
                              value={param.label}
                              onChange={(e) =>
                                updateParameter(param.id, {
                                  label: (e.target as HTMLInputElement).value,
                                })
                              }
                              disabled={disabled}
                            />
                          </TableCell>

                          {/* Parameter type */}
                          <TableCell>
                            <Tag type={TYPE_COLORS[param.type]}>
                              {typeInfo?.label || param.type}
                            </Tag>
                          </TableCell>

                          {/* Required badge */}
                          <TableCell>
                            {param.required && <Tag type="red">Required</Tag>}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className={styles['actionsCell']}>
                            <ButtonSet>
                              <Button
                                hasIconOnly
                                kind="ghost"
                                size="sm"
                                renderIcon={ChevronUp}
                                onClick={() => moveParameter(idx, 'up')}
                                disabled={disabled || idx === 0}
                                iconDescription="Move up"
                              />
                              <Button
                                hasIconOnly
                                kind="ghost"
                                size="sm"
                                renderIcon={ChevronDown}
                                onClick={() => moveParameter(idx, 'down')}
                                disabled={disabled || idx === parameters.length - 1}
                                iconDescription="Move down"
                              />
                              <Button
                                hasIconOnly
                                kind="ghost"
                                size="sm"
                                renderIcon={TrashCan}
                                onClick={() => removeParameter(param.id)}
                                disabled={disabled}
                                iconDescription="Remove parameter"
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
                            <TableCell colSpan={6}>
                              <div className={styles['expandedContent']}>
                                <Stack gap={3}>
                                  {/* Parameter type selector */}
                                  <Select
                                    id={`param-type-${param.id}`}
                                    labelText="Parameter Type"
                                    value={param.type}
                                    onChange={(e) =>
                                      updateParameter(param.id, {
                                        type: (e.target as HTMLSelectElement).value as LinelistParameterType,
                                        config: {}, // Reset config when type changes
                                      })
                                    }
                                    disabled={disabled}
                                  >
                                    {PARAMETER_TYPES.map((type) => (
                                      <SelectItem
                                        key={type.value}
                                        value={type.value}
                                        text={type.label}
                                        title={type.description}
                                      />
                                    ))}
                                  </Select>

                                  {/* Helper text */}
                                  {typeInfo?.description && (
                                    <p className={styles['helperText']}>{typeInfo.description}</p>
                                  )}

                                  {/* Required toggle */}
                                  <Toggle
                                    id={`param-required-${param.id}`}
                                    labelText="Required (user must provide value)"
                                    toggled={param.required}
                                    onToggle={(checked) =>
                                      updateParameter(param.id, { required: checked })
                                    }
                                    disabled={disabled}
                                  />

                                  {/* Default value */}
                                  <TextInput
                                    id={`param-default-${param.id}`}
                                    labelText="Default Value (optional)"
                                    placeholder="e.g., 2024-01-01, current_location"
                                    value={param.defaultValue || ''}
                                    onChange={(e) =>
                                      updateParameter(param.id, {
                                        defaultValue: (e.target as HTMLInputElement).value,
                                      })
                                    }
                                    disabled={disabled}
                                    helperText="This value will be used if user doesn't provide one"
                                  />

                                  {/* Display order */}
                                  <TextInput
                                    id={`param-order-${param.id}`}
                                    labelText="Display Order"
                                    type="number"
                                    value={String(param.displayOrder)}
                                    onChange={(e) =>
                                      updateParameter(param.id, {
                                        displayOrder: Number((e.target as HTMLInputElement).value),
                                      })
                                    }
                                    disabled={disabled}
                                    helperText="Order in which parameters appear to users"
                                  />

                                  {/* Type-specific config */}
                                  {renderConfigFields(param)}
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
        {parameters.length === 0 && (
          <div className={styles['emptyState']}>
            <p>No parameters defined. Add parameters to allow users to customize report output at runtime.</p>
            <p className={styles['helperText']}>
              Common parameters: Start Date, End Date, Location, Program
            </p>
          </div>
        )}
      </Stack>
    </div>
  );
}

/**
 * Field Mapping Step Component
 * Step 4 of the ETL Monitor Builder
 *
 * Map detected fields to display fields with type configuration and formatting
 */

import React, { useState } from 'react';
import {
  TextInput,
  Select,
  SelectItem,
  Button,
  Stack,
  InlineNotification,
  FormGroup,
  Toggle,
  Tag,
  Modal,
  NumberInput,
  TextArea,
} from '@carbon/react';
import { Add, TrashCan as DeleteIcon, ArrowUp, ArrowDown, Edit as EditIcon } from '@carbon/icons-react';
import { useBuilderContext, useUpdateBuilderState } from '../etl-monitor-builder-context';
import { validateFieldsStep } from '../builder-state-machine';
import type {
  BuilderFieldConfig,
  SemanticDataType,
  StatusTone,
  BuilderStatusMapping,
  DetectedField,
} from '../../../../types/etl-monitor/etl-monitor-builder.types';
import type { MonitorComponentType } from '../../../../types/etl-monitor/etl-monitor-v2.types';
import styles from './fields-step.scss';

/**
 * Semantic data type options with descriptions
 */
const SEMANTIC_TYPES: Array<{ value: SemanticDataType; label: string; description: string }> = [
  { value: 'TEXT', label: 'Text', description: 'Plain text content' },
  { value: 'STRING', label: 'String', description: 'Short text string' },
  { value: 'NUMBER', label: 'Number', description: 'Numeric value' },
  { value: 'INTEGER', label: 'Integer', description: 'Whole number' },
  { value: 'DECIMAL', label: 'Decimal', description: 'Decimal number' },
  { value: 'BOOLEAN', label: 'Boolean', description: 'True/false value' },
  { value: 'STATUS', label: 'Status', description: 'Status indicator with tone mapping' },
  { value: 'PERCENTAGE', label: 'Percentage', description: 'Percentage value (0-100)' },
  { value: 'TIMESTAMP', label: 'Timestamp', description: 'Unix timestamp in milliseconds' },
  { value: 'DURATION', label: 'Duration', description: 'Duration in seconds or milliseconds' },
  { value: 'DATE', label: 'Date', description: 'Date value' },
  { value: 'TIME', label: 'Time', description: 'Time value' },
];

/**
 * Status tone options
 */
const STATUS_TONES: Array<{ value: StatusTone; label: string; color: string }> = [
  { value: 'success', label: 'Success', color: '#198038' },
  { value: 'critical', label: 'Critical', color: '#da1e28' },
  { value: 'warning', label: 'Warning', color: '#f1c21b' },
  { value: 'info', label: 'Info', color: '#0f62fe' },
  { value: 'neutral', label: 'Neutral', color: '#6f6f6f' },
];

/**
 * Get component-specific required field types
 */
function getRequiredFieldTypes(componentType?: MonitorComponentType): SemanticDataType[] {
  switch (componentType) {
    case 'STATUS_CARD':
      return ['STATUS'];
    case 'PROGRESS':
      return ['PERCENTAGE'];
    default:
      return [];
  }
}

/**
 * Get component-specific required field warnings
 */
function getFieldRequirements(componentType?: MonitorComponentType): string[] {
  switch (componentType) {
    case 'STATUS_CARD':
      return ['Requires at least one STATUS field', 'Requires a primary field'];
    case 'PROGRESS':
      return ['Requires a PERCENTAGE field'];
    case 'SUMMARY_CARD':
    case 'METRICS_GRID':
      return ['Requires at least one field'];
    default:
      return ['Requires at least one field'];
  }
}

/**
 * Status mapping configuration modal
 */
interface StatusMappingModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (mappings: BuilderStatusMapping[]) => void;
  currentMappings: BuilderStatusMapping[];
  detectedValues: string[];
}

function StatusMappingModal({
  open,
  onClose,
  onSave,
  currentMappings,
  detectedValues,
}: StatusMappingModalProps) {
  const [mappings, setMappings] = useState<BuilderStatusMapping[]>(
    currentMappings.length > 0
      ? currentMappings
      : detectedValues.map((value) => ({
          rawValue: value,
          label: value,
          tone: 'neutral' as StatusTone,
        }))
  );

  const handleUpdateMapping = (index: number, updates: Partial<BuilderStatusMapping>) => {
    setMappings((prev) => prev.map((m, i) => (i === index ? { ...m, ...updates } : m)));
  };

  const handleSave = () => {
    onSave(mappings);
    onClose();
  };

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading="Configure Status Mappings"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onRequestSubmit={handleSave}
      size="md"
    >
      <div className={styles['status-mapping-modal']}>
        <p className={styles['status-mapping-modal__description']}>
          Map each detected status value to a display label and tone.
        </p>

        <Stack gap={4}>
          {mappings.map((mapping, index) => (
            <div key={index} className={styles['status-mapping-row']}>
              <div className={styles['status-mapping-row__raw']}>
                <label>Raw Value</label>
                <TextInput
                  id={`raw-${index}`}
                  value={mapping.rawValue}
                  onChange={(e) => handleUpdateMapping(index, { rawValue: e.target.value })}
                  disabled
                  labelText=""
                />
              </div>

              <div className={styles['status-mapping-row__label']}>
                <label>Display Label</label>
                <TextInput
                  id={`label-${index}`}
                  value={mapping.label}
                  onChange={(e) => handleUpdateMapping(index, { label: e.target.value })}
                  placeholder="Enter display label"
                  labelText=""
                />
              </div>

              <div className={styles['status-mapping-row__tone']}>
                <label>Tone</label>
                <Select
                  id={`tone-${index}`}
                  value={mapping.tone}
                  onChange={(e) => handleUpdateMapping(index, { tone: e.target.value as StatusTone })}
                >
                  {STATUS_TONES.map((tone) => (
                    <SelectItem key={tone.value} value={tone.value} text={tone.label} />
                  ))}
                </Select>
              </div>
            </div>
          ))}
        </Stack>
      </div>
    </Modal>
  );
}

/**
 * Field configuration modal
 */
interface FieldConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (field: BuilderFieldConfig) => void;
  field: BuilderFieldConfig | null;
  detectedFields: DetectedField[];
  componentType?: MonitorComponentType;
}

function FieldConfigModal({ open, onClose, onSave, field, detectedFields }: FieldConfigModalProps) {
  const isEditing = !!field;

  const [config, setConfig] = useState<BuilderFieldConfig>(
    field || {
      key: '',
      label: '',
      path: '',
      type: 'TEXT',
      primary: false,
      hidden: false,
      order: 0,
    }
  );

  // Reset form when field prop changes or modal opens/closes
  React.useEffect(() => {
    if (field) {
      setConfig(field);
    } else {
      setConfig({
        key: '',
        label: '',
        path: '',
        type: 'TEXT',
        primary: false,
        hidden: false,
        order: 0,
      });
    }
  }, [field, open]);

  const handleSave = () => {
    if (!config.key || !config.label || !config.path) {
      return; // Validation error
    }
    onSave(config);
    onClose();
  };

  const handleClose = () => {
    // Reset form when closing
    setConfig(field || {
      key: '',
      label: '',
      path: '',
      type: 'TEXT',
      primary: false,
      hidden: false,
      order: 0,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onRequestClose={handleClose}
      modalHeading={isEditing ? 'Edit Field' : 'Add Field'}
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onRequestSubmit={handleSave}
      size="md"
    >
      <div className={styles['field-config-modal']}>
        <FormGroup legendText="">
          <Stack gap={4}>
            {/* Field Key */}
            <TextInput
              id="field-key"
              labelText="Key *"
              value={config.key}
              onChange={(e) => setConfig({ ...config, key: e.target.value })}
              placeholder="Unique identifier (e.g., status)"
              disabled={isEditing}
              helperText="Unique key for this field"
            />

            {/* Field Label */}
            <TextInput
              id="field-label"
              labelText="Label *"
              value={config.label}
              onChange={(e) => setConfig({ ...config, label: e.target.value })}
              placeholder="Display label (e.g., Status)"
              helperText="Human-readable label"
            />

            {/* JSON Path */}
            <Select
              id="field-path"
              labelText="JSON Path *"
              value={config.path}
              onChange={(e) => setConfig({ ...config, path: e.target.value })}
              helperText="Path to extract value from response"
            >
              <SelectItem value="" text="Select a field..." />
              {detectedFields.map((field) => (
                <SelectItem key={field.path} value={field.path} text={`${field.name} (${field.path})`} />
              ))}
            </Select>

            {/* Semantic Type */}
            <Select
              id="field-type"
              labelText="Type *"
              value={config.type}
              onChange={(e) => setConfig({ ...config, type: e.target.value as SemanticDataType })}
              helperText="How should this value be interpreted and formatted?"
            >
              {SEMANTIC_TYPES.map((type) => (
                <SelectItem
                  key={type.value}
                  value={type.value}
                  text={type.label}
                />
              ))}
            </Select>

            {/* Description */}
            <TextArea
              id="field-description"
              labelText="Description"
              rows={2}
              value={config.description || ''}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              placeholder="Optional description"
            />

            {/* Primary Field Toggle */}
            <Toggle
              id="field-primary"
              labelText="Primary Field"
              labelA="No"
              labelB="Yes"
              toggled={config.primary}
              onToggle={(checked) => setConfig({ ...config, primary: checked })}
            />

            {/* Hidden Toggle */}
            <Toggle
              id="field-hidden"
              labelText="Hidden"
              labelA="No"
              labelB="Yes"
              toggled={config.hidden}
              onToggle={(checked) => setConfig({ ...config, hidden: checked })}
            />

            {/* Component-specific options based on type */}
            {config.type === 'NUMBER' || config.type === 'INTEGER' || config.type === 'DECIMAL' ? (
              <div className={styles['field-format-options']}>
                <h5>Number Formatting</h5>
                <Stack orientation="horizontal" gap={4}>
                  <NumberInput
                    id="field-decimals"
                    label="Decimal Places"
                    value={config.format?.decimals || 0}
                    onChange={(event) => {
                      const val = parseInt((event.target as HTMLInputElement).value) || 0;
                      setConfig({
                        ...config,
                        format: { ...config.format, decimals: val },
                      });
                    }}
                    min={0}
                    max={6}
                  />
                </Stack>
              </div>
            ) : null}
          </Stack>
        </FormGroup>
      </div>
    </Modal>
  );
}

/**
 * Field row component
 */
interface FieldRowProps {
  field: BuilderFieldConfig;
  detectedField?: DetectedField;
  isPrimary: boolean;
  onEdit: () => void;
  onUpdateField: (field: BuilderFieldConfig) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  componentType?: MonitorComponentType;
}

function FieldRow({
  field,
  detectedField,
  isPrimary,
  onEdit,
  onUpdateField,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  componentType,
}: FieldRowProps) {
  const [showStatusMapping, setShowStatusMapping] = useState(false);
  const requiredTypes = getRequiredFieldTypes(componentType);

  const handleStatusMappingSave = (mappings: BuilderStatusMapping[]) => {
    const updatedField = {
      ...field,
      statusMappings: mappings,
    };
    onUpdateField(updatedField);
    setShowStatusMapping(false);
  };

  return (
    <div className={styles['field-row']}>
      <div className={styles['field-row__drag']}>
        <div className={styles['field-row__drag-handle']}>
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            renderIcon={ArrowUp}
            iconDescription="Move up"
            onClick={onMoveUp}
            disabled={!canMoveUp}
          />
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            renderIcon={ArrowDown}
            iconDescription="Move down"
            onClick={onMoveDown}
            disabled={!canMoveDown}
          />
        </div>
      </div>

      <div className={styles['field-row__content']}>
        <div className={styles['field-row__main']}>
          <div className={styles['field-row__info']}>
            <div className={styles['field-row__header']}>
              <span className={styles['field-row__label']}>{field.label}</span>
              {isPrimary && <Tag type="blue" size="sm">Primary</Tag>}
              {field.hidden && <Tag type="gray" size="sm">Hidden</Tag>}
              {requiredTypes.includes(field.type) && (
                <Tag type="green" size="sm">Required</Tag>
              )}
            </div>
            <div className={styles['field-row__meta']}>
              <span className={styles['field-row__path']}>{field.path}</span>
              <Tag type="purple" size="sm">{field.type}</Tag>
            </div>
          </div>

          <div className={styles['field-row__actions']}>
            <Stack orientation="horizontal" gap={2}>
              {field.type === 'STATUS' && (
                <Button
                  kind="ghost"
                  size="sm"
                  onClick={() => setShowStatusMapping(true)}
                >
                  Map Status
                </Button>
              )}
              <Button
                kind="ghost"
                size="sm"
                hasIconOnly
                renderIcon={isPrimary ? DeleteIcon : EditIcon}
                iconDescription={isPrimary ? 'Cannot delete primary field' : 'Edit field'}
                onClick={isPrimary ? undefined : onEdit}
                disabled={isPrimary}
              />
              <Button
                kind="ghost"
                size="sm"
                hasIconOnly
                renderIcon={DeleteIcon}
                iconDescription="Delete field"
                onClick={onDelete}
                disabled={isPrimary}
              />
            </Stack>
          </div>
        </div>
      </div>

      {/* Status Mapping Modal */}
      {field.type === 'STATUS' && (
        <StatusMappingModal
          open={showStatusMapping}
          onClose={() => setShowStatusMapping(false)}
          onSave={handleStatusMappingSave}
          currentMappings={field.statusMappings || []}
          detectedValues={detectedField?.sampleValue ? [String(detectedField.sampleValue)] : []}
        />
      )}
    </div>
  );
}

/**
 * Fields Mapping Step Component
 */
export default function FieldsStep() {
  const { state } = useBuilderContext();
  const updateState = useUpdateBuilderState();

  const { fields, componentType, detectedSchema, testResult } = state;

  // UI state
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<BuilderFieldConfig | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Local timestamp configuration state
  const [timestampConfig, setTimestampConfig] = useState({
    unit: 'milliseconds' as 'milliseconds' | 'seconds',
    format: 'DD MMM YYYY, HH:mm',
    relative: false,
  });

  const detectedFields = detectedSchema?.fields || [];
  const requirements = getFieldRequirements(componentType);

  /**
   * Handle add field
   */
  const handleAddField = () => {
    setEditingField(null);
    setShowFieldModal(true);
  };

  /**
   * Handle edit field
   */
  const handleEditField = (field: BuilderFieldConfig) => {
    setEditingField(field);
    setShowFieldModal(true);
  };

  /**
   * Handle save field
   */
  const handleSaveField = (field: BuilderFieldConfig) => {
    const existingIndex = fields.findIndex((f) => f.key === field.key);

    if (existingIndex >= 0) {
      // Update existing field
      const newFields = [...fields];
      newFields[existingIndex] = field;
      updateState({ fields: newFields });
    } else {
      // Add new field
      updateState({
        fields: [...fields, { ...field, order: fields.length }],
      });
    }

    validateFields();
  };

  /**
   * Handle delete field
   */
  const handleDeleteField = (key: string) => {
    updateState({
      fields: fields.filter((f) => f.key !== key),
    });
    validateFields();
  };

  /**
   * Handle update field (for status mappings and other field updates)
   */
  const handleUpdateField = (updatedField: BuilderFieldConfig) => {
    const existingIndex = fields.findIndex((f) => f.key === updatedField.key);
    if (existingIndex >= 0) {
      const newFields = [...fields];
      newFields[existingIndex] = updatedField;
      updateState({ fields: newFields });
    }
    validateFields();
  };

  /**
   * Handle move field up
   */
  const handleMoveFieldUp = (index: number) => {
    if (index === 0) return;
    const newFields = [...fields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    newFields.forEach((f, i) => (f.order = i));
    updateState({ fields: newFields });
  };

  /**
   * Handle move field down
   */
  const handleMoveFieldDown = (index: number) => {
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    newFields.forEach((f, i) => (f.order = i));
    updateState({ fields: newFields });
  };

  /**
   * Auto-map detected fields
   */
  const handleAutoMap = () => {
    if (!detectedSchema || detectedFields.length === 0) {
      return;
    }

    const autoMappedFields: BuilderFieldConfig[] = detectedFields.map((detected, index) => {
      const existingField = fields.find((f) => f.path === detected.path);
      if (existingField) {
        return existingField;
      }

      return {
        key: detected.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
        label: detected.name,
        path: detected.path,
        type: detected.suggestedType || detected.type,
        primary: index === 0,
        hidden: false,
        order: index,
        description: detected.description,
      };
    });

    updateState({ fields: autoMappedFields });
    validateFields();
  };

  /**
   * Validate fields
   * Memoized to prevent recreation
   */
  const validateFields = React.useCallback(() => {
    const validation = validateFieldsStep(
      fields,
      componentType,
      testResult?.data,
      detectedSchema?.arrayPath,
    );
    setErrors(validation.errors);
    setWarnings(validation.warnings ?? []);
  }, [fields, componentType, testResult, detectedSchema]);

  // Validate on mount and when fields/component type changes
  React.useEffect(() => {
    validateFields();
  }, [validateFields]);

  const hasFields = fields.length > 0;
  const hasDetectedFields = detectedFields.length > 0;
  const hasErrors = errors.length > 0;

  return (
    <div className={styles['fields-step']}>
      <div className={styles['fields-step__header']}>
        <h2>Field Mapping</h2>
        <p className={styles['fields-step__description']}>
          Map fields from your API response to display fields. Configure types and formatting for each field.
        </p>
      </div>

      {/* Validation Errors */}
      {hasErrors && (
        <InlineNotification
          kind="error"
          title="Field Configuration Errors"
          subtitle={errors.length > 0 ? `${errors.length} error(s) - see details above` : ''}
          lowContrast
          style={{ marginBottom: '1rem' }}
        />
      )}

      {/* Path Warnings (non-blocking — paths that don't resolve in the tested response) */}
      {warnings.length > 0 && (
        <InlineNotification
          kind="warning"
          title="Unresolved Field Paths"
          subtitle={warnings.join(' · ')}
          lowContrast
          style={{ marginBottom: '1rem' }}
        />
      )}

      {/* Requirements Info */}
      {componentType && (
        <InlineNotification
          kind="info"
          title="Component Requirements"
          subtitle={requirements.join('; ')}
          lowContrast
          style={{ marginBottom: '1rem' }}
          hideCloseButton
        />
      )}

      {/* No Fields State */}
      {!hasFields && (
        <div className={styles['fields-step__empty']}>
          <h3>No Fields Configured</h3>
          <p>
            {hasDetectedFields
              ? `We detected ${detectedFields.length} fields from your endpoint response.`
              : 'Test your endpoint first to detect available fields.'}
          </p>
          {hasDetectedFields && (
            <Button kind="primary" renderIcon={Add} onClick={handleAutoMap}>
              Auto-Map Detected Fields
            </Button>
          )}
        </div>
      )}

      {/* Fields List */}
      {hasFields && (
        <div className={styles['fields-step__list']}>
          <div className={styles['fields-step__list-header']}>
            <h4>Configured Fields ({fields.length})</h4>
            {hasDetectedFields && fields.length < detectedFields.length && (
              <Button kind="ghost" size="sm" onClick={handleAutoMap}>
                Add Remaining Fields
              </Button>
            )}
          </div>

          <div className={styles['fields-step__fields']}>
            {fields.map((field, index) => {
              const detectedField = detectedFields.find((f) => f.path === field.path);
              return (
                <FieldRow
                  key={field.key}
                  field={field}
                  detectedField={detectedField}
                  isPrimary={field.primary}
                  onEdit={() => handleEditField(field)}
                  onUpdateField={handleUpdateField}
                  onDelete={() => handleDeleteField(field.key)}
                  onMoveUp={() => handleMoveFieldUp(index)}
                  onMoveDown={() => handleMoveFieldDown(index)}
                  canMoveUp={index > 0}
                  canMoveDown={index < fields.length - 1}
                  componentType={componentType}
                />
              );
            })}
          </div>

          <div className={styles['fields-step__actions']}>
            <Button kind="primary" renderIcon={Add} onClick={handleAddField}>
              Add Field
            </Button>
          </div>

          {/* Timestamp Format Configuration */}
          {hasFields && fields.some((f) => f.type === 'TIMESTAMP') && (
            <div className={styles['fields-step__timestamp-config']}>
              <div className={styles['fields-step__timestamp-header']}>
                <h4>Timestamp Format</h4>
                <p className={styles['fields-step__timestamp-description']}>
                  Configure how timestamp fields are displayed
                </p>
              </div>
              <div className={styles['fields-step__timestamp-settings']}>
                <div className={styles['fields-step__timestamp-field']}>
                  <label>Input unit</label>
                  <Select
                    id="timestamp-unit"
                    size="sm"
                    value={timestampConfig.unit}
                    onChange={(e) => {
                      setTimestampConfig({
                        ...timestampConfig,
                        unit: e.target.value as 'milliseconds' | 'seconds',
                      });
                    }}
                  >
                    <SelectItem value="milliseconds" text="Milliseconds" />
                    <SelectItem value="seconds" text="Seconds" />
                  </Select>
                </div>

                <div className={styles['fields-step__timestamp-field']}>
                  <label>Display format</label>
                  <TextInput
                    id="timestamp-format"
                    labelText=""
                    size="sm"
                    value={timestampConfig.format}
                    onChange={(e) => {
                      setTimestampConfig({
                        ...timestampConfig,
                        format: e.target.value,
                      });
                    }}
                    placeholder="e.g., 15 Aug 2026, 19:23"
                  />
                </div>

                <div className={styles['fields-step__timestamp-field']}>
                  <Toggle
                    id="timestamp-relative"
                    size="sm"
                    labelText="Show relative time"
                    labelA="No"
                    labelB="Yes"
                    toggled={timestampConfig.relative}
                    onToggle={(checked) => {
                      setTimestampConfig({
                        ...timestampConfig,
                        relative: checked,
                      });
                    }}
                  />
                  <span className={styles['fields-step__timestamp-helper']}>
                    Display timestamps as "2 minutes ago" instead of absolute time
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Field Configuration Modal */}
      <FieldConfigModal
        open={showFieldModal}
        onClose={() => setShowFieldModal(false)}
        onSave={handleSaveField}
        field={editingField}
        detectedFields={detectedFields}
        componentType={componentType}
      />
    </div>
  );
}

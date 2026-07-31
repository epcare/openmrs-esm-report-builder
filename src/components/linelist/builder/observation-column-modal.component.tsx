/**
 * Observation Column Modal Component
 *
 * Allows users to create observation-based columns using concept search
 * Similar to the pattern used in base indicator creation
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Select,
  SelectItem,
  Toggle,
  Stack,
  FormGroup,
  Checkbox,
  Button,
} from '@carbon/react';
import ConceptSelector from '../../shared/concept-selector.component';
import type { ConceptSummary } from '../../../resources/concepts/concept-types';
import type { LinelistColumnDraft } from '../../../types/linelist-types';
import styles from './observation-column-modal.scss';

type Props = {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when a new column is created */
  onAddColumn: (column: LinelistColumnDraft) => void;
  /** Existing columns to check for duplicates */
  existingColumns?: LinelistColumnDraft[];
  /** Column to edit (if provided, modal is in edit mode) */
  editingColumn?: LinelistColumnDraft | null;
};

type ColumnModifier = 'ANY' | 'FIRST' | 'MOST_RECENT' | 'FIRST_N' | 'MOST_RECENT_N';

const COLUMN_MODIFIER_OPTIONS: Array<{ value: ColumnModifier; label: string; description: string }> = [
  { value: 'ANY', label: 'Any', description: 'Return all observation values' },
  { value: 'FIRST', label: 'First', description: 'Earliest observation by date' },
  { value: 'MOST_RECENT', label: 'Most Recent', description: 'Most recent observation by date' },
  { value: 'FIRST_N', label: 'First #', description: 'First N observations by date' },
  { value: 'MOST_RECENT_N', label: 'Most Recent #', description: 'Most recent N observations' },
];

type ExtraValue = 'obsDatetime' | 'location' | 'comment' | 'encounterType' | 'provider';

const EXTRA_VALUE_OPTIONS: Array<{ value: ExtraValue; label: string; description: string }> = [
  { value: 'obsDatetime', label: 'Obs Datetime', description: 'Include observation date/time' },
  { value: 'location', label: 'Location', description: 'Include observation location' },
  { value: 'comment', label: 'Comment', description: 'Include observation comment' },
  { value: 'encounterType', label: 'Encounter Type', description: 'Include encounter type' },
  { value: 'provider', label: 'Provider', description: 'Include provider who made the observation' },
];

const ObservationColumnModal: React.FC<Props> = ({
  open,
  onClose,
  onAddColumn,
  existingColumns = [],
  editingColumn = null,
}) => {
  const [conceptSelectorKey, setConceptSelectorKey] = useState(0);
  const [selectedConcept, setSelectedConcept] = useState<ConceptSummary | undefined>();
  const [columnName, setColumnName] = useState('');
  const [columnValue, setColumnValue] = useState('');
  const [columnModifier, setColumnModifier] = useState<ColumnModifier>('MOST_RECENT');
  const [modifierCount, setModifierCount] = useState(1);
  const [returnDisplay, setReturnDisplay] = useState(true);
  const [extraValues, setExtraValues] = useState<ExtraValue[]>([]);
  const [answerConcept, setAnswerConcept] = useState<ConceptSummary | undefined>();

  /**
   * Reset form state
   */
  const resetForm = useCallback(() => {
    setSelectedConcept(undefined);
    setColumnName('');
    setColumnValue('');
    setColumnModifier('MOST_RECENT');
    setModifierCount(1);
    setReturnDisplay(true);
    setExtraValues([]);
    setAnswerConcept(undefined);
  }, []);

  /**
   * Reset form state when modal opens/closes
   * Also populate form when editing existing column
   */
  useEffect(() => {
    if (open) {
      setConceptSelectorKey((k) => k + 1);
      if (editingColumn) {
        // Populate form with existing column data
        const config = editingColumn.dataDefinitionConfig || {};

        // Debug: Check for required fields
        if (!config.conceptUuid) {
          console.warn('⚠️ Missing conceptUuid in dataDefinitionConfig');
        }
        if (!config.conceptName && !editingColumn.name) {
          console.warn('⚠️ Missing conceptName and column name');
        }
        if (!config.strategy) {
          console.warn('⚠️ Missing strategy in dataDefinitionConfig');
        }

        // Map strategy back to columnModifier
        let mappedColumnModifier: ColumnModifier = 'MOST_RECENT';
        const strategy = config.strategy;

        if (strategy === 'ALL_VALUES') {
          mappedColumnModifier = 'ANY';
        } else if (strategy === 'EARLIEST') {
          mappedColumnModifier = 'FIRST';
        } else if (strategy === 'LATEST') {
          mappedColumnModifier = 'MOST_RECENT';
        } else if (typeof strategy === 'string' && strategy.startsWith('FIRST_')) {
          mappedColumnModifier = 'FIRST_N';
        } else if (typeof strategy === 'string' && strategy.startsWith('LAST_')) {
          mappedColumnModifier = 'MOST_RECENT_N';
        }

        // Extract modifier count from strategy if it's FIRST_N or LAST_N
        let extractedModifierCount = 1;
        if (typeof strategy === 'string' && strategy.startsWith('FIRST_')) {
          const match = strategy.match(/^FIRST_(\d+)$/);
          if (match) extractedModifierCount = parseInt(match[1]) || 1;
        } else if (typeof strategy === 'string' && strategy.startsWith('LAST_')) {
          const match = strategy.match(/^LAST_(\d+)$/);
          if (match) extractedModifierCount = parseInt(match[1]) || 1;
        }

        const conceptForSelection = editingColumn.source?.conceptUuid ? {
          uuid: editingColumn.source.conceptUuid,
          display: config.conceptName || editingColumn.name,
          datatype: { name: editingColumn.source?.fieldType || 'TEXT' },
          conceptClass: undefined, // Not loaded from saved data
        } as ConceptSummary : undefined;

        setSelectedConcept(conceptForSelection);
        setColumnName(editingColumn.name || '');
        setColumnValue(editingColumn.description || '');
        setColumnModifier(config.columnModifier || mappedColumnModifier);
        setModifierCount(config.modifierCount || extractedModifierCount);
        setReturnDisplay(config.returnDisplay !== false);
        setExtraValues(config.extraValues || []);
        setAnswerConcept(config.answerConceptUuid ? {
          uuid: config.answerConceptUuid,
          display: config.answerConceptName || '',
        } as ConceptSummary : undefined);
      } else {
        // Reset for new column creation
        resetForm();
      }
    }
  }, [open, editingColumn, resetForm]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  /**
   * Handle concept selection
   */
  const handleConceptSelect = useCallback((concept: ConceptSummary) => {
    setSelectedConcept(concept);
    // Auto-generate column name from concept name if not set
    if (!columnName) {
      setColumnName(concept.display);
    }
    if (!columnValue) {
      setColumnValue(concept.display);
    }
  }, [columnName, columnValue]);

  /**
   * Handle extra value checkbox change
   */
  const handleExtraValueChange = useCallback((value: ExtraValue, event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setExtraValues(prev =>
      checked
        ? [...prev, value]
        : prev.filter(v => v !== value)
    );
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(() => {
    if (!selectedConcept || !columnName?.trim()) {
      return;
    }

    // Check for duplicate column names (exclude current column when editing)
    const duplicateName = existingColumns.some(col =>
      col.id !== editingColumn?.id && col.name.toLowerCase() === columnName.toLowerCase()
    );
    if (duplicateName) {
      // TODO: Show error notification
      return;
    }

    const now = new Date().toISOString();

    // Map ColumnModifier to strategy
    let strategy: string;
    let repeatStrategy: 'LATEST' | 'EARLIEST' | 'NONE' = 'LATEST';
    switch (columnModifier) {
      case 'ANY':
        strategy = 'ALL_VALUES';
        repeatStrategy = 'NONE';
        break;
      case 'FIRST':
        strategy = 'EARLIEST';
        repeatStrategy = 'EARLIEST';
        break;
      case 'MOST_RECENT':
        strategy = 'LATEST';
        repeatStrategy = 'LATEST';
        break;
      case 'FIRST_N':
        strategy = `FIRST_${modifierCount}`;
        repeatStrategy = 'EARLIEST';
        break;
      case 'MOST_RECENT_N':
        strategy = `LAST_${modifierCount}`;
        repeatStrategy = 'LATEST';
        break;
      default:
        strategy = 'LATEST';
        repeatStrategy = 'LATEST';
    }

    const newColumn: LinelistColumnDraft = {
      id: editingColumn?.id || `col-${now}-${selectedConcept.uuid}`,
      name: columnName.trim(),
      description: columnValue.trim() || selectedConcept.display,
      source: {
        dataSourceUuid: 'observations',
        dataSourceName: 'Observations',
        table: 'observations',
        field: selectedConcept.uuid,
        fieldType: selectedConcept.datatype?.name || 'TEXT',
        conceptUuid: selectedConcept.uuid,
      },
      dataDefinitionType: 'OBSERVATION',
      dataDefinitionConfig: {
        conceptUuid: selectedConcept.uuid,
        conceptName: selectedConcept.display,
        strategy,
        columnModifier,
        modifierCount: columnModifier === 'FIRST_N' || columnModifier === 'MOST_RECENT_N' ? modifierCount : undefined,
        returnDisplay,
        extraValues,
        ...(answerConcept && { answerConceptUuid: answerConcept.uuid }),
      },
      additionInfo: {
        addedVia: editingColumn?.additionInfo?.addedVia || 'VISUAL_SELECTOR',
        addedAt: editingColumn?.additionInfo?.addedAt || now,
        orderAdded: editingColumn?.additionInfo?.orderAdded || existingColumns.length,
      },
      display: editingColumn?.display || {
        width: 150,
        align: 'left',
        sortable: true,
        filterable: true,
        format: 'coded',
      },
      sortOrder: editingColumn?.sortOrder ?? existingColumns.length,
      repeatResolution: columnModifier === 'ANY' ? undefined : {
        strategy: repeatStrategy,
        orderBy: 'obs_datetime',
        restrictToPeriod: true,
        ignoreVoided: true,
      },
    };

    onAddColumn(newColumn);
    handleClose();
  }, [selectedConcept, columnName, columnValue, columnModifier, modifierCount, returnDisplay, extraValues, answerConcept, existingColumns, onAddColumn, handleClose, editingColumn]);

  /**
   * Check if form is valid
   */
  const isFormValid = selectedConcept && columnName?.trim();

  return (
    <Modal
      open={open}
      onRequestClose={handleClose}
      modalHeading={editingColumn ? "Edit Observation Column" : "Add Observation Column"}
      modalLabel="Data Catalogue"
      size="md"
      preventCloseOnClickOutside
      primaryButtonText={editingColumn ? "Save Changes" : "Add Column"}
      primaryButtonDisabled={!isFormValid}
      onRequestSubmit={handleSubmit}
      secondaryButtonText="Cancel"
      onSecondarySubmit={handleClose}
    >
      <div className={styles.content}>
        <Stack gap={6}>
          {/* Concept Selector */}
          <ConceptSelector
            key={conceptSelectorKey}
            openKey={conceptSelectorKey}
            selectedConcept={selectedConcept}
            onSelect={handleConceptSelect}
            onClear={() => setSelectedConcept(undefined)}
            label="Search for Concept"
            placeholder="Type to search for concepts (e.g., Weight, Temperature, HIV Status)..."
            showAdvanced={false}
          />

          {/* Column Configuration */}
          {selectedConcept && (
            <FormGroup legendText="Column Configuration">
              <Stack gap={4}>
                {/* Column Name */}
                <TextInput
                  id="observation-column-name"
                  labelText="Column Name *"
                  placeholder="Enter display name for this column"
                  value={columnName}
                  onChange={(e) => setColumnName(e.target.value)}
                />

                {/* Column Value */}
                <TextInput
                  id="observation-column-value"
                  labelText="Column Value"
                  placeholder="Description for the column value"
                  value={columnValue}
                  onChange={(e) => setColumnValue(e.target.value)}
                />

                {/* Column Modifier */}
                <Select
                  id="observation-column-modifier"
                  labelText="Column Modifier"
                  value={columnModifier}
                  onChange={(e) => setColumnModifier(e.target.value as ColumnModifier)}
                >
                  {COLUMN_MODIFIER_OPTIONS.map(opt => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      text={opt.label}
                      title={opt.description}
                    />
                  ))}
                </Select>

                {/* Modifier Count for FIRST_N and MOST_RECENT_N */}
                {(columnModifier === 'FIRST_N' || columnModifier === 'MOST_RECENT_N') && (
                  <TextInput
                    id="observation-modifier-count"
                    labelText="Number of Values"
                    type="number"
                    min={1}
                    max={100}
                    value={modifierCount.toString()}
                    onChange={(e) => setModifierCount(parseInt(e.target.value) || 1)}
                  />
                )}

                {/* Return Display Toggle */}
                <Toggle
                  id="observation-return-display"
                  labelText="Return concept display name instead of UUID"
                  toggled={returnDisplay}
                  onToggle={(checked) => setReturnDisplay(checked)}
                  size="sm"
                />

                {/* Extra Values */}
                <div>
                  <label className={styles.extraValuesLabel}>Extra Values</label>
                  <Stack gap={2} className={styles.extraValuesGrid}>
                    {EXTRA_VALUE_OPTIONS.map(option => (
                      <Checkbox
                        key={option.value}
                        id={`extra-${option.value}`}
                        labelText={option.label}
                        checked={extraValues.includes(option.value)}
                        onChange={(e) => handleExtraValueChange(option.value, e)}
                        title={option.description}
                      />
                    ))}
                  </Stack>
                </div>

                {/* Answer Concept (for coded concepts with answers) */}
                {(selectedConcept.answers && selectedConcept.answers.length > 0 || answerConcept) && (
                  <div>
                    {answerConcept && (!selectedConcept.answers || selectedConcept.answers.length === 0) && (
                      <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', opacity: 0.9 }}>
                        <strong>Filter by Answer:</strong> {answerConcept.display || answerConcept.uuid}
                        <Button
                          kind="ghost"
                          size="sm"
                          onClick={() => setAnswerConcept(undefined)}
                          style={{ marginLeft: '0.5rem' }}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                    {selectedConcept.answers && selectedConcept.answers.length > 0 && (
                      <Select
                        id="observation-answer-concept"
                        labelText="Filter by Answer (Optional)"
                        value={answerConcept?.uuid || ''}
                        onChange={(e) => {
                          const answer = selectedConcept.answers?.find(a => a.uuid === e.target.value);
                          setAnswerConcept(answer);
                        }}
                      >
                        <SelectItem value="" text="All answers" />
                        {selectedConcept.answers.map(answer => (
                          <SelectItem
                            key={answer.uuid}
                            value={answer.uuid}
                            text={answer.display}
                          />
                        ))}
                      </Select>
                    )}
                  </div>
                )}
              </Stack>
            </FormGroup>
          )}
        </Stack>
      </div>
    </Modal>
  );
};

export default ObservationColumnModal;

/**
 * Encounter Diagnosis Column Modal Component
 *
 * Allows users to create encounter diagnosis-based columns using concept search
 * Uses the same pattern as base indicator creation (Search + FilterableMultiSelect)
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
} from '@carbon/react';
import ConceptSelector from '../../shared/concept-selector.component';
import type { ConceptSummary } from '../../../resources/concepts/concept-types';
import type { LinelistColumnDraft } from '../../../types/linelist-types';
import styles from './encounter-diagnosis-column-modal.scss';

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

type StrategyOption = 'ALL_VALUES' | 'LATEST' | 'FIRST_WITHIN_PERIOD' | 'LAST_WITHIN_PERIOD';
type RankOption = 'PRIMARY' | 'SECONDARY' | 'ANY';

const STRATEGY_OPTIONS: Array<{ value: StrategyOption; label: string; description: string }> = [
  { value: 'ALL_VALUES', label: 'All Values', description: 'Return all diagnoses as comma-separated list' },
  { value: 'LATEST', label: 'Latest', description: 'Most recent diagnosis' },
  { value: 'FIRST_WITHIN_PERIOD', label: 'First in Period', description: 'First diagnosis within reporting period' },
  { value: 'LAST_WITHIN_PERIOD', label: 'Last in Period', description: 'Last diagnosis within reporting period' },
];

const RANK_OPTIONS: Array<{ value: RankOption; label: string; description: string }> = [
  { value: 'PRIMARY', label: 'Primary Only', description: 'Only primary diagnoses' },
  { value: 'SECONDARY', label: 'Secondary Only', description: 'Only secondary diagnoses' },
  { value: 'ANY', label: 'Any', description: 'Both primary and secondary diagnoses' },
];

const EncounterDiagnosisColumnModal: React.FC<Props> = ({
  open,
  onClose,
  onAddColumn,
  existingColumns = [],
  editingColumn = null,
}) => {
  const [conceptSelectorKey, setConceptSelectorKey] = useState(0);
  const [selectedConcept, setSelectedConcept] = useState<ConceptSummary | undefined>();
  const [columnName, setColumnName] = useState('');
  const [strategy, setStrategy] = useState<StrategyOption>('LAST_WITHIN_PERIOD');
  const [rank, setRank] = useState<RankOption>('ANY');
  const [confirmedOnly, setConfirmedOnly] = useState(true);
  const [returnDisplay, setReturnDisplay] = useState(true);

  /**
   * Reset form state
   */
  const resetForm = useCallback(() => {
    setSelectedConcept(undefined);
    setColumnName('');
    setStrategy('LAST_WITHIN_PERIOD');
    setRank('ANY');
    setConfirmedOnly(true);
    setReturnDisplay(true);
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
        setSelectedConcept(editingColumn.source?.conceptUuid ? {
          uuid: editingColumn.source.conceptUuid,
          display: config.conceptName || editingColumn.name,
          datatype: { name: editingColumn.source?.fieldType || 'TEXT' },
        } as ConceptSummary : undefined);
        setColumnName(editingColumn.name || '');
        setStrategy(config.strategy || 'LAST_WITHIN_PERIOD');
        setRank(config.rank || 'ANY');
        setConfirmedOnly(config.confirmedOnly !== false);
        setReturnDisplay(config.returnDisplay !== false);
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
  }, [columnName]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(() => {
    // Allow empty concept selection to capture ALL diagnoses
    const finalColumnName = columnName?.trim() || (selectedConcept?.display || 'Diagnoses');

    // Check for duplicate column names (exclude current column when editing)
    const duplicateName = existingColumns.some(col =>
      col.id !== editingColumn?.id && col.name.toLowerCase() === finalColumnName.toLowerCase()
    );
    if (duplicateName) {
      // TODO: Show error notification
      return;
    }

    const now = new Date().toISOString();

    const newColumn: LinelistColumnDraft = {
      id: editingColumn?.id || `col-${now}-${selectedConcept?.uuid || 'all-diagnoses'}`,
      name: finalColumnName,
      description: editingColumn?.description || (selectedConcept ? `Diagnosis: ${selectedConcept.display}` : 'All encounter diagnoses'),
      source: {
        dataSourceUuid: 'encounter_diagnoses',
        dataSourceName: 'Encounter Diagnoses',
        table: 'encounter_diagnoses',
        field: selectedConcept?.uuid || '*',
        fieldType: 'TEXT',
        conceptUuid: selectedConcept?.uuid,
      },
      dataDefinitionType: 'ENCOUNTER_DIAGNOSIS',
      dataDefinitionConfig: {
        conceptUuid: selectedConcept?.uuid,
        conceptName: selectedConcept?.display,
        rank,
        confirmedOnly,
        strategy,
        returnDisplay,
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
      repeatResolution: {
        strategy: strategy === 'ALL_VALUES' ? 'NONE' : 'LATEST',
        orderBy: 'encounter_date',
        restrictToPeriod: true,
        ignoreVoided: true,
      },
    };

    onAddColumn(newColumn);
    handleClose();
  }, [selectedConcept, columnName, strategy, rank, confirmedOnly, returnDisplay, existingColumns, onAddColumn, handleClose, editingColumn]);

  /**
   * Check if form is valid
   */
  const isFormValid = columnName?.trim();

  return (
    <Modal
      open={open}
      onRequestClose={handleClose}
      modalHeading={editingColumn ? "Edit Diagnosis Column" : "Add Diagnosis Column"}
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
          {/* Concept Selector - Optional for filtering by specific diagnosis */}
          <div className={styles.conceptSection}>
            <div className={styles.conceptSectionHeader}>
              <p className={styles.helperText}>
                Leave empty to capture ALL encounter diagnoses, or search for a specific diagnosis condition (e.g., "Malaria", "HIV", "TB").
              </p>
            </div>
            <ConceptSelector
              key={conceptSelectorKey}
              openKey={conceptSelectorKey}
              selectedConcept={selectedConcept}
              onSelect={handleConceptSelect}
              onClear={() => setSelectedConcept(undefined)}
              label="Search for Diagnosis Concept"
              placeholder="Type to search for diagnosis concepts..."
              showAdvanced={false}
            />
          </div>

          {/* Column Configuration */}
          <FormGroup legendText="Column Configuration">
            <Stack gap={4}>
              {/* Column Name */}
              <TextInput
                id="diagnosis-column-name"
                labelText="Column Name *"
                placeholder="Enter display name for this column"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
              />

              {/* Rank */}
              <Select
                id="diagnosis-rank"
                labelText="Diagnosis Rank"
                value={rank}
                onChange={(e) => setRank(e.target.value as RankOption)}
              >
                {RANK_OPTIONS.map(opt => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    text={opt.label}
                    title={opt.description}
                  />
                ))}
              </Select>

              {/* Strategy */}
              <Select
                id="diagnosis-strategy"
                labelText="Strategy for Multiple Diagnoses"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as StrategyOption)}
              >
                {STRATEGY_OPTIONS.map(opt => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    text={opt.label}
                    title={opt.description}
                  />
                ))}
              </Select>

              {/* Confirmed Only Toggle */}
              <Toggle
                id="diagnosis-confirmed-only"
                labelText="Only include confirmed diagnoses"
                toggled={confirmedOnly}
                onToggle={(checked) => setConfirmedOnly(checked)}
                size="sm"
              />

              {/* Return Display Toggle */}
              <Toggle
                id="diagnosis-return-display"
                labelText="Return concept display name instead of UUID"
                toggled={returnDisplay}
                onToggle={(checked) => setReturnDisplay(checked)}
                size="sm"
              />
            </Stack>
          </FormGroup>
        </Stack>
      </div>
    </Modal>
  );
};

export default EncounterDiagnosisColumnModal;

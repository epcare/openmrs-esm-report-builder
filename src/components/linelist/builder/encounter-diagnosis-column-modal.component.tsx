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
}) => {
  const [conceptSelectorKey, setConceptSelectorKey] = useState(0);
  const [selectedConcept, setSelectedConcept] = useState<ConceptSummary | undefined>();
  const [columnName, setColumnName] = useState('');
  const [strategy, setStrategy] = useState<StrategyOption>('LAST_WITHIN_PERIOD');
  const [rank, setRank] = useState<RankOption>('ANY');
  const [confirmedOnly, setConfirmedOnly] = useState(true);
  const [returnDisplay, setReturnDisplay] = useState(true);

  /**
   * Reset form state when modal opens/closes
   */
  useEffect(() => {
    if (open) {
      setConceptSelectorKey((k) => k + 1);
    }
  }, [open]);

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

    // Check for duplicate column names
    const duplicateName = existingColumns.some(col =>
      col.name.toLowerCase() === finalColumnName.toLowerCase()
    );
    if (duplicateName) {
      // TODO: Show error notification
      return;
    }

    const now = new Date().toISOString();

    const newColumn: LinelistColumnDraft = {
      id: `col-${now}-${selectedConcept?.uuid || 'all-diagnoses'}`,
      name: finalColumnName,
      description: selectedConcept ? `Diagnosis: ${selectedConcept.display}` : 'All encounter diagnoses',
      source: {
        dataSourceUuid: 'encounter_diagnoses',
        dataSourceName: 'Encounter Diagnoses',
        table: 'encounter_diagnosis',
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
        addedVia: 'VISUAL_SELECTOR',
        addedAt: now,
        orderAdded: existingColumns.length,
      },
      display: {
        width: 150,
        align: 'left',
        sortable: true,
        filterable: true,
        format: 'coded',
      },
      sortOrder: existingColumns.length,
      repeatResolution: {
        strategy: strategy === 'ALL_VALUES' ? 'NONE' : 'LATEST',
        orderBy: 'encounter_date',
        restrictToPeriod: true,
        ignoreVoided: true,
      },
    };

    onAddColumn(newColumn);
    handleClose();
  }, [selectedConcept, columnName, strategy, rank, confirmedOnly, returnDisplay, existingColumns, onAddColumn, handleClose]);

  /**
   * Check if form is valid
   */
  const isFormValid = columnName?.trim();

  return (
    <Modal
      open={open}
      onRequestClose={handleClose}
      modalHeading="Add Diagnosis Column"
      modalLabel="Data Catalogue"
      size="md"
      preventCloseOnClickOutside
      primaryButtonText="Add Column"
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

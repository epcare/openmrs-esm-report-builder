/**
 * Concept Selector Component
 *
 * Allows users to search and select OpenMRS concepts
 * Uses the same pattern as base indicator creation (Search + FilterableMultiSelect)
 *
 * Used for:
 * - Observations (selecting concepts to observe)
 * - Encounter Diagnoses (selecting diagnosis concepts)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Search,
  FilterableMultiSelect,
  InlineLoading,
  Tag,
  Stack,
  InlineNotification,
  Button,
} from '@carbon/react';
import { Close, Information } from '@carbon/react/icons';
import { useConceptSearch } from '../../resources/concepts/useConceptSearch';
import type { ConceptSummary } from '../../resources/concepts/concept-types';
import styles from './concept-selector.scss';

type Props = {
  /** Currently selected concept */
  selectedConcept?: ConceptSummary;
  /** Callback when a concept is selected */
  onSelect: (concept: ConceptSummary) => void;
  /** Callback when selection is cleared */
  onClear?: () => void;
  /** Disable the component */
  disabled?: boolean;
  /** Optional placeholder text for search */
  placeholder?: string;
  /** Optional label for the search input */
  label?: string;
  /** Filter concepts by class UUID */
  conceptClassUuid?: string;
  /** Show advanced options */
  showAdvanced?: boolean;
  /** Key to force reset of component state */
  openKey?: number;
};

const ConceptSelector: React.FC<Props> = ({
  selectedConcept,
  onSelect,
  onClear,
  disabled = false,
  placeholder = 'Type to search concepts...',
  label = 'Search concepts',
  showAdvanced = false,
  openKey = 0,
}) => {
  const [conceptQuery, setConceptQuery] = useState('');
  const [multiKey, setMultiKey] = useState(0);

  // Force-reset state when modal opens (openKey changes)
  useEffect(() => {
    setConceptQuery('');
    setMultiKey((k) => k + 1);
  }, [openKey]);

  const { loading, results, error } = useConceptSearch(conceptQuery);

  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setConceptQuery(e.target.value);
  }, []);

  /**
   * Handle concept selection
   */
  const handleSelect = useCallback((selectedItems: ConceptSummary[]) => {
    if (selectedItems.length > 0) {
      onSelect(selectedItems[0]);
    }
  }, [onSelect]);

  /**
   * Handle clearing selection
   */
  const handleClearSelection = useCallback(() => {
    onClear?.();
    setConceptQuery('');
  }, [onClear]);

  /**
   * Format concept for display
   */
  const itemToString = useCallback((item: ConceptSummary | null) => {
    if (!item) return '';
    const className = item.conceptClass?.name || '';
    return className ? `${item.display} (${className})` : item.display;
  }, []);

  return (
    <div className={styles.container}>
      <Stack gap={4}>
        {/* Header */}
        {showAdvanced && (
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <Information size={16} />
              <h4>Select Concept</h4>
            </div>
            <p className={styles.headerDescription}>
              Search for an OpenMRS concept to use for this column. Concepts define what data to observe or diagnose.
            </p>
          </div>
        )}

        {/* Selected Concept Display */}
        {selectedConcept && (
          <div className={styles.selectedDisplay}>
            <div className={styles.selectedInfo}>
              <span className={styles.selectedLabel}>Selected:</span>
              <Tag type="blue" size="sm">
                {selectedConcept.display}
              </Tag>
              <span className={styles.selectedMeta}>
                {selectedConcept.conceptClass?.name}
              </span>
            </div>
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              renderIcon={Close}
              iconDescription="Clear selection"
              onClick={handleClearSelection}
              disabled={disabled}
            />
          </div>
        )}

        {/* Concept Search - using base indicator pattern */}
        <div className={styles.searchSection}>
          <Search
            id="concept-search"
            labelText={label}
            placeholder={placeholder}
            value={conceptQuery}
            onChange={handleSearchChange}
            size="lg"
            disabled={disabled}
          />

          {loading ? <InlineLoading description="Searching…" /> : null}
          {error ? (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={error}
              lowContrast
              hideCloseButton
            />
          ) : null}

          <FilterableMultiSelect
            key={multiKey}
            id="concept-select"
            titleText="Select concept"
            items={results}
            itemToString={itemToString}
            placeholder={results.length ? 'Select a concept…' : 'No results'}
            helperText={selectedConcept ? 'Click to change selection' : 'Type at least 2 characters to search'}
            onChange={(e: any) => handleSelect((e.selectedItems ?? []) as ConceptSummary[])}
            disabled={disabled}
            selectionFeedback="top"
          />

          {/* Helper Text */}
          {!selectedConcept && !loading && !error && (
            <div className={styles.helperText}>
              <p>
                Type at least 2 characters to search for concepts. You can search by concept name or UUID.
              </p>
              <p className={styles.hint}>
                <strong>Tip:</strong> Use specific terms like "Weight", "HIV Status", or "Diagnosis" for better results.
              </p>
            </div>
          )}
        </div>

        {/* Advanced Options */}
        {showAdvanced && selectedConcept && (
          <div className={styles.advancedOptions}>
            <h5 className={styles.advancedTitle}>Concept Details</h5>
            <Stack gap={2}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>UUID:</span>
                <span className={styles.detailValue}>{selectedConcept.uuid}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Data Type:</span>
                <span className={styles.detailValue}>{selectedConcept.datatype?.name}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Class:</span>
                <span className={styles.detailValue}>{selectedConcept.conceptClass?.name}</span>
              </div>
              {selectedConcept.answers && selectedConcept.answers.length > 0 && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Answers:</span>
                  <div className={styles.detailValue}>
                    {selectedConcept.answers.map(answer => (
                      <Tag key={answer.uuid} type="gray" size="sm">
                        {answer.display}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
            </Stack>
          </div>
        )}
      </Stack>
    </div>
  );
};

export default ConceptSelector;

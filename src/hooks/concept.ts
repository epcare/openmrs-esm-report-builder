/**
 * Concept Hook
 *
 * Custom hook for fetching and searching OpenMRS concepts
 * Used in observations and encounter diagnoses for linelist reports
 */

import { useState, useCallback } from 'react';
import { searchConcepts, getConceptsByUuids, type ConceptDto } from '../resources/concept/concept.api';

type UseConceptsOptions = {
  enabled?: boolean;
  debounceMs?: number;
};

/**
 * Hook for searching concepts
 */
export function useConcepts(options: UseConceptsOptions = {}) {
  const { enabled = true } = options;

  const [concepts, setConcepts] = useState<ConceptDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchConceptsCallback = useCallback(
    async (query: string) => {
      if (!enabled) {
        setConcepts([]);
        return;
      }

      if (!query?.trim()) {
        setConcepts([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const results = await searchConcepts(query);
        setConcepts(results);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to search concepts';
        setError(errorMessage);
        setConcepts([]);
      } finally {
        setLoading(false);
      }
    },
    [enabled]
  );

  const getConceptsByUuidsCallback = useCallback(
    async (uuids: string[]) => {
      if (!uuids || uuids.length === 0) {
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        const results = await getConceptsByUuids(uuids);
        setConcepts(results);
        return results;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch concepts';
        setError(errorMessage);
        setConcepts([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    concepts,
    loading,
    error,
    searchConcepts: searchConceptsCallback,
    getConceptsByUuids: getConceptsByUuidsCallback,
  };
}

/**
 * Hook for managing a single concept selection
 */
export function useConceptSelection(initialConcept?: ConceptDto) {
  const [selectedConcept, setSelectedConcept] = useState<ConceptDto | undefined>(initialConcept);
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = useCallback((concept: ConceptDto) => {
    setSelectedConcept(concept);
    setIsOpen(false);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedConcept(undefined);
  }, []);

  return {
    selectedConcept,
    isOpen,
    setIsOpen,
    handleSelect,
    handleClear,
  };
}

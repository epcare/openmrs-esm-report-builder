/**
 * OpenMRS Reference Data Hooks
 *
 * Custom hooks for fetching OpenMRS reference data used in parameter selection.
 * These hooks handle loading states, caching, and error handling for:
 * - Locations
 * - Concepts
 * - Programs
 * - Providers
 * - Patient Identifier Types
 * - Person Attribute Types
 */

import { useState, useEffect, useRef } from 'react';

import {
  listLocations,
  searchLocations,
  type LocationDto,
} from '../resources/location/location.api';
import {
  searchConcepts,
  type ConceptDto,
} from '../resources/concept/concept.api';
import {
  listPatientIdentifierTypes,
  searchPatientIdentifierTypes,
  type PatientIdentifierTypeDto,
} from '../resources/patient-identifier-type/patient-identifier-type.api';
import {
  listPersonAttributeTypes,
  searchPersonAttributeTypes,
  type PersonAttributeTypeDto,
} from '../resources/person-attribute-type/person-attribute-type.api';

/**
 * Hook for fetching locations with optional tag filtering
 * @param tagUuid - Optional tag UUID to filter locations
 */
export function useLocations(tagUuid?: string) {
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadLocations = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listLocations(false, tagUuid);
        if (!cancelled) {
          setLocations(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load locations');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadLocations();

    return () => {
      cancelled = true;
    };
  }, [tagUuid]);

  return { locations, loading, error };
}

/**
 * Hook for searching locations with debouncing
 * @param query - Search query
 * @param tagUuid - Optional tag UUID to filter locations
 */
export function useLocationSearch(query: string, tagUuid?: string) {
  const [results, setResults] = useState<LocationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear previous debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search for empty queries
    if (!query?.trim()) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Debounce search
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchLocations(query, tagUuid);
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search locations');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, tagUuid]);

  return { results, loading, error };
}

/**
 * Hook for searching concepts with debouncing
 * @param query - Search query
 * @param conceptClassUuids - Optional array of concept class UUIDs to filter by
 */
export function useConceptSearch(query: string, conceptClassUuids?: string[]) {
  const [results, setResults] = useState<ConceptDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear previous debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search for empty queries
    if (!query?.trim()) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Debounce search
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchConcepts(query);
        let filtered = data;

        // Filter by concept classes if specified
        if (conceptClassUuids && conceptClassUuids.length > 0) {
          filtered = data.filter((concept) =>
            conceptClassUuids.includes(concept.conceptClass?.uuid)
          );
        }

        setResults(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search concepts');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, conceptClassUuids]);

  return { results, loading, error };
}

/**
 * Hook for fetching patient identifier types
 * @param includeAll - Include retired identifier types
 */
export function usePatientIdentifierTypes(includeAll: boolean = false) {
  const [identifierTypes, setIdentifierTypes] = useState<PatientIdentifierTypeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadIdentifierTypes = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listPatientIdentifierTypes(includeAll);
        if (!cancelled) {
          setIdentifierTypes(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load identifier types');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadIdentifierTypes();

    return () => {
      cancelled = true;
    };
  }, [includeAll]);

  return { identifierTypes, loading, error };
}

/**
 * Hook for searching patient identifier types with debouncing
 * @param query - Search query
 */
export function usePatientIdentifierTypeSearch(query: string) {
  const [results, setResults] = useState<PatientIdentifierTypeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear previous debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search for empty queries
    if (!query?.trim()) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Debounce search
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchPatientIdentifierTypes(query);
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search identifier types');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  return { results, loading, error };
}

/**
 * Hook for fetching person attribute types
 * @param includeAll - Include retired attribute types
 * @param format - Filter by format (e.g., 'org.openmrs.Concept')
 */
export function usePersonAttributeTypes(includeAll: boolean = false, format?: string) {
  const [attributeTypes, setAttributeTypes] = useState<PersonAttributeTypeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAttributeTypes = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listPersonAttributeTypes(includeAll);
        let filtered = data;

        // Filter by format if specified
        if (format) {
          filtered = data.filter((attr) => attr.format === format);
        }

        if (!cancelled) {
          setAttributeTypes(filtered);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load attribute types');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAttributeTypes();

    return () => {
      cancelled = true;
    };
  }, [includeAll, format]);

  return { attributeTypes, loading, error };
}

/**
 * Hook for searching person attribute types with debouncing
 * @param query - Search query
 */
export function usePersonAttributeTypeSearch(query: string) {
  const [results, setResults] = useState<PersonAttributeTypeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear previous debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search for empty queries
    if (!query?.trim()) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Debounce search
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchPersonAttributeTypes(query);
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search attribute types');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  return { results, loading, error };
}

/**
 * Hook for fetching configurable list options
 * @param options - Array of predefined options
 */
export function useListOptions(options: Array<{ value: string; label: string }> = []) {
  const [listOptions, setListOptions] = useState<Array<{ value: string; label: string }>>(options);

  useEffect(() => {
    setListOptions(options);
  }, [options]);

  return { listOptions };
}

/**
 * Unified hook for fetching reference data based on parameter type
 * @param paramType - The parameter type
 * @param config - The parameter configuration
 * @param searchQuery - Optional search query for search-based types
 */
export function useReferenceData(
  paramType: string,
  config?: any,
  searchQuery?: string
) {
  // Location types
  const locationData = useLocationSearch(searchQuery, config?.tagUuid);
  const allLocations = useLocations(config?.tagUuid);

  // Concept types
  const conceptData = useConceptSearch(searchQuery, config?.conceptClassUuids);

  // Identifier types
  const identifierData = usePatientIdentifierTypeSearch(searchQuery);
  const allIdentifiers = usePatientIdentifierTypes();

  // Person attribute types
  const attributeData = usePersonAttributeTypeSearch(searchQuery);
  const allAttributes = usePersonAttributeTypes(false, config?.format);

  // List options (static)
  const listData = useListOptions(config?.options);

  // Select the appropriate data based on parameter type
  switch (paramType) {
    case 'LOCATION':
      return searchQuery ? locationData : allLocations;
    case 'CONCEPT':
      return conceptData;
    case 'IDENTIFIER_TYPE':
      return searchQuery ? identifierData : allIdentifiers;
    case 'PERSON_ATTRIBUTE':
      return searchQuery ? attributeData : allAttributes;
    case 'LIST':
      return listData;
    default:
      return { results: [], loading: false, error: null };
  }
}

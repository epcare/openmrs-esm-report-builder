/**
 * React hook for address template
 *
 * Provides address field mappings from the OpenMRS system setting.
 */

import { useState, useEffect } from 'react';
import type { FilterFieldType } from '../types/linelist-types';
import {
  getAddressTemplate,
  type AddressTemplate,
} from '../resources/address-template/address-template.api';

/**
 * Hook to fetch and use the address template
 */
export function useAddressTemplate(): {
  template: AddressTemplate | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [template, setTemplate] = useState<AddressTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTemplate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAddressTemplate();
      setTemplate(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch address template'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplate();
  }, []);

  return {
    template,
    loading,
    error,
    refresh: fetchTemplate,
  };
}

/**
 * Hook to get address fields for the data catalogue
 * Returns an array of catalogue fields based on the address template
 */
export function useAddressFields(): {
  addressFields: Array<{
    id: string;
    name: string;
    label: string;
    type: FilterFieldType;
    source: 'CORE';
    table: string;
    isRepeated: boolean;
    description: string;
  }>;
  loading: boolean;
} {
  const { template, loading } = useAddressTemplate();

  const addressFields = template?.nameMappings.map((mapping) => ({
    id: `openmrs.person_address.${mapping.field}`,
    name: mapping.field,
    label: mapping.display,
    type: 'TEXT' as FilterFieldType,
    source: 'CORE' as const,
    table: 'person_address',
    isRepeated: false,
    description: mapping.label,
  })) || [];

  return {
    addressFields,
    loading,
  };
}

/**
 * Concept Parameter Input Component
 *
 * Handles CONCEPT parameter inputs with ComboBox using useConceptSearch hook.
 */

import React, { useCallback } from 'react';
import { ComboBox } from '@carbon/react';

import type { LinelistParameter } from '../../types/linelist-types';
import { useConceptSearch } from '../../hooks/openmrs-reference-data';

type Props = {
  parameter: LinelistParameter;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
};

type SelectedItem = {
  uuid?: string;
  label: string;
};

const ConceptParameterInput: React.FC<Props> = ({
  parameter,
  value,
  error,
  onChange,
  searchQuery = '',
  onSearchQueryChange
}) => {
  const config = parameter.config as any;
  const conceptClassUuids = config?.conceptClassUuids;

  const { results: concepts } = useConceptSearch(searchQuery, conceptClassUuids);

  const items = concepts.map((concept: any) => ({
    uuid: concept.uuid,
    label: concept.display || concept.name?.name || concept.uuid,
  }));

  const selectedItemSelected: SelectedItem | undefined = items.find((item) => item.uuid === value);

  const handleInputChange = useCallback((input: string) => {
    onSearchQueryChange?.(input);
  }, [onSearchQueryChange]);

  const handleChange = useCallback(({ selectedItem }: { selectedItem?: SelectedItem }) => {
    if (selectedItem) {
      onChange(selectedItem.uuid || '');
    } else {
      onChange('');
    }
  }, [onChange]);

  return (
    <div>
      <label htmlFor={`report-param-${parameter.name}`} className="cds--label">
        {parameter.label}
      </label>
      <ComboBox
        id={`report-param-${parameter.name}`}
        titleText={parameter.label}
        items={items}
        itemToString={(item: any) => item?.label || ''}
        initialSelectedItem={selectedItemSelected}
        onInputChange={handleInputChange}
        onChange={handleChange}
        invalid={!!error}
        invalidText={error}
        placeholder={parameter.label}
        size="sm"
      />
    </div>
  );
};

export default ConceptParameterInput;

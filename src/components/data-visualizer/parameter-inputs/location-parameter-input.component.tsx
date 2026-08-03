/**
 * Location Parameter Input Component
 *
 * Handles LOCATION parameter inputs with ComboBox using useLocations hook.
 */

import React, { useCallback } from 'react';
import { ComboBox } from '@carbon/react';

import type { LinelistParameter } from '../../../types/linelist-types';
import { useLocations } from '../../../hooks/openmrs-reference-data';

type Props = {
  parameter: LinelistParameter;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  // searchQuery: string; // TODO: Implement location search filtering
  onSearchQueryChange?: (query: string) => void;
};

type SelectedItem = {
  uuid?: string;
  label: string;
};

const LocationParameterInput: React.FC<Props> = ({
  parameter,
  value,
  error,
  onChange,
  onSearchQueryChange
}) => {
  const config = parameter.config as any;
  const tagUuid = config?.tagUuid;

  // Load all locations
  const { locations } = useLocations(tagUuid);

  const items = locations.map((loc) => ({
    uuid: loc.uuid,
    label: loc.display || loc.name,
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

export default LocationParameterInput;

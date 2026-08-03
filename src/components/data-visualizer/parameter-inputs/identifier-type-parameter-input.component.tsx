/**
 * Identifier Type Parameter Input Component
 *
 * Handles IDENTIFIER_TYPE parameter inputs with ComboBox using usePatientIdentifierTypes hook.
 */

import React, { useCallback } from 'react';
import { ComboBox } from '@carbon/react';

import type { LinelistParameter } from '../../../types/linelist-types';
import { usePatientIdentifierTypes } from '../../../hooks/openmrs-reference-data';

type Props = {
  parameter: LinelistParameter;
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

type SelectedItem = {
  uuid?: string;
  label: string;
};

const IdentifierTypeParameterInput: React.FC<Props> = ({
  parameter,
  value,
  error,
  onChange
}) => {
  const { identifierTypes } = usePatientIdentifierTypes(true);

  const items = identifierTypes.map((idType) => ({
    uuid: idType.uuid,
    label: idType.display || idType.name || idType.uuid,
  }));

  const selectedItemSelected: SelectedItem | undefined = items.find((item) => item.uuid === value);

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
        onChange={handleChange}
        invalid={!!error}
        invalidText={error}
        placeholder={parameter.label}
        size="sm"
      />
    </div>
  );
};

export default IdentifierTypeParameterInput;

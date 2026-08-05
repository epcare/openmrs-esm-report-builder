/**
 * Person Attribute Parameter Input Component
 *
 * Handles PERSON_ATTRIBUTE parameter inputs with ComboBox using usePersonAttributeTypes hook.
 */

import React, { useCallback } from 'react';
import { ComboBox } from '@carbon/react';

import type { LinelistParameter } from '../../types/linelist-types';
import { usePersonAttributeTypes } from '../../hooks/openmrs-reference-data';

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

const PersonAttributeParameterInput: React.FC<Props> = ({
  parameter,
  value,
  error,
  onChange
}) => {
  const config = parameter.config as any;
  const format = config?.format;
  const { attributeTypes } = usePersonAttributeTypes(false, format);

  const items = attributeTypes.map((attrType) => ({
    uuid: attrType.uuid,
    label: attrType.display || attrType.name || attrType.uuid,
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

export default PersonAttributeParameterInput;

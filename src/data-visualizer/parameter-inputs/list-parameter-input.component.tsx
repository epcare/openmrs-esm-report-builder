/**
 * List Parameter Input Component
 *
 * Handles LIST parameter inputs with Select or ComboBox.
 */

import React from 'react';
import { Select, SelectItem, ComboBox } from '@carbon/react';

import type { LinelistParameter } from '../../types/linelist-types';

type Props = {
  parameter: LinelistParameter;
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

const ListParameterInput: React.FC<Props> = ({ parameter, value, error, onChange }) => {
  const config = parameter.config as any;
  const options = config?.options || [];

  if (options.length <= 5) {
    // Use Select for small lists
    return (
      <Select
        id={`report-param-${parameter.name}`}
        labelText={parameter.label}
        value={value}
        onChange={(e) => {
          const selectedValue = (e.target as HTMLSelectElement).value;
          onChange(selectedValue);
        }}
        invalid={!!error}
        invalidText={error}
        size="sm"
      >
        <SelectItem value="" text={`Select ${parameter.label}`} />
        {options.map((opt: any) => (
          <SelectItem key={opt.value} value={opt.value} text={opt.label} />
        ))}
      </Select>
    );
  }

  // Use ComboBox for larger lists
  return (
    <div>
      <label htmlFor={`report-param-${parameter.name}`} className="cds--label">
        {parameter.label}
      </label>
      <ComboBox
        id={`report-param-${parameter.name}`}
        titleText={parameter.label}
        items={options}
        itemToString={(item: any) => item?.label || ''}
        initialSelectedItem={options.find((opt: any) => opt.value === value)}
        onChange={({ selectedItem }) => {
          if (selectedItem) {
            onChange((selectedItem as any).value);
          } else {
            onChange('');
          }
        }}
        invalid={!!error}
        invalidText={error}
        size="sm"
      />
    </div>
  );
};

export default ListParameterInput;

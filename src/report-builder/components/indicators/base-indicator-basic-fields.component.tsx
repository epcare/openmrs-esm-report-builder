import React from 'react';
import { TextInput } from '@carbon/react';

type Props = {
  code: string;
  name: string;
  onChangeCode: (next: string) => void;
  onChangeName: (next: string) => void;
};

export default function BaseIndicatorBasicFields({ code, name, onChangeCode, onChangeName }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
      <TextInput id="base-code" labelText="Code" value={code} onChange={(e) => onChangeCode((e.target as HTMLInputElement).value)} />
      <TextInput id="base-name" labelText="Name" value={name} onChange={(e) => onChangeName((e.target as HTMLInputElement).value)} />
    </div>
  );
}

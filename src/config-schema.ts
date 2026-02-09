import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  defaultMapping: {
    _description: 'Defaults used by the report builder.',
    keyPattern: {
      _default: '{code}_{age}_{sex}',
      _description: 'Default key pattern for flat values.',
      _type: Type.String,
    },
    defaultDimensions: {
      _description: 'Default dimension names used in templates.',
      age: {
        _default: 'age',
        _type: Type.String,
      },
      sex: {
        _default: 'sex',
        _type: Type.String,
      },
    },
  },
};

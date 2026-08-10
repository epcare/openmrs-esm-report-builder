import React from 'react';
import { Toggle, ComboBox, Stack, Tag } from '@carbon/react';

import type { RedisaggregationStrategy } from '../types/custom-indicator.types';

type Props = {
  supportsRedisaggregation: boolean;
  redisaggregationStrategy: RedisaggregationStrategy;
  themeIndependent: boolean;
  onChangeSupportsRedisaggregation: (value: boolean) => void;
  onChangeRedisaggregationStrategy: (value: RedisaggregationStrategy) => void;
  onChangeThemeIndependent: (value: boolean) => void;
};

const REDISAGGREGATION_OPTIONS = [
  {
    id: 'population-extraction' as const,
    label: 'Population Extraction',
  },
  {
    id: 'query-rewriting' as const,
    label: 'Query Rewriting',
  },
  {
    id: 'custom' as const,
    label: 'Custom Logic',
  },
  {
    id: 'none' as const,
    label: 'Not Supported',
  },
];

export default function CustomIndicatorDisaggregationSection({
  supportsRedisaggregation,
  redisaggregationStrategy,
  themeIndependent,
  onChangeSupportsRedisaggregation,
  onChangeRedisaggregationStrategy,
  onChangeThemeIndependent,
}: Props) {
  const selectedStrategy = React.useMemo(
    () => REDISAGGREGATION_OPTIONS.find((opt) => opt.id === redisaggregationStrategy) || REDISAGGREGATION_OPTIONS[0],
    [redisaggregationStrategy],
  );

  return (
    <Stack gap={4}>
      <h4 style={{ margin: 0 }}>Re-disaggregation Configuration</h4>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Toggle
          id="supports-redisaggregation"
          labelText="Supports Re-disaggregation"
          labelA="No"
          labelB="Yes"
          toggled={supportsRedisaggregation}
          onChange={(e) => onChangeSupportsRedisaggregation((e.target as HTMLInputElement).checked)}
        />

        <Toggle
          id="theme-independent"
          labelText="Theme Independent"
          labelA="No"
          labelB="Yes"
          toggled={themeIndependent}
          onChange={(e) => onChangeThemeIndependent((e.target as HTMLInputElement).checked)}
        />
      </div>

      {supportsRedisaggregation && (
        <ComboBox
          id="redisaggregation-strategy"
          titleText="Re-disaggregation Strategy"
          items={REDISAGGREGATION_OPTIONS}
          itemToString={(item) => (item ? item.label : '')}
          selectedItem={selectedStrategy}
          placeholder="Select strategy"
          onChange={({ selectedItem: selected }) => {
            if (selected) {
              onChangeRedisaggregationStrategy((selected as any).id);
            }
          }}
          helperText="How should the indicator handle re-disaggregation in sections?"
        />
      )}

      {!supportsRedisaggregation && (
        <Tag type="gray">This indicator will not support re-disaggregation in report sections</Tag>
      )}
    </Stack>
  );
}

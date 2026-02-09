import React from 'react';
import { Dropdown, TextInput, Tile } from '@carbon/react';
import styles from '../../report-builder.scss';

export type MappingOption = { id: string; text: string };

type MappingPanelProps = {
  title: string;
  categoryOptions: MappingOption[];
  attributeOptions: MappingOption[];
  selectedCategoryOption: MappingOption;
  selectedAttributeOption: MappingOption;
  onChangeCategoryOption: (opt: MappingOption) => void;
  onChangeAttributeOption: (opt: MappingOption) => void;
  selectedNodeLabel?: string;
  dimensions?: Record<string, string>;
  onChangeDimension?: (dimKey: string, value: string) => void;
};

export function MappingPanel(props: MappingPanelProps) {
  const {
    title,
    categoryOptions,
    attributeOptions,
    selectedCategoryOption,
    selectedAttributeOption,
    onChangeCategoryOption,
    onChangeAttributeOption,
    selectedNodeLabel,
    dimensions,
    onChangeDimension,
  } = props;

  return (
    <Tile className={styles.panel}>
      <h4 className={styles.panelTitle}>{title}</h4>

      {selectedNodeLabel ? (
        <p className={styles.subtleText}>
          Selected: <strong>{selectedNodeLabel}</strong>
        </p>
      ) : null}

      <div className={styles.mappingGrid}>
        <Dropdown
          id="coc"
          label="Category Option Combo"
          titleText="Category Option Combo"
          items={categoryOptions}
          itemToString={(item) => item?.text ?? ''}
          selectedItem={selectedCategoryOption}
          onChange={(e) => e.selectedItem && onChangeCategoryOption(e.selectedItem as MappingOption)}
        />

        <Dropdown
          id="aoc"
          label="Attribute Option Combo"
          titleText="Attribute Option Combo"
          items={attributeOptions}
          itemToString={(item) => item?.text ?? ''}
          selectedItem={selectedAttributeOption}
          onChange={(e) => e.selectedItem && onChangeAttributeOption(e.selectedItem as MappingOption)}
        />
      </div>

      {dimensions && onChangeDimension ? (
        <div className={styles.dimensionsGrid}>
          {Object.entries(dimensions).map(([key, value]) => (
            <TextInput
              key={key}
              id={`dim-${key}`}
              labelText={key}
              value={value}
              onChange={(e) => onChangeDimension(key, e.target.value)}
            />
          ))}
        </div>
      ) : null}
    </Tile>
  );
}

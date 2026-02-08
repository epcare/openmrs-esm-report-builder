import React from 'react';
import { Tabs, Tab, TabList, TabPanels, TabPanel, TextInput, Dropdown, Button, Tile } from '@carbon/react';
import { useTranslation } from 'react-i18next';

import styles from './IndicatorPropertiesPanel.scss';

type DropdownItem = { id: string; text: string };

export type SelectedNode = {
  id: string;
  label?: string;
  code?: string;
};

type Props = {
  selected?: SelectedNode | null;

  onChangeSelectedLabel: (value: string) => void;
  onChangeSelectedCode: (value: string) => void;

  mappingCategoryOptions: DropdownItem[];
  mappingAttrOptions: DropdownItem[];

  // Optional: if you want these wired to actual values later
  selectedCoc?: DropdownItem | null;
  selectedAoc?: DropdownItem | null;
  onChangeCoc?: (item: DropdownItem) => void;
  onChangeAoc?: (item: DropdownItem) => void;

  onRemoveOverride?: () => void;
};

export default function IndicatorPropertiesPanel({
                                                   selected,
                                                   onChangeSelectedLabel,
                                                   onChangeSelectedCode,
                                                   mappingCategoryOptions,
                                                   mappingAttrOptions,
                                                   selectedCoc,
                                                   selectedAoc,
                                                   onChangeCoc,
                                                   onChangeAoc,
                                                   onRemoveOverride,
                                                 }: Props) {
  const { t } = useTranslation();

  return (
    <Tile className={styles.tile}>
    <>
      <div className={styles.tileHeader}>
        <h3 className={styles.tileTitle}>{t('indicatorProperties', 'Indicator Properties')}</h3>
      </div>

      <Tabs>
        <TabList aria-label={t('propertiesTabs', 'Properties tabs')}>
          <Tab>{t('details', 'Details')}</Tab>
          <Tab>{t('disaggregation', 'Disaggregation')}</Tab>
          <Tab>{t('mapping', 'Mapping')}</Tab>
        </TabList>

        <TabPanels>
          {/* Details */}
          <TabPanel>
            <div className={styles.formGrid}>
              <TextInput
                id="nodeLabel"
                labelText={t('label', 'Label')}
                value={selected?.label ?? ''}
                onChange={(e) => onChangeSelectedLabel(e.target.value)}
                placeholder={t('selectNode', 'Select a node to edit')}
              />

              <TextInput
                id="nodeCode"
                labelText={t('codeOptional', 'Code (optional for grouping nodes)')}
                value={selected?.code ?? ''}
                onChange={(e) => onChangeSelectedCode(e.target.value)}
              />
            </div>

            <div className={styles.note}>
              {t(
                'noteGroups',
                'Note: Nodes with children act as groups. Leaf nodes act as indicators and will appear as rows in the output tables.',
              )}
            </div>
          </TabPanel>

          {/* Disaggregation */}
          <TabPanel>
            <div className={styles.placeholder}>
              {t('disaggPlaceholder', 'Disaggregation settings will go here.')}
            </div>
          </TabPanel>

          {/* Mapping */}
          <TabPanel>
            <div className={styles.formGrid}>
              <TextInput
                id="indicatorCode"
                labelText={t('code', 'Code')}
                value={selected?.code ?? ''}
                onChange={(e) => onChangeSelectedCode(e.target.value)}
              />

              <TextInput
                id="dataElementId"
                labelText={t('dataElementId', 'Data Element ID')}
                value={selected?.code ? `${selected.code}_Cases` : ''}
                onChange={() => {}}
                readOnly
              />

              <Dropdown
                id="coc"
                label=""
                titleText={t('categoryOptionCombo', 'Category Option Combo')}
                items={mappingCategoryOptions}
                itemToString={(item) => (item ? item.text : '')}
                selectedItem={selectedCoc ?? mappingCategoryOptions?.[0]}
                onChange={(e) => onChangeCoc?.(e.selectedItem as DropdownItem)}
              />

              <Dropdown
                id="aoc"
                label=""
                titleText={t('attributeOptionCombo', 'Attribute Option Combo')}
                items={mappingAttrOptions}
                itemToString={(item) => (item ? item.text : '')}
                selectedItem={selectedAoc ?? mappingAttrOptions?.[0]}
                onChange={(e) => onChangeAoc?.(e.selectedItem as DropdownItem)}
              />
            </div>

            <div className={styles.mappingActions}>
              <Button size="sm" kind="secondary" onClick={() => onRemoveOverride?.()}>
                {t('removeOverride', 'Remove Override')}
              </Button>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </>
    </Tile>
  );
}
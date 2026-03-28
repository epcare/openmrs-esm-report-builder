import React from 'react';
import {
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  TextInput,
  Dropdown,
  Button,
  Tile,
  ComboBox,
  InlineLoading,
  InlineNotification,
  Tag,
} from '@carbon/react';
import { useTranslation } from 'react-i18next';

import styles from './IndicatorPropertiesPanel.scss';

type DropdownItem = { id: string; text: string };

export type SelectedNode = {
  id: string;
  label?: string;
  code?: string;

  // Optional “domain” fields you can persist on your indicator node
  conditionConceptUuid?: string;
  conditionConceptLabel?: string;
};

export type ConceptSummary = {
  uuid: string;
  display: string;

  // Optional fields if you request v=full (or v=custom)
  conceptClass?: { display?: string };
  datatype?: { display?: string };
  mappings?: Array<{
    display?: string;
    conceptReferenceTerm?: { display?: string };
    conceptMapType?: { display?: string };
  }>;
};

type Props = {
  selected?: SelectedNode | null;

  onChangeSelectedLabel: (value: string) => void;
  onChangeSelectedCode: (value: string) => void;

  // NEW: concept selection (persist onto selected node in your tree)
  onChangeSelectedConditionConcept?: (payload: { uuid: string; label: string } | null) => void;

  mappingCategoryOptions: DropdownItem[];
  mappingAttrOptions: DropdownItem[];

  selectedCoc?: DropdownItem | null;
  selectedAoc?: DropdownItem | null;
  onChangeCoc?: (item: DropdownItem) => void;
  onChangeAoc?: (item: DropdownItem) => void;

  onRemoveOverride?: () => void;

  /**
   * ✅ API hooks (pass from container)
   * - searchConcepts: queries OpenMRS concept endpoint (q=..., v=custom/full)
   * - previewIndicator: optional “test run” endpoint for the selected indicator node
   */
  searchConcepts?: (query: string) => Promise<ConceptSummary[]>;
  previewIndicator?: (nodeId: string) => Promise<{ rows: number; sample?: any[] }>;
};

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function IndicatorPropertiesPanel({
                                                   selected,
                                                   onChangeSelectedLabel,
                                                   onChangeSelectedCode,
                                                   onChangeSelectedConditionConcept,
                                                   mappingCategoryOptions,
                                                   mappingAttrOptions,
                                                   selectedCoc,
                                                   selectedAoc,
                                                   onChangeCoc,
                                                   onChangeAoc,
                                                   onRemoveOverride,
                                                   searchConcepts,
                                                   previewIndicator,
                                                 }: Props) {
  const { t } = useTranslation();

  // ----------------------------
  // Concept search (API-backed)
  // ----------------------------
  const [conceptQuery, setConceptQuery] = React.useState('');
  const debouncedQuery = useDebouncedValue(conceptQuery, 300);

  const [conceptItems, setConceptItems] = React.useState<ConceptSummary[]>([]);
  const [conceptLoading, setConceptLoading] = React.useState(false);
  const [conceptError, setConceptError] = React.useState<string | null>(null);

  const selectedConceptUuid = selected?.conditionConceptUuid ?? '';
  const selectedConceptLabel = selected?.conditionConceptLabel ?? '';

  // track selected concept object if it exists in list
  const selectedConceptItem = React.useMemo(() => {
    if (!selectedConceptUuid) return null;
    return (
        conceptItems.find((c) => c.uuid === selectedConceptUuid) ?? {
          uuid: selectedConceptUuid,
          display: selectedConceptLabel || selectedConceptUuid,
        }
    );
  }, [conceptItems, selectedConceptUuid, selectedConceptLabel]);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!searchConcepts) return; // API not wired yet
      const q = (debouncedQuery ?? '').trim();
      if (!q || q.length < 2) {
        setConceptItems([]);
        setConceptError(null);
        return;
      }

      try {
        setConceptLoading(true);
        setConceptError(null);
        const results = await searchConcepts(q);
        if (!cancelled) setConceptItems(results ?? []);
      } catch (e: any) {
        if (!cancelled) setConceptError(e?.message ?? 'Failed to search concepts');
      } finally {
        if (!cancelled) setConceptLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, searchConcepts]);

  // ----------------------------
  // Preview / Test (API-backed)
  // ----------------------------
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [previewInfo, setPreviewInfo] = React.useState<{ rows: number; sample?: any[] } | null>(null);

  const runPreview = async () => {
    if (!previewIndicator || !selected?.id) return;
    try {
      setPreviewLoading(true);
      setPreviewError(null);
      const res = await previewIndicator(selected.id);
      setPreviewInfo(res);
    } catch (e: any) {
      setPreviewError(e?.message ?? 'Failed to preview indicator');
      setPreviewInfo(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const isEmpty = !selected;

  return (
      <Tile className={styles.tile}>
        <div className={styles.tileHeader}>
          <h3 className={styles.tileTitle}>{t('indicatorProperties', 'Indicator Properties')}</h3>
          {isEmpty ? (
              <div className={styles.tileHint}>{t('selectNodeHint', 'Select an indicator/row to edit properties')}</div>
          ) : null}
        </div>

        <Tabs>
          <TabList aria-label={t('propertiesTabs', 'Properties tabs')}>
            <Tab>{t('details', 'Details')}</Tab>
            <Tab>{t('disaggregation', 'Disaggregation')}</Tab>
            <Tab>{t('mapping', 'Mapping')}</Tab>
            <Tab>{t('api', 'API')}</Tab>
          </TabList>

          <TabPanels>
            {/* ---------------- Details ---------------- */}
            <TabPanel>
              <div className={styles.formGrid}>
                <TextInput
                    id="nodeLabel"
                    labelText={t('label', 'Label')}
                    value={selected?.label ?? ''}
                    onChange={(e) => onChangeSelectedLabel(e.target.value)}
                    placeholder={t('selectNode', 'Select a node to edit')}
                    disabled={isEmpty}
                />

                <TextInput
                    id="nodeCode"
                    labelText={t('codeOptional', 'Code (optional for grouping nodes)')}
                    value={selected?.code ?? ''}
                    onChange={(e) => onChangeSelectedCode(e.target.value)}
                    disabled={isEmpty}
                />
              </div>

              <div className={styles.note}>
                {t(
                    'noteGroups',
                    'Note: Nodes with children act as groups. Leaf nodes act as indicators and will appear as rows in the output tables.',
                )}
              </div>
            </TabPanel>

            {/* ---------------- Disaggregation ---------------- */}
            <TabPanel>
              <div className={styles.placeholder}>
                {t('disaggPlaceholder', 'Disaggregation settings will go here.')}
              </div>
            </TabPanel>

            {/* ---------------- Mapping ---------------- */}
            <TabPanel>
              <div className={styles.formGrid}>
                <TextInput
                    id="indicatorCode"
                    labelText={t('code', 'Code')}
                    value={selected?.code ?? ''}
                    onChange={(e) => onChangeSelectedCode(e.target.value)}
                    disabled={isEmpty}
                />

                <TextInput
                    id="dataElementId"
                    labelText={t('dataElementId', 'Data Element ID')}
                    value={selected?.code ? `${selected.code}_Cases` : ''}
                    readOnly
                />

                <Dropdown
                    id="coc"
                    label=""
                    titleText={t('categoryOptionCombo', 'Category Option Combo')}
                    items={mappingCategoryOptions}
                    itemToString={(item) => (item ? item.text : '')}
                    selectedItem={selectedCoc ?? null}
                    onChange={(e) => onChangeCoc?.(e.selectedItem as DropdownItem)}
                />

                <Dropdown
                    id="aoc"
                    label=""
                    titleText={t('attributeOptionCombo', 'Attribute Option Combo')}
                    items={mappingAttrOptions}
                    itemToString={(item) => (item ? item.text : '')}
                    selectedItem={selectedAoc ?? null}
                    onChange={(e) => onChangeAoc?.(e.selectedItem as DropdownItem)}
                />
              </div>

              <div className={styles.mappingActions}>
                <Button size="sm" kind="secondary" onClick={() => onRemoveOverride?.()}>
                  {t('removeOverride', 'Remove Override')}
                </Button>
              </div>
            </TabPanel>

            {/* ---------------- API ---------------- */}
            <TabPanel>
              {!searchConcepts ? (
                  <InlineNotification
                      kind="info"
                      lowContrast
                      title={t('apiNotWired', 'API not wired yet')}
                      subtitle={t(
                          'apiNotWiredHint',
                          'Pass searchConcepts() from your container using OpenMRS REST (ws/rest/v1/concept?q=...).',
                      )}
                  />
              ) : null}

              <div className={styles.apiBlock}>
                <ComboBox
                    id="conceptSearch"
                    titleText={t('conditionConcept', 'Condition concept')}
                    placeholder={t('searchConcept', 'Search concept...')}
                    items={conceptItems}
                    itemToString={(item) => (item ? item.display : '')}
                    selectedItem={selectedConceptItem as any}
                    onInputChange={(text) => setConceptQuery(text ?? '')}
                    onChange={(e) => {
                      const item = e.selectedItem as ConceptSummary | null;
                      if (!onChangeSelectedConditionConcept) return;
                      if (!item) onChangeSelectedConditionConcept(null);
                      else onChangeSelectedConditionConcept({ uuid: item.uuid, label: item.display });
                    }}
                    disabled={isEmpty}
                />

                {conceptLoading ? (
                    <div style={{ marginTop: '0.75rem' }}>
                      <InlineLoading description={t('searching', 'Searching...')} />
                    </div>
                ) : null}

                {conceptError ? (
                    <div style={{ marginTop: '0.75rem' }}>
                      <InlineNotification kind="error" lowContrast title={t('error', 'Error')} subtitle={conceptError} />
                    </div>
                ) : null}

                {selectedConceptItem ? (
                    <div className={styles.conceptSummary}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <strong>{selectedConceptItem.display}</strong>
                        <Tag size="sm" type="gray">
                          {selectedConceptItem.uuid}
                        </Tag>
                        {selectedConceptItem.conceptClass?.display ? (
                            <Tag size="sm" type="blue">
                              {selectedConceptItem.conceptClass.display}
                            </Tag>
                        ) : null}
                        {selectedConceptItem.datatype?.display ? (
                            <Tag size="sm" type="teal">
                              {selectedConceptItem.datatype.display}
                            </Tag>
                        ) : null}
                      </div>

                      {selectedConceptItem.mappings?.length ? (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.85 }}>
                            {t('mappings', 'Mappings')}: {selectedConceptItem.mappings.slice(0, 3).map((m) => m.display).filter(Boolean).join(' • ')}
                            {selectedConceptItem.mappings.length > 3 ? ' …' : ''}
                          </div>
                      ) : null}
                    </div>
                ) : null}
              </div>

              <div className={styles.apiActions}>
                <Button
                    size="sm"
                    kind="primary"
                    onClick={runPreview}
                    disabled={!previewIndicator || !selected?.id}
                >
                  {t('preview', 'Preview')}
                </Button>

                {previewLoading ? <InlineLoading description={t('running', 'Running...')} /> : null}
              </div>

              {previewError ? (
                  <div style={{ marginTop: '0.75rem' }}>
                    <InlineNotification kind="error" lowContrast title={t('previewFailed', 'Preview failed')} subtitle={previewError} />
                  </div>
              ) : null}

              {previewInfo ? (
                  <div className={styles.previewSummary}>
                    <div style={{ fontWeight: 600 }}>{t('previewResult', 'Preview result')}</div>
                    <div style={{ marginTop: '0.25rem' }}>
                      {t('rows', 'Rows')}: <strong>{previewInfo.rows}</strong>
                    </div>
                    {previewInfo.sample?.length ? (
                        <pre style={{ marginTop: '0.5rem', overflow: 'auto' }}>
                    {JSON.stringify(previewInfo.sample.slice(0, 5), null, 2)}
                  </pre>
                    ) : null}
                  </div>
              ) : null}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Tile>
  );
}
import React from 'react';
import { InlineNotification } from '@carbon/react';
import { useTranslation } from 'react-i18next';

import styles from './report-template-builder.scss';

import { buildDefaultTemplate, type IndicatorNode, type TemplateModel } from './sample-template';
import { toJsonTemplate, fromJsonTemplate } from './template-utils';

import Header from './components/header/header.component';
import BuilderHeaderActions from './components/header/builder-header-actions.component';

import TemplateStructurePanel, { type SelectedNode } from './components/template-structure-panel/template-structure-panel.component';
import JsonPreviewPanel from './components/JsonPreviewPanel/JsonPreviewPanel';
import IndicatorPropertiesPanel from './components/IndicatorPropertiesPanel/IndicatorPropertiesPanel';
import MappingPreviewPanel from './components/mapping-preview-panel/mapping-preview-panel.component';

type Selected = SelectedNode;

function findNode(nodes: IndicatorNode[], id: string): IndicatorNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

// helper: search across all groups (needed once we show full template later)
function findNodeInModel(model: TemplateModel, id: string): IndicatorNode | null {
  for (const g of model.mapping.groups) {
    const found = findNode(g.indicatorTree, id);
    if (found) return found;
  }
  return null;
}

const mappingCategoryOptions = ['Age <5, Male', 'Age <5, Female', '5-14, Male', '5-14, Female'].map((v) => ({
  id: v,
  text: v,
}));
const mappingAttrOptions = ['AttrCombo123', 'AttrCombo456', 'AttrCombo789'].map((v) => ({ id: v, text: v }));

const ReportTemplateBuilder: React.FC = () => {
  const { t } = useTranslation();

  // ✅ Draft model (Template Structure + Properties edits)
  const [modelDraft, setModelDraft] = React.useState<TemplateModel>(() => buildDefaultTemplate());

  // ✅ JSON draft (Ace editor edits)
  const [jsonDraftString, setJsonDraftString] = React.useState<string>(() => {
    const initial = toJsonTemplate(buildDefaultTemplate());
    return JSON.stringify(initial, null, 2);
  });

  const [selected, setSelected] = React.useState<Selected | null>(null);

  const [zerosMode, setZerosMode] = React.useState(true);

  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  // ---- Refresh Actions (explicit sync) ----

  // Template -> JSON
  const refreshJsonFromTemplate = React.useCallback(() => {
    try {
      const nextJson = toJsonTemplate(modelDraft);
      setJsonDraftString(JSON.stringify(nextJson, null, 2));
      setError(null);
      setInfo(t('jsonRefreshed', 'JSON Preview refreshed from Template Structure.'));
      setTimeout(() => setInfo(null), 1200);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to build JSON from template');
    }
  }, [modelDraft, t]);

  // JSON -> Template
  const refreshTemplateFromJson = React.useCallback(() => {
    try {
      const parsed = JSON.parse(jsonDraftString);
      const nextModel = fromJsonTemplate(parsed, buildDefaultTemplate());
      setModelDraft(nextModel);

      // clear selection if it no longer exists
      if (selected?.id) {
        const stillThere = findNodeInModel(nextModel, selected.id);
        if (!stillThere) setSelected(null);
      }

      setError(null);
      setInfo(t('templateRefreshed', 'Template Structure refreshed from JSON Preview.'));
      setTimeout(() => setInfo(null), 1200);
    } catch (e: any) {
      setError(e?.message ?? 'Invalid JSON or unsupported template format');
    }
  }, [jsonDraftString, selected?.id, t]);

  // ---- Selection ----
  const onSelectNode = (n: IndicatorNode) => {
    setSelected({
      id: n.id,
      label: n.label,
      code: n.code,
      hasChildren: Boolean(n.children?.length),
    });
  };

  // ---- Properties edits update modelDraft ----
  const onChangeSelectedLabel = (value: string) => {
    if (!selected) return;

    setSelected({ ...selected, label: value });

    setModelDraft((prev) => {
      const cloned = structuredClone(prev);
      const node = findNodeInModel(cloned, selected.id);
      if (node) node.label = value;
      return cloned;
    });
  };

  const onChangeSelectedCode = (value: string) => {
    if (!selected) return;

    setSelected({ ...selected, code: value });

    setModelDraft((prev) => {
      const cloned = structuredClone(prev);
      const node = findNodeInModel(cloned, selected.id);
      if (node) node.code = value;
      return cloned;
    });
  };

  return (
    <div className={styles.page}>
      {error ? (
        <InlineNotification
          kind="error"
          lowContrast
          title={t('error', 'Error')}
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
        />
      ) : null}

      {info ? (
        <InlineNotification
          kind="info"
          lowContrast
          title={t('info', 'Info')}
          subtitle={info}
          onCloseButtonClick={() => setInfo(null)}
        />
      ) : null}

      <Header title={t('schemaEditor', 'Schema editor')} />

      <div className={styles.header}>
        <div className={styles.headerTitle} />
        <BuilderHeaderActions onSave={() => {}} onPreview={() => {}} onExport={() => {}} />
      </div>

      <div className={styles.grid}>
        {/* Left column */}
        <div className={styles.leftCol}>
          <div className={styles.half}>
            <TemplateStructurePanel
              tree={modelDraft.mapping.groups[0].indicatorTree}
              selected={selected}
              onSelectNode={onSelectNode}
              onChangeTree={(updater) =>
                setModelDraft((prev) => {
                  const cloned = structuredClone(prev);
                  cloned.mapping.groups[0].indicatorTree = updater(cloned.mapping.groups[0].indicatorTree);
                  return cloned;
                })
              }
              onRefreshJson={refreshJsonFromTemplate} // ✅ new
            />
          </div>

          <div className={styles.half}>
            <JsonPreviewPanel
              jsonString={jsonDraftString}
              fileName="ugandaemr-report-template.json"
              readOnly={false} // ✅ editable
              onChangeJson={setJsonDraftString} // ✅ draft edit
              onRefreshTemplate={refreshTemplateFromJson} // ✅ new
            />
          </div>
        </div>

        {/* Right column */}
        <div className={styles.rightCol}>
          <IndicatorPropertiesPanel
            selected={selected}
            onChangeSelectedLabel={onChangeSelectedLabel}
            onChangeSelectedCode={onChangeSelectedCode}
            mappingCategoryOptions={mappingCategoryOptions}
            mappingAttrOptions={mappingAttrOptions}
            onRemoveOverride={() => {}}
          />

          <MappingPreviewPanel zerosMode={zerosMode} onToggleZerosMode={(v) => setZerosMode(v)} rowLabel={selected?.label} />
        </div>
      </div>
    </div>
  );
};

export default ReportTemplateBuilder;
/*
import React from 'react';
import { useTranslation } from 'react-i18next';

import styles from './report-template-builder.scss';

import { BuilderShell } from './components/BuilderShell/BuilderShell';
import { BuilderHeader } from './components/BuilderHeader/BuilderHeader';
import { TemplateTreePanel } from './components/TemplateTreePanel/TemplateTreePanel';
import { MappingPanel, type MappingOption } from './components/MappingPanel/MappingPanel';
import JsonPreviewPanel from './components/JsonPreviewPanel/JsonPreviewPanel';

import { buildDefaultTemplate, type IndicatorNode, type TemplateModel } from './sample-template';
import { toJsonTemplate } from './template-utils';

export default function ReportTemplateBuilder1() {
  const { t } = useTranslation();

  const [model, setModel] = React.useState<TemplateModel>(() => buildDefaultTemplate());
  const [selectedId, setSelectedId] = React.useState<string | undefined>(undefined);
  const [copied, setCopied] = React.useState(false);

  // You likely already have these options. Replace with your real sources.
  const categoryOptions: MappingOption[] = React.useMemo(
    () => [
      { id: 'default', text: 'Default' },
      { id: 'catopt1', text: 'Category Option 1' },
    ],
    [],
  );

  const attributeOptions: MappingOption[] = React.useMemo(
    () => [
      { id: 'default', text: 'Default' },
      { id: 'attopt1', text: 'Attribute Option 1' },
    ],
    [],
  );

  const [selectedCategoryOption, setSelectedCategoryOption] = React.useState<MappingOption>(categoryOptions[0]);
  const [selectedAttributeOption, setSelectedAttributeOption] = React.useState<MappingOption>(attributeOptions[0]);

  // Convert model → JSON object
  const templateJson = React.useMemo(() => toJsonTemplate(model), [model]);

  // Convert JSON object → pretty string (fixes your clipboard/TextArea type errors)
  const jsonString = React.useMemo(() => JSON.stringify(templateJson, null, 2), [templateJson]);

  const onSelectNode = (id: string) => setSelectedId(id);

  const onCopyJson = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const onDownloadJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'report-template.json';
    a.click();

    URL.revokeObjectURL(url);
  };

  const onReset = () => {
    setModel(buildDefaultTemplate());
    setSelectedId(undefined);
  };

  // Pick your tree source (you were using groups[0] in your earlier file)
  const tree: IndicatorNode[] = model.mapping.groups?.[0]?.indicatorTree ?? [];

  // Optional: show selected node label (simple lookup)
  const selectedNodeLabel = React.useMemo(() => {
    if (!selectedId) return undefined;

    function find(nodes: any[]): any | undefined {
      for (const n of nodes) {
        if (n.id === selectedId) return n;
        if (n.children?.length) {
          const found = find(n.children);
          if (found) return found;
        }
      }
      return undefined;
    }

    const found = find(tree as any[]);
    return found?.label ?? selectedId;
  }, [selectedId, tree]);

  return (
    <div className={styles.container}>
      <BuilderShell
        header={
          <BuilderHeader
            title={t('reportTemplateBuilder', 'Report Template Builder')}
            onCopyJson={onCopyJson}
            onDownloadJson={onDownloadJson}
            onReset={onReset}
            copied={copied}
          />
        }
        left={
          <TemplateTreePanel
            title={t('templateStructure', 'Template Structure')}
            tree={tree}
            selectedId={selectedId}
            onSelect={onSelectNode}
          />
        }
        rightTop={
          <MappingPanel
            title={t('mapping', 'Mapping')}
            categoryOptions={categoryOptions}
            attributeOptions={attributeOptions}
            selectedCategoryOption={selectedCategoryOption}
            selectedAttributeOption={selectedAttributeOption}
            onChangeCategoryOption={setSelectedCategoryOption}
            onChangeAttributeOption={setSelectedAttributeOption}
            selectedNodeLabel={selectedNodeLabel}
          />
        }
        rightBottom={
          <JsonPreviewPanel
            title={t('jsonPreview', 'JSON Preview')}
            jsonString={jsonString}
            onCopy={onCopyJson}
            onDownload={onDownloadJson}
            copied={copied}
          />
        }
      />
    </div>
  );
}*/

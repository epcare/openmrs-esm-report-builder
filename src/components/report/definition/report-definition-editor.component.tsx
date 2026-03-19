
import React from 'react';
import { InlineLoading, InlineNotification } from '@carbon/react';
import { useTranslation } from 'react-i18next';

import styles from '../../../routes/report-builder.scss';

import ReportStructurePanel from './panels/report-structure-panel.component';
import SelectionPanel from './panels/selection-panel.component';
import PropertiesPanel from './panels/properties-panel.component';

import { parseSectionLibraryItem, sortReportSections, type ReportDefinitionDraft, type ReportSectionRef, type SectionLibraryItem } from './report-definition.types';
import { listSections } from '../../../resources/report-section/report-sections.api';

type Props = {
  value: ReportDefinitionDraft;
  onChange: (next: ReportDefinitionDraft) => void;
};

const ReportDefinitionEditor: React.FC<Props> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [sectionLibrary, setSectionLibrary] = React.useState<SectionLibraryItem[]>([]);
  const [sectionsLoading, setSectionsLoading] = React.useState(false);
  const [sectionsError, setSectionsError] = React.useState<string | null>(null);
  const [structureSearch, setStructureSearch] = React.useState('');
  const [selectionSearch, setSelectionSearch] = React.useState('');
  const [selectedReportSectionUuid, setSelectedReportSectionUuid] = React.useState<string | null>(null);
  const [selectedAvailableSectionUuid, setSelectedAvailableSectionUuid] = React.useState<string | null>(null);

  React.useEffect(() => {
    const ac = new AbortController();
    setSectionsLoading(true);
    setSectionsError(null);
    listSections({ v: 'full', includeRetired: false }, ac.signal)
      .then((rows) => setSectionLibrary(rows.filter((x) => !x.retired).map(parseSectionLibraryItem)))
      .catch((e: any) => setSectionsError(e?.message ?? 'Failed to load sections'))
      .finally(() => setSectionsLoading(false));
    return () => ac.abort();
  }, []);

  const draft = value;
  const updateDraft = React.useCallback((patch: Partial<ReportDefinitionDraft>) => onChange({ ...draft, ...patch }), [draft, onChange]);
  const selectedSectionRef = React.useMemo(() => draft.sections.find((s) => s.sectionUuid === selectedReportSectionUuid) ?? null, [draft.sections, selectedReportSectionUuid]);
  const selectedSection = React.useMemo(() => sectionLibrary.find((s) => s.uuid === selectedReportSectionUuid) ?? null, [sectionLibrary, selectedReportSectionUuid]);

  const addSectionToDraft = React.useCallback((sectionUuid: string) => {
    if (draft.sections.some((s) => s.sectionUuid === sectionUuid)) { setSelectedReportSectionUuid(sectionUuid); return; }
    const nextRef: ReportSectionRef = { sectionUuid, sortOrder: draft.sections.length + 1, enabled: true, titleOverride: '' };
    onChange({ ...draft, sections: [...draft.sections, nextRef] });
    setSelectedReportSectionUuid(sectionUuid);
  }, [draft, onChange]);

  const removeSectionFromDraft = React.useCallback((sectionUuid: string) => {
    const kept = draft.sections.filter((s) => s.sectionUuid !== sectionUuid);
    onChange({ ...draft, sections: kept.map((s, idx) => ({ ...s, sortOrder: idx + 1 })) });
    if (selectedReportSectionUuid === sectionUuid) setSelectedReportSectionUuid(null);
    if (selectedAvailableSectionUuid === sectionUuid) setSelectedAvailableSectionUuid(null);
  }, [draft, onChange, selectedReportSectionUuid, selectedAvailableSectionUuid]);

  const toggleSectionInDraft = React.useCallback((sectionUuid: string, checked: boolean) => checked ? addSectionToDraft(sectionUuid) : removeSectionFromDraft(sectionUuid), [addSectionToDraft, removeSectionFromDraft]);
  const moveSection = React.useCallback((sectionUuid: string, dir: -1 | 1) => {
    const list = sortReportSections(draft.sections);
    const idx = list.findIndex((x) => x.sectionUuid === sectionUuid);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const tmp = list[idx]; list[idx] = list[j]; list[j] = tmp;
    onChange({ ...draft, sections: list.map((x, k) => ({ ...x, sortOrder: k + 1 })) });
  }, [draft, onChange]);

  const updateSelectedSectionRef = React.useCallback((patch: Partial<ReportSectionRef>) => {
    if (!selectedReportSectionUuid) return;
    onChange({ ...draft, sections: draft.sections.map((s) => s.sectionUuid === selectedReportSectionUuid ? { ...s, ...patch } : s) });
  }, [draft, onChange, selectedReportSectionUuid]);

  const chosenSections = React.useMemo(() => sortReportSections(draft.sections), [draft.sections]);

  return (
    <div className={styles.designWorkspace}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 className={styles.workspaceTitle}>{t('buildReport', 'Build Report')}: {draft.name || 'Untitled report'}</h3>
        <p className={styles.workspaceHint}>{t('draftHint', 'Draft • Define reports as collections of reusable sections')}</p>
      </div>
      {sectionsLoading ? <InlineLoading description="Loading sections…" /> : null}
      {sectionsError ? <div style={{ marginBottom: '1rem' }}><InlineNotification kind="error" lowContrast title="Sections" subtitle={sectionsError} /></div> : null}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 0.9fr', gap: '1rem' }}>
        <ReportStructurePanel reportSections={chosenSections} sectionLibrary={sectionLibrary} selectedSectionUuid={selectedReportSectionUuid} search={structureSearch} onSearchChange={setStructureSearch} onSelectSection={setSelectedReportSectionUuid} onMoveSection={moveSection} onRemoveSection={removeSectionFromDraft} onFocusAvailableSections={() => { if (sectionLibrary.length > 0) setSelectedAvailableSectionUuid((prev) => prev ?? sectionLibrary[0].uuid); }} />
        <SelectionPanel availableSections={sectionLibrary} reportSections={chosenSections} selectedAvailableSectionUuid={selectedAvailableSectionUuid} search={selectionSearch} onSearchChange={setSelectionSearch} onSelectAvailableSection={setSelectedAvailableSectionUuid} onToggleSection={toggleSectionInDraft} />
        <PropertiesPanel draft={draft} onDraftChange={updateDraft} selectedSectionRef={selectedSectionRef} selectedSection={selectedSection} onUpdateSelectedSection={updateSelectedSectionRef} />
      </div>
      <div style={{ marginTop: '1rem', padding: '0.9rem 1rem', background: '#fff', border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Current Authoring Draft</div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.85rem' }}>{JSON.stringify(draft, null, 2)}</pre>
      </div>
    </div>
  );
};

export default ReportDefinitionEditor;

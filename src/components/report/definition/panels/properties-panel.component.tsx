
import React from 'react';
import { Button, TextArea, TextInput, Toggle, Tag } from '@carbon/react';
import { Close } from '@carbon/icons-react';

import ReportPanelShell from '../../panels/report-panel-shell.component';
import type { ReportDefinitionDraft, ReportSectionRef, SectionLibraryItem } from '../report-definition.types';

type Props = {
  draft: ReportDefinitionDraft;
  onDraftChange: (patch: Partial<ReportDefinitionDraft>) => void;
  selectedSectionRef: ReportSectionRef | null;
  selectedSection: SectionLibraryItem | null;
  onUpdateSelectedSection: (patch: Partial<ReportSectionRef>) => void;
};

const PropertiesPanel: React.FC<Props> = ({ draft, onDraftChange, selectedSectionRef, selectedSection, onUpdateSelectedSection }) => {
  return (
    <ReportPanelShell title="Properties" right={<button type="button" aria-label="close properties" style={{ border: 0, background: 'transparent', cursor: 'pointer' }} onClick={() => undefined}><Close size={18} /></button>} bottom={<><Button size="sm" kind="secondary">Cancel</Button><Button size="sm" kind="primary">Save Draft</Button></>}>
      <div style={{ fontSize: '1rem', fontWeight: 600 }}>Report Details</div>
      <TextInput id="report-definition-name" labelText="Report Name" value={draft.name} onChange={(e) => onDraftChange({ name: (e.target as HTMLInputElement).value })} />
      <TextInput id="report-definition-code" labelText="Report Code" value={draft.code} onChange={(e) => onDraftChange({ code: (e.target as HTMLInputElement).value })} />
      <TextArea id="report-definition-description" labelText="Description" value={draft.description} onChange={(e) => onDraftChange({ description: (e.target as HTMLTextAreaElement).value })} />
      <div style={{ borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)', marginTop: '0.5rem', paddingTop: '1rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Selected Section</div>
        {!selectedSectionRef || !selectedSection ? <div style={{ opacity: 0.75 }}>Select a section from the report structure to edit section-level properties.</div> : <>
          <div style={{ fontWeight: 600 }}>{selectedSection.name}</div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem', marginBottom: '0.75rem' }}><Tag size="sm" type="gray">{selectedSection.indicatorCount} indicators</Tag>{selectedSection.disaggregationEnabled ? <Tag size="sm" type="blue">{selectedSection.ageCategoryCode ?? 'Disaggregated'}</Tag> : <Tag size="sm" type="warm-gray">No disaggregation</Tag>}</div>
          <TextInput id="selected-section-title-override" labelText="Title Override (optional)" value={selectedSectionRef.titleOverride ?? ''} onChange={(e) => onUpdateSelectedSection({ titleOverride: (e.target as HTMLInputElement).value })} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.5rem' }}><div style={{ fontWeight: 600 }}>Enabled in this report</div><Toggle id="selected-section-enabled" labelText="" toggled={selectedSectionRef.enabled} onToggle={(enabled) => onUpdateSelectedSection({ enabled })} /></div>
          {selectedSection.description ? <div style={{ marginTop: '0.75rem', opacity: 0.8 }}>{selectedSection.description}</div> : null}
        </>}
      </div>
    </ReportPanelShell>
  );
};

export default PropertiesPanel;

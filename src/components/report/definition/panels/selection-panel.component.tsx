
import React from 'react';
import { Button, Search, Tag, Checkbox } from '@carbon/react';
import { Add, Folder } from '@carbon/icons-react';

import ReportPanelShell from '../../panels/report-panel-shell.component';
import type { ReportSectionRef, SectionLibraryItem } from '../report-definition.types';

type Props = {
  availableSections: SectionLibraryItem[];
  reportSections: ReportSectionRef[];
  selectedAvailableSectionUuid: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  onSelectAvailableSection: (sectionUuid: string) => void;
  onToggleSection: (sectionUuid: string, checked: boolean) => void;
};

const SelectionPanel: React.FC<Props> = ({ availableSections, reportSections, selectedAvailableSectionUuid, search, onSearchChange, onSelectAvailableSection, onToggleSection }) => {
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableSections;
    return availableSections.filter((s) => s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q) || (s.code ?? '').toLowerCase().includes(q));
  }, [availableSections, search]);

  const isIncluded = (sectionUuid: string) => reportSections.some((x) => x.sectionUuid === sectionUuid);

  return (
    <ReportPanelShell title="Available Sections" bottom={<><span style={{ opacity: 0.75 }}>Select sections to include in this report.</span><Button size="sm" kind="secondary" renderIcon={Add} disabled>Sections are added directly</Button></>}>
      <Search size="lg" labelText="Search sections" placeholder="Search sections" value={search} onChange={(e) => onSearchChange((e.target as HTMLInputElement).value)} />
      <div style={{ border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 10, overflow: 'hidden' }}>
        {filtered.length === 0 ? <div style={{ padding: '0.9rem', opacity: 0.75 }}>No sections found.</div> : filtered.map((section) => {
          const checked = isIncluded(section.uuid);
          return (
            <div key={section.uuid} role="button" tabIndex={0} onClick={() => onSelectAvailableSection(section.uuid)} onKeyDown={(e) => e.key === 'Enter' && onSelectAvailableSection(section.uuid)} style={{ padding: '0.85rem 0.9rem', borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)', background: selectedAvailableSectionUuid === section.uuid ? 'rgba(0,0,0,0.03)' : '#fff', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', minWidth: 0 }}>
                  <Checkbox id={`available-section-${section.uuid}`} checked={checked} labelText="" onChange={(arg1: any, arg2: any) => {
                    const nextChecked = typeof arg1 === 'boolean' ? arg1 : typeof arg2?.checked === 'boolean' ? arg2.checked : Boolean(arg1?.target?.checked);
                    onToggleSection(section.uuid, nextChecked);
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}><Folder size={16} /><div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{section.name}</div></div>
                    {section.description ? <div style={{ marginTop: 6, opacity: 0.8 }}>{section.description}</div> : null}
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: 6, flexWrap: 'wrap' }}><Tag size="sm" type="gray">{section.indicatorCount} indicators</Tag>{section.disaggregationEnabled ? <Tag size="sm" type="blue">{section.ageCategoryCode ?? 'Disaggregated'}</Tag> : <Tag size="sm" type="warm-gray">No disaggregation</Tag>}</div>
                  </div>
                </div>
                {section.code ? <Tag size="sm" type="cool-gray">{section.code}</Tag> : null}
              </div>
            </div>
          );
        })}
      </div>
    </ReportPanelShell>
  );
};

export default SelectionPanel;

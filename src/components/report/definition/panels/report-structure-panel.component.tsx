
import React from 'react';
import { Button, Search, Tag, OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { Add, Folder, ArrowUp, ArrowDown, TrashCan } from '@carbon/icons-react';

import ReportPanelShell from '../../panels/report-panel-shell.component';
import type { ReportSectionRef, SectionLibraryItem } from '../report-definition.types';

type Props = {
  reportSections: ReportSectionRef[];
  sectionLibrary: SectionLibraryItem[];
  selectedSectionUuid: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  onSelectSection: (sectionUuid: string) => void;
  onMoveSection: (sectionUuid: string, dir: -1 | 1) => void;
  onRemoveSection: (sectionUuid: string) => void;
  onFocusAvailableSections: () => void;
};

const ReportStructurePanel: React.FC<Props> = ({ reportSections, sectionLibrary, selectedSectionUuid, search, onSearchChange, onSelectSection, onMoveSection, onRemoveSection, onFocusAvailableSections }) => {
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...reportSections].sort((a, b) => a.sortOrder - b.sortOrder);
    if (!q) return sorted;
    return sorted.filter((ref) => {
      const section = sectionLibrary.find((s) => s.uuid === ref.sectionUuid);
      return section && (section.name.toLowerCase().includes(q) || (section.description ?? '').toLowerCase().includes(q) || (section.code ?? '').toLowerCase().includes(q));
    });
  }, [reportSections, sectionLibrary, search]);

  return (
    <ReportPanelShell title="Report Structure" right={<OverflowMenu size="sm" aria-label="report structure actions"><OverflowMenuItem itemText="Browse sections" onClick={onFocusAvailableSections} /></OverflowMenu>} bottom={<><span /><Button size="sm" kind="primary" renderIcon={Add} onClick={onFocusAvailableSections}>Add Section</Button></>}>
      <Search size="lg" labelText="Search selected sections" placeholder="Search selected sections" value={search} onChange={(e) => onSearchChange((e.target as HTMLInputElement).value)} />
      <div style={{ border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 10, overflow: 'hidden' }}>
        {filtered.length === 0 ? <div style={{ padding: '0.9rem', opacity: 0.75 }}>No sections selected yet.</div> : filtered.map((ref, idx) => {
          const section = sectionLibrary.find((s) => s.uuid === ref.sectionUuid);
          if (!section) return null;
          return (
            <div key={ref.sectionUuid} role="button" tabIndex={0} onClick={() => onSelectSection(ref.sectionUuid)} onKeyDown={(e) => e.key === 'Enter' && onSelectSection(ref.sectionUuid)} style={{ padding: '0.85rem 0.9rem', borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)', background: selectedSectionUuid === ref.sectionUuid ? 'rgba(0,0,0,0.03)' : '#fff', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}><Folder size={16} /><div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ref.titleOverride?.trim() ? ref.titleOverride : section.name}</div>{!ref.enabled ? <Tag size="sm" type="red">Disabled</Tag> : null}</div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: 6, flexWrap: 'wrap' }}><Tag size="sm" type="gray">{section.indicatorCount} indicators</Tag>{section.disaggregationEnabled ? <Tag size="sm" type="blue">{section.ageCategoryCode ?? 'Disaggregated'}</Tag> : <Tag size="sm" type="warm-gray">No disaggregation</Tag>}</div>
                  {section.description ? <div style={{ marginTop: 6, opacity: 0.8 }}>{section.description}</div> : null}
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <Button kind="ghost" size="sm" hasIconOnly iconDescription="Move up" renderIcon={ArrowUp} disabled={idx === 0} onClick={(e) => { e.stopPropagation(); onMoveSection(ref.sectionUuid, -1); }} />
                  <Button kind="ghost" size="sm" hasIconOnly iconDescription="Move down" renderIcon={ArrowDown} disabled={idx === filtered.length - 1} onClick={(e) => { e.stopPropagation(); onMoveSection(ref.sectionUuid, 1); }} />
                  <Button kind="ghost" size="sm" hasIconOnly iconDescription="Remove" renderIcon={TrashCan} onClick={(e) => { e.stopPropagation(); onRemoveSection(ref.sectionUuid); }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ReportPanelShell>
  );
};

export default ReportStructurePanel;

import React from 'react';
import { Button, OverflowMenu, OverflowMenuItem, Search, Tag, Checkbox } from '@carbon/react';
import { Add, ChevronDown, ChevronRight, Folder, Document } from '@carbon/icons-react';

import ReportPanelShell from './report-panel-shell.component';
import ReportTreeRow from './report-tree-row.component';
import type { Indicator, Section } from './report-definition.types';

type Props = {
    sections: Section[];
    standaloneIndicators: Indicator[];
    selectedSectionId: string;
    expanded: Record<string, boolean>;
    leftSearch: string;
    onLeftSearchChange: (v: string) => void;
    onSelectSection: (id: string) => void;
    onToggleExpand: (id: string) => void;
    onCollapseAll: () => void;
    onExpandAll: () => void;
    onAddSection: () => void;
    onAddStandalone: () => void;
};

const ReportStructurePanel: React.FC<Props> = ({
                                                   sections,
                                                   standaloneIndicators,
                                                   selectedSectionId,
                                                   expanded,
                                                   leftSearch,
                                                   onLeftSearchChange,
                                                   onSelectSection,
                                                   onToggleExpand,
                                                   onCollapseAll,
                                                   onExpandAll,
                                                   onAddSection,
                                                   onAddStandalone,
                                               }) => {
    return (
        <ReportPanelShell
            title="Report Structure"
            right={
                <OverflowMenu size="sm" aria-label="report structure menu">
                    <OverflowMenuItem itemText="Collapse all" onClick={onCollapseAll} />
                    <OverflowMenuItem itemText="Expand all" onClick={onExpandAll} />
                </OverflowMenu>
            }
            bottom={
                <>
                    <Button size="sm" kind="secondary" renderIcon={Add} onClick={onAddSection}>
                        Add Section
                    </Button>
                    <Button size="sm" kind="secondary" renderIcon={Add} onClick={onAddStandalone}>
                        Add Standalone Indicator
                    </Button>
                </>
            }
        >
            <Search
                size="lg"
                labelText="Search"
                placeholder="Search"
                value={leftSearch}
                onChange={(e) => onLeftSearchChange((e.target as HTMLInputElement).value)}
            />

            <div style={{ border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 10, padding: '0.5rem' }}>
                {sections.map((s) => {
                    const isExpanded = !!expanded[s.id];
                    const isSelected = selectedSectionId === s.id;
                    const hasChildren = s.indicators.length > 0;

                    return (
                        <div key={s.id}>
                            <ReportTreeRow
                                selected={isSelected}
                                onClick={() => onSelectSection(s.id)}
                                leftIcon={
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        {hasChildren ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleExpand(s.id);
                                                }}
                                                style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer' }}
                                                aria-label={isExpanded ? 'collapse' : 'expand'}
                                            >
                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </button>
                                        ) : (
                                            <span style={{ width: 16, display: 'inline-block' }} />
                                        )}
                                        <Folder size={16} />
                                    </div>
                                }
                                label={s.name}
                                right={
                                    s.id !== 'sec-root' ? (
                                        <Tag size="sm" type="gray">
                                            {s.indicators.length}
                                        </Tag>
                                    ) : null
                                }
                            />

                            {hasChildren && isExpanded ? (
                                <div style={{ marginTop: 2, marginBottom: 6 }}>
                                    {s.indicators.map((ind) => (
                                        <ReportTreeRow
                                            key={ind.id}
                                            level={1}
                                            onClick={() => onSelectSection(s.id)}
                                            leftIcon={<Checkbox id={`${s.id}-${ind.id}`} checked readOnly labelText="" />}
                                            label={ind.name}
                                            right={
                                                <Tag size="sm" type="blue">
                                                    {ind.kind === 'base' ? 'Base' : 'Final'}
                                                </Tag>
                                            }
                                        />
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    );
                })}

                <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)', paddingTop: '0.5rem' }}>
                    <ReportTreeRow leftIcon={<ChevronDown size={16} />} label="Standalone Indicators" />
                    {standaloneIndicators.map((i) => (
                        <ReportTreeRow
                            key={i.id}
                            level={1}
                            leftIcon={<Document size={16} />}
                            label={i.name}
                            right={
                                <Tag size="sm" type="blue">
                                    {i.kind === 'base' ? 'Base' : 'Final'}
                                </Tag>
                            }
                        />
                    ))}
                </div>
            </div>
        </ReportPanelShell>
    );
};

export default ReportStructurePanel;
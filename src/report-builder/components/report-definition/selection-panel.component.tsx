import React from 'react';
import {Button, Checkbox, Search, Tab, TabList, TabPanel, TabPanels, Tabs, Tag} from '@carbon/react';
import {Add, Folder} from '@carbon/icons-react';

import ReportPanelShell from './report-panel-shell.component';
import type {Indicator, Section} from './report-definition.types';

type Props = {
    activeTab: 'sections' | 'finalIndicators';
    onTabChange: (v: 'sections' | 'finalIndicators') => void;
    midSearch: string;
    onMidSearchChange: (v: string) => void;

    sections: Section[];
    finalIndicators: Indicator[];
    selectedSection: Section | null;

    onSelectSection: (id: string) => void;
    onToggleFinalIndicator: (i: Indicator) => void;
    onAddSections: () => void;
};

const SelectionPanel: React.FC<Props> = ({
                                             activeTab,
                                             onTabChange,
                                             midSearch,
                                             onMidSearchChange,
                                             sections,
                                             finalIndicators,
                                             selectedSection,
                                             onSelectSection,
                                             onToggleFinalIndicator,
                                             onAddSections,
                                         }) => {
    const selectedIndex = activeTab === 'sections' ? 0 : 1;

    return (
        <ReportPanelShell
            title={
                <Tabs selectedIndex={selectedIndex}
                      onChange={({selectedIndex}) => onTabChange(selectedIndex === 0 ? 'sections' : 'finalIndicators')}>
                    <TabList aria-label="select tabs">
                        <Tab>Select Sections</Tab>
                        <Tab>Select Final Indicators</Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel/>
                        <TabPanel/>
                    </TabPanels>
                </Tabs>
            }
            bottom={
                <>
                    <span/>
                    <Button size="sm" kind="primary" renderIcon={Add} onClick={onAddSections}>
                        Add Sections
                    </Button>
                </>
            }
        >
            <Search
                size="lg"
                labelText="Search"
                placeholder="Search"
                value={midSearch}
                onChange={(e) => onMidSearchChange((e.target as HTMLInputElement).value)}
            />

            {activeTab === 'sections' ? (
                <div style={{
                    border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                    borderRadius: 10,
                    overflow: 'hidden'
                }}>
                    {sections.map((s) => (
                        <div
                            key={s.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectSection(s.id)}
                            onKeyDown={(e) => e.key === 'Enter' && onSelectSection(s.id)}
                            style={{
                                padding: '0.75rem 0.9rem',
                                borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)',
                                background: selectedSection?.id === s.id ? 'rgba(0,0,0,0.03)' : '#fff',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{display: 'flex', justifyContent: 'space-between', gap: '0.75rem'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0}}>
                                    <Folder size={16}/>
                                    <div style={{
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {s.name}
                                    </div>
                                </div>
                                <Tag size="sm" type="gray">
                                    {s.indicators.length}
                                </Tag>
                            </div>
                            {s.description ? <div style={{opacity: 0.8, marginTop: 4}}>{s.description}</div> : null}
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{
                    border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                    borderRadius: 10,
                    overflow: 'hidden'
                }}>
                    {finalIndicators.map((i) => {
                        const checked = selectedSection?.indicators.some((x) => x.id === i.id) ?? false;

                        return (
                            <div
                                key={i.id}
                                style={{
                                    padding: '0.75rem 0.9rem',
                                    borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    gap: '0.75rem',
                                }}
                            >
                                <div style={{display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0}}>
                                    <Checkbox
                                        id={`mid-final-${i.id}`}
                                        checked={checked}
                                        labelText=""
                                        onChange={() => onToggleFinalIndicator(i)}
                                    />
                                    <div style={{minWidth: 0}}>
                                        <div style={{
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {i.name}
                                        </div>
                                        <div style={{opacity: 0.75, fontSize: '0.875rem'}}>{i.code}</div>
                                    </div>
                                </div>

                                <Tag size="sm" type="blue">
                                    Final
                                </Tag>
                            </div>
                        );
                    })}
                </div>
            )}
        </ReportPanelShell>
    );
};

export default SelectionPanel;
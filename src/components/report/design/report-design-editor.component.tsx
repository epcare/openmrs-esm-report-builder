import React from 'react';
import {
    Button,
    InlineNotification,
    Tabs,
    TabList,
    Tab,
    TextInput,
    NumberInput,
    Select,
    SelectItem,
    Checkbox,
    Tag,
} from '@carbon/react';
import {
    Add,
    ArrowUp,
    ArrowDown,
    TrashCan,
    Draggable,
    ArrowRight,
    ArrowLeft,
    Renew,
    View,
    Download,
    Copy,
    Launch,
} from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';

import styles from '../../../routes/report-builder.scss';

import type { ReportDefinitionDraft } from '../definition/report-definition.types';
import type { DesignGroup, DesignRow, ReportDesignDraft } from './report-design.types';
import {
    createEmptyDesignRow,
    createEmptyReportDesignDraft,
} from './report-design.utils';

export type DesignSectionSource = {
    sectionUuid: string;
    title: string;
    indicators: Array<{
        id: string;
        code: string;
        name: string;
        type: string;
    }>;
};

type Props = {
    value?: ReportDesignDraft | null;
    onChange?: (next: ReportDesignDraft) => void;
    definitionDraft?: ReportDefinitionDraft | null;
    sectionSources?: DesignSectionSource[];
    sectionNameLookup?: Record<string, string>;
};

type DragState = {
    rowId: string;
    fromGroupId: string;
} | null;

const MAX_INDENT = 10;

function buildDesignFromSectionSources(
    sectionSources: DesignSectionSource[] = [],
    previous?: ReportDesignDraft | null,
): ReportDesignDraft {
    return {
        version: 1,
        template: 'section-tabular',
        arrayName: previous?.arrayName ?? 'results',
        defaultValue: previous?.defaultValue ?? 0,
        dimensions: previous?.dimensions ?? {},
        groups: sectionSources.map((section) => ({
            id: section.sectionUuid,
            title: section.title,
            rows: section.indicators.map((i) => ({
                id: i.id,
                type: 'indicator',
                code: i.code,
                label: `${i.code}. ${i.name}`,
                indent: 0,
                keyPattern: '{code}_{age}_{sex}',
                dims: {},
                showTotal: true,
                showDisaggregation: true,
            })),
        })),
    };
}

function buildMappingPreview(group?: DesignGroup | null, rows?: DesignRow[]) {
    const activeRows = rows ?? group?.rows ?? [];
    const visible = activeRows.filter((r) => r.type !== 'spacer');

    const columns = ['Age <5 | Male', 'Age <5 | Female', '5-14 | Male', '5-14 | Female'];

    return {
        columns,
        rows: visible.slice(0, 8).map((r) => ({
            id: r.id,
            label: r.label || r.code || 'Untitled row',
            values: columns.map(() => 0),
            indent: r.indent ?? 0,
        })),
    };
}

const ReportDesignEditor: React.FC<Props> = ({
                                                 value,
                                                 onChange,
                                                 definitionDraft,
                                                 sectionSources = [],
                                             }) => {
    const { t } = useTranslation();

    const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);
    const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null);
    const [dragState, setDragState] = React.useState<DragState>(null);
    const [dragOverRowId, setDragOverRowId] = React.useState<string | null>(null);
    const [propTab, setPropTab] = React.useState<'details' | 'disaggregation' | 'mapping' | 'api'>('details');

    const draft = React.useMemo<ReportDesignDraft>(
        () => value ?? createEmptyReportDesignDraft(),
        [value],
    );

    const setDraft = React.useCallback(
        (next: ReportDesignDraft) => {
            onChange?.(next);
        },
        [onChange],
    );

    const groups = draft.groups ?? [];

    React.useEffect(() => {
        if (!selectedGroupId && groups.length > 0) {
            setSelectedGroupId(groups[0].id);
        }
    }, [groups, selectedGroupId]);

    const selectedGroup = React.useMemo(
        () => groups.find((g) => g.id === selectedGroupId) ?? null,
        [groups, selectedGroupId],
    );

    const selectedRow = React.useMemo(
        () => selectedGroup?.rows.find((r) => r.id === selectedRowId) ?? null,
        [selectedGroup, selectedRowId],
    );

    const updateGroups = React.useCallback(
        (nextGroups: DesignGroup[]) => {
            setDraft({
                ...draft,
                groups: nextGroups,
            });
        },
        [draft, setDraft],
    );

    const updateGroup = React.useCallback(
        (groupId: string, patch: Partial<DesignGroup>) => {
            updateGroups(groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)));
        },
        [groups, updateGroups],
    );

    const addRow = React.useCallback(() => {
        if (!selectedGroup) return;

        const row = createEmptyDesignRow();
        updateGroups(
            groups.map((g) =>
                g.id === selectedGroup.id
                    ? { ...g, rows: [...g.rows, row] }
                    : g,
            ),
        );
        setSelectedRowId(row.id);
    }, [groups, selectedGroup, updateGroups]);

    const removeRow = React.useCallback(
        (rowId: string) => {
            if (!selectedGroup) return;

            updateGroups(
                groups.map((g) =>
                    g.id === selectedGroup.id
                        ? { ...g, rows: g.rows.filter((r) => r.id !== rowId) }
                        : g,
                ),
            );

            if (selectedRowId === rowId) {
                setSelectedRowId(null);
            }
        },
        [groups, selectedGroup, selectedRowId, updateGroups],
    );

    const moveRow = React.useCallback(
        (rowId: string, dir: -1 | 1) => {
            if (!selectedGroup) return;

            const rows = selectedGroup.rows.slice();
            const idx = rows.findIndex((r) => r.id === rowId);
            if (idx < 0) return;

            const j = idx + dir;
            if (j < 0 || j >= rows.length) return;

            const tmp = rows[idx];
            rows[idx] = rows[j];
            rows[j] = tmp;

            updateGroups(
                groups.map((g) =>
                    g.id === selectedGroup.id
                        ? { ...g, rows }
                        : g,
                ),
            );
        },
        [groups, selectedGroup, updateGroups],
    );

    const updateRow = React.useCallback(
        (rowId: string, patch: Partial<DesignRow>) => {
            if (!selectedGroup) return;

            updateGroups(
                groups.map((g) =>
                    g.id === selectedGroup.id
                        ? {
                            ...g,
                            rows: g.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
                        }
                        : g,
                ),
            );
        },
        [groups, selectedGroup, updateGroups],
    );

    const indentRow = React.useCallback(
        (rowId: string, dir: -1 | 1) => {
            if (!selectedGroup) return;

            const row = selectedGroup.rows.find((r) => r.id === rowId);
            if (!row) return;

            const nextIndent = Math.max(0, Math.min(MAX_INDENT, (row.indent ?? 0) + dir));
            updateRow(rowId, { indent: nextIndent });
        },
        [selectedGroup, updateRow],
    );

    const generateFromDefinition = React.useCallback(() => {
        const next = buildDesignFromSectionSources(sectionSources, draft);
        setDraft(next);
        setSelectedGroupId(next.groups[0]?.id ?? null);
        setSelectedRowId(next.groups[0]?.rows[0]?.id ?? null);
    }, [draft, sectionSources, setDraft]);

    const handleDragStart = React.useCallback((rowId: string, fromGroupId: string) => {
        setDragState({ rowId, fromGroupId });
    }, []);

    const handleDropOnRow = React.useCallback(
        (targetRowId: string) => {
            if (!selectedGroup || !dragState) return;
            if (dragState.fromGroupId !== selectedGroup.id) return;
            if (dragState.rowId === targetRowId) return;

            const rows = selectedGroup.rows.slice();
            const fromIdx = rows.findIndex((r) => r.id === dragState.rowId);
            const toIdx = rows.findIndex((r) => r.id === targetRowId);

            if (fromIdx < 0 || toIdx < 0) return;

            const moving = rows[fromIdx];
            rows.splice(fromIdx, 1);
            rows.splice(toIdx, 0, moving);

            updateGroups(
                groups.map((g) =>
                    g.id === selectedGroup.id
                        ? { ...g, rows }
                        : g,
                ),
            );

            setDragState(null);
            setDragOverRowId(null);
        },
        [dragState, groups, selectedGroup, updateGroups],
    );

    const handleDropAtEnd = React.useCallback(() => {
        if (!selectedGroup || !dragState) return;
        if (dragState.fromGroupId !== selectedGroup.id) return;

        const rows = selectedGroup.rows.slice();
        const fromIdx = rows.findIndex((r) => r.id === dragState.rowId);
        if (fromIdx < 0) return;

        const moving = rows[fromIdx];
        rows.splice(fromIdx, 1);
        rows.push(moving);

        updateGroups(
            groups.map((g) =>
                g.id === selectedGroup.id
                    ? { ...g, rows }
                    : g,
            ),
        );

        setDragState(null);
        setDragOverRowId(null);
    }, [dragState, groups, selectedGroup, updateGroups]);

    const mappingPreview = React.useMemo(
        () => buildMappingPreview(selectedGroup, selectedGroup?.rows),
        [selectedGroup],
    );

    return (
        <div className={styles.designWorkspace}>
            <div style={{ marginBottom: '1rem' }}>
                <h3 className={styles.workspaceTitle}>{t('reportDesign', 'Report Design')}</h3>
                <p className={styles.workspaceHint}>
                    {t(
                        'reportDesignHint',
                        'Design the report structure, indicator presentation, JSON template, and mapping preview.',
                    )}
                </p>
            </div>

            {!definitionDraft ? (
                <InlineNotification
                    kind="warning"
                    lowContrast
                    title="Definition required"
                    subtitle="Build the report definition first so the design can align to it."
                />
            ) : null}

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <Button size="sm" kind="secondary" renderIcon={Add} onClick={addRow} disabled={!selectedGroup}>
                    Add Node
                </Button>

                <Button
                    size="sm"
                    kind="primary"
                    onClick={generateFromDefinition}
                    disabled={!sectionSources.length}
                >
                    Generate From Definition
                </Button>
            </div>

            <div
                style={{
                    border: '1px solid var(--cds-border-subtle, #d0d0d0)',
                    borderRadius: 12,
                    padding: '1rem',
                    background: '#fff',
                }}
            >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Left */}
                    <div style={{ display: 'grid', gridTemplateRows: 'auto auto', gap: '1rem' }}>
                        <div
                            style={{
                                border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                                borderRadius: 10,
                                padding: '1rem',
                                background: 'var(--cds-layer, #f4f4f4)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Template Structure</div>
                                <Button kind="ghost" size="sm" renderIcon={Renew} onClick={generateFromDefinition}>
                                    Refresh JSON
                                </Button>
                            </div>

                            <div
                                style={{
                                    minHeight: '10rem',
                                    border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                                    borderRadius: 8,
                                    background: '#fff',
                                    padding: '0.5rem',
                                    overflow: 'auto',
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDropAtEnd}
                            >
                                {!selectedGroup ? (
                                    <div style={{ opacity: 0.7 }}>Select a section group first.</div>
                                ) : selectedGroup.rows.length === 0 ? (
                                    <div style={{ opacity: 0.7 }}>No indicators/nodes yet.</div>
                                ) : (
                                    selectedGroup.rows.map((row, idx) => {
                                        const isSelected = row.id === selectedRowId;
                                        const isDragOver = row.id === dragOverRowId;

                                        return (
                                            <div
                                                key={row.id}
                                                draggable
                                                onDragStart={() => handleDragStart(row.id, selectedGroup.id)}
                                                onDragEnd={() => {
                                                    setDragState(null);
                                                    setDragOverRowId(null);
                                                }}
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    setDragOverRowId(row.id);
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    handleDropOnRow(row.id);
                                                }}
                                                onClick={() => setSelectedRowId(row.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    padding: '0.65rem 0.75rem',
                                                    marginBottom: '0.35rem',
                                                    borderRadius: 6,
                                                    border: isSelected
                                                        ? '2px solid var(--cds-border-interactive, #0f62fe)'
                                                        : isDragOver
                                                            ? '2px dashed var(--cds-border-interactive, #0f62fe)'
                                                            : '1px solid transparent',
                                                    background: isSelected ? 'var(--cds-layer-selected, #e8f1ff)' : 'transparent',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <Draggable size={16} />
                                                <span style={{ paddingLeft: `${(row.indent ?? 0) * 20}px` }}>
                          {row.label || row.code || 'Untitled row'}
                        </span>
                                                {row.code ? (
                                                    <Tag size="sm" type="gray">
                                                        {row.code}
                                                    </Tag>
                                                ) : null}

                                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
                                                    <Button
                                                        kind="ghost"
                                                        size="sm"
                                                        hasIconOnly
                                                        iconDescription="Move up"
                                                        renderIcon={ArrowUp}
                                                        disabled={idx === 0}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            moveRow(row.id, -1);
                                                        }}
                                                    />
                                                    <Button
                                                        kind="ghost"
                                                        size="sm"
                                                        hasIconOnly
                                                        iconDescription="Move down"
                                                        renderIcon={ArrowDown}
                                                        disabled={idx === selectedGroup.rows.length - 1}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            moveRow(row.id, 1);
                                                        }}
                                                    />
                                                    <Button
                                                        kind="ghost"
                                                        size="sm"
                                                        hasIconOnly
                                                        iconDescription="Indent"
                                                        renderIcon={ArrowRight}
                                                        disabled={(row.indent ?? 0) >= MAX_INDENT}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            indentRow(row.id, 1);
                                                        }}
                                                    />
                                                    <Button
                                                        kind="ghost"
                                                        size="sm"
                                                        hasIconOnly
                                                        iconDescription="Outdent"
                                                        renderIcon={ArrowLeft}
                                                        disabled={(row.indent ?? 0) <= 0}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            indentRow(row.id, -1);
                                                        }}
                                                    />
                                                    <Button
                                                        kind="ghost"
                                                        size="sm"
                                                        hasIconOnly
                                                        iconDescription="Remove"
                                                        renderIcon={TrashCan}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeRow(row.id);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                                <Button size="sm" kind="primary" renderIcon={Add} onClick={addRow} disabled={!selectedGroup}>
                                    Add Node
                                </Button>
                                <Button
                                    size="sm"
                                    kind="secondary"
                                    renderIcon={ArrowUp}
                                    disabled={!selectedRow}
                                    onClick={() => selectedRow && moveRow(selectedRow.id, -1)}
                                >
                                    Move Up
                                </Button>
                                <Button
                                    size="sm"
                                    kind="secondary"
                                    renderIcon={ArrowDown}
                                    disabled={!selectedRow}
                                    onClick={() => selectedRow && moveRow(selectedRow.id, 1)}
                                >
                                    Move Down
                                </Button>
                                <Button
                                    size="sm"
                                    kind="secondary"
                                    renderIcon={ArrowLeft}
                                    disabled={!selectedRow || (selectedRow.indent ?? 0) <= 0}
                                    onClick={() => selectedRow && indentRow(selectedRow.id, -1)}
                                >
                                    Outdent
                                </Button>
                            </div>
                        </div>

                        <div
                            style={{
                                border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                                borderRadius: 10,
                                padding: '1rem',
                                background: '#fff',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>JSON Preview</div>
                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                    <Button kind="ghost" hasIconOnly size="sm" iconDescription="Refresh" renderIcon={Renew} />
                                    <Button kind="ghost" hasIconOnly size="sm" iconDescription="Copy" renderIcon={Copy} />
                                    <Button kind="ghost" hasIconOnly size="sm" iconDescription="Download" renderIcon={Download} />
                                    <Button kind="ghost" hasIconOnly size="sm" iconDescription="Expand" renderIcon={Launch} />
                                </div>
                            </div>

                            <pre
                                style={{
                                    margin: 0,
                                    minHeight: '16rem',
                                    maxHeight: '22rem',
                                    overflow: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    fontSize: '0.85rem',
                                    background: '#f8f8f8',
                                    border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                                    borderRadius: 8,
                                    padding: '0.75rem',
                                }}
                            >
                {JSON.stringify(draft, null, 2)}
              </pre>
                        </div>
                    </div>

                    {/* Right */}
                    <div style={{ display: 'grid', gridTemplateRows: 'auto auto', gap: '1rem' }}>
                        <div
                            style={{
                                border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                                borderRadius: 10,
                                padding: '1rem',
                                background: 'var(--cds-layer, #f4f4f4)',
                            }}
                        >
                            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Indicator Properties</div>
                            <div style={{ opacity: 0.8, marginBottom: '0.75rem' }}>
                                Select an indicator/row to edit properties
                            </div>

                            <Tabs
                                selectedIndex={
                                    propTab === 'details' ? 0 : propTab === 'disaggregation' ? 1 : propTab === 'mapping' ? 2 : 3
                                }
                                onChange={({ selectedIndex }) =>
                                    setPropTab(selectedIndex === 0 ? 'details' : selectedIndex === 1 ? 'disaggregation' : selectedIndex === 2 ? 'mapping' : 'api')
                                }
                            >
                                <TabList aria-label="Indicator properties tabs">
                                    <Tab>Details</Tab>
                                    <Tab>Disaggregation</Tab>
                                    <Tab>Mapping</Tab>
                                    <Tab>API</Tab>
                                </TabList>
                            </Tabs>

                            <div style={{ marginTop: '1rem' }}>
                                {!selectedRow ? (
                                    <div style={{ opacity: 0.7 }}>Select a node to edit.</div>
                                ) : propTab === 'details' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <TextInput
                                            id="design-row-label"
                                            labelText="Label"
                                            value={selectedRow.label}
                                            onChange={(e) =>
                                                updateRow(selectedRow.id, { label: (e.target as HTMLInputElement).value })
                                            }
                                        />
                                        <TextInput
                                            id="design-row-code"
                                            labelText="Code"
                                            value={selectedRow.code ?? ''}
                                            onChange={(e) =>
                                                updateRow(selectedRow.id, { code: (e.target as HTMLInputElement).value })
                                            }
                                        />
                                        <Select
                                            id="design-row-type"
                                            labelText="Row type"
                                            value={selectedRow.type}
                                            onChange={(e) =>
                                                updateRow(selectedRow.id, {
                                                    type: (e.target as HTMLSelectElement).value as DesignRow['type'],
                                                })
                                            }
                                        >
                                            <SelectItem value="indicator" text="Indicator" />
                                            <SelectItem value="label" text="Label" />
                                            <SelectItem value="spacer" text="Spacer" />
                                        </Select>
                                        <NumberInput
                                            id="design-row-indent"
                                            label="Indent"
                                            min={0}
                                            max={MAX_INDENT}
                                            value={selectedRow.indent ?? 0}
                                            onChange={(e) => {
                                                const next = Number((e.target as HTMLInputElement).value || 0);
                                                updateRow(selectedRow.id, {
                                                    indent: Number.isNaN(next) ? 0 : Math.max(0, Math.min(MAX_INDENT, next)),
                                                });
                                            }}
                                        />
                                    </div>
                                ) : propTab === 'disaggregation' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <Checkbox
                                            id="design-row-total"
                                            labelText="Show total"
                                            checked={Boolean(selectedRow.showTotal)}
                                            onChange={(checked) =>
                                                updateRow(selectedRow.id, { showTotal: Boolean(checked) })
                                            }
                                        />
                                        <Checkbox
                                            id="design-row-disagg"
                                            labelText="Show disaggregation"
                                            checked={Boolean(selectedRow.showDisaggregation)}
                                            onChange={(checked) =>
                                                updateRow(selectedRow.id, { showDisaggregation: Boolean(checked) })
                                            }
                                        />
                                    </div>
                                ) : propTab === 'mapping' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <TextInput
                                            id="design-row-key-pattern"
                                            labelText="Key pattern"
                                            value={selectedRow.keyPattern ?? ''}
                                            onChange={(e) =>
                                                updateRow(selectedRow.id, { keyPattern: (e.target as HTMLInputElement).value })
                                            }
                                        />
                                        <div style={{ opacity: 0.8, fontSize: '0.875rem' }}>
                                            Example: {'{code}_{age}_{sex}'}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ opacity: 0.8, fontSize: '0.875rem' }}>
                                        Node API preview and compile-time bindings will appear here.
                                    </div>
                                )}
                            </div>

                            <div
                                style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem',
                                    borderLeft: '3px solid var(--cds-border-interactive, #0f62fe)',
                                    background: 'var(--cds-layer-accent, #edf5ff)',
                                    fontSize: '0.9rem',
                                }}
                            >
                                Note: Nodes with children act as groups. Leaf nodes act as indicators and will
                                appear as rows in the output tables.
                            </div>
                        </div>

                        <div
                            style={{
                                border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                                borderRadius: 10,
                                padding: '1rem',
                                background: 'var(--cds-layer, #f4f4f4)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Mapping Preview</div>
                                <View size={18} />
                            </div>

                            <div
                                style={{
                                    border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    background: '#fff',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: `minmax(220px, 1.3fr) repeat(${mappingPreview.columns.length}, minmax(120px, 1fr))`,
                                        borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)',
                                        fontWeight: 600,
                                        background: '#fafafa',
                                    }}
                                >
                                    <div style={{ padding: '0.75rem' }} />
                                    {mappingPreview.columns.map((c) => (
                                        <div key={c} style={{ padding: '0.75rem' }}>
                                            {c}
                                        </div>
                                    ))}
                                </div>

                                {mappingPreview.rows.length === 0 ? (
                                    <div style={{ padding: '1rem', opacity: 0.7 }}>No rows to preview.</div>
                                ) : (
                                    mappingPreview.rows.map((row) => (
                                        <div
                                            key={row.id}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: `minmax(220px, 1.3fr) repeat(${mappingPreview.columns.length}, minmax(120px, 1fr))`,
                                                borderTop: '1px solid var(--cds-border-subtle, #f0f0f0)',
                                            }}
                                        >
                                            <div style={{ padding: '0.75rem', fontWeight: 600, paddingLeft: `${12 + row.indent * 18}px` }}>
                                                {row.label}
                                            </div>
                                            {row.values.map((v, idx) => (
                                                <div key={idx} style={{ padding: '0.75rem' }}>
                                                    {v}
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportDesignEditor;
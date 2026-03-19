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

type StructureItem =
    | { kind: 'group'; group: DesignGroup }
    | { kind: 'row'; group: DesignGroup; row: DesignRow; rowIndex: number };

const MAX_INDENT = 10;

function getMinIndentForRowType(type?: string | null) {
    return type === 'section-label' ? 0 : 1;
}

function clampIndentForRowType(indent: number | undefined, type?: string | null) {
    const min = getMinIndentForRowType(type);
    const safe = Number.isNaN(Number(indent)) ? min : Number(indent ?? min);
    return Math.max(min, Math.min(MAX_INDENT, safe));
}

function applyRowTypeDefaults(row: DesignRow, nextType: string): DesignRow {
    if (nextType === 'section-label') {
        return {
            ...row,
            type: nextType as any,
            indent: 0,
            span: 'all' as any,
            emphasis: 'section' as any,
            showTotal: false,
            showDisaggregation: false,
        };
    }

    if (nextType === 'group-label') {
        return {
            ...row,
            type: nextType as any,
            indent: clampIndentForRowType(row.indent, nextType),
            span: 'label-only' as any,
            emphasis: 'group' as any,
            showTotal: false,
            showDisaggregation: false,
        };
    }

    if (nextType === 'indicator') {
        return {
            ...row,
            type: nextType as any,
            indent: clampIndentForRowType(row.indent, nextType),
            span: 'label-only' as any,
            emphasis: 'normal' as any,
            showTotal: true,
            showDisaggregation: true,
        };
    }

    return {
        ...row,
        type: nextType as any,
        indent: clampIndentForRowType(row.indent, nextType),
        span: 'label-only' as any,
        emphasis: 'normal' as any,
    };
}

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
            rows: [
                {
                    id: `${section.sectionUuid}__section_label`,
                    type: 'section-label' as any,
                    label: section.title,
                    indent: 0,
                    span: 'all' as any,
                    emphasis: 'section' as any,
                    showTotal: false,
                    showDisaggregation: false,
                },
                ...section.indicators.map((i) => ({
                    id: i.id,
                    type: 'indicator' as const,
                    code: i.code,
                    label: `${i.code}. ${i.name}`,
                    indent: 1,
                    keyPattern: '{code}_{age}_{sex}',
                    dims: {},
                    showTotal: true,
                    showDisaggregation: true,
                    span: 'label-only' as any,
                    emphasis: 'normal' as any,
                })),
            ],
        })),
    };
}

function buildMappingPreview(groups: DesignGroup[]) {
    const columns = ['Age <5 | Male', 'Age <5 | Female', '5-14 | Male', '5-14 | Female'];

    const rows = groups.flatMap((group) =>
        group.rows.map((r) => ({
            id: r.id,
            type: r.type,
            code: (r as any).code,
            label: r.label || r.code || 'Untitled row',
            values:
                r.type === ('section-label' as any) || r.type === ('group-label' as any)
                    ? []
                    : columns.map(() => 0),
            indent: r.indent ?? 0,
            groupId: group.id,
        })),
    );

    return { columns, rows };
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

    const selectedRow = React.useMemo(
        () =>
            groups
                .flatMap((g) => g.rows)
                .find((r) => r.id === selectedRowId) ?? null,
        [groups, selectedRowId],
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

    const updateRow = React.useCallback(
        (groupId: string, rowId: string, patch: Partial<DesignRow>) => {
            updateGroups(
                groups.map((g) =>
                    g.id === groupId
                        ? {
                            ...g,
                            rows: g.rows.map((r) => {
                                if (r.id !== rowId) return r;
                                const next = { ...r, ...patch };
                                return {
                                    ...next,
                                    indent: clampIndentForRowType(next.indent, next.type),
                                };
                            }),
                        }
                        : g,
                ),
            );
        },
        [groups, updateGroups],
    );

    const addRowToGroup = React.useCallback(
        (groupId: string) => {
            const row = createEmptyDesignRow();
            row.indent = 1;

            updateGroups(
                groups.map((g) =>
                    g.id === groupId
                        ? { ...g, rows: [...g.rows, row] }
                        : g,
                ),
            );
            setSelectedGroupId(groupId);
            setSelectedRowId(row.id);
        },
        [groups, updateGroups],
    );

    const removeRow = React.useCallback(
        (groupId: string, rowId: string) => {
            updateGroups(
                groups.map((g) =>
                    g.id === groupId
                        ? { ...g, rows: g.rows.filter((r) => r.id !== rowId) }
                        : g,
                ),
            );

            if (selectedRowId === rowId) {
                setSelectedRowId(null);
            }
        },
        [groups, selectedRowId, updateGroups],
    );

    const moveRow = React.useCallback(
        (groupId: string, rowId: string, dir: -1 | 1) => {
            const group = groups.find((g) => g.id === groupId);
            if (!group) return;

            const rows = group.rows.slice();
            const idx = rows.findIndex((r) => r.id === rowId);
            if (idx < 0) return;

            const j = idx + dir;
            if (j < 0 || j >= rows.length) return;

            const tmp = rows[idx];
            rows[idx] = rows[j];
            rows[j] = tmp;

            updateGroups(
                groups.map((g) =>
                    g.id === groupId ? { ...g, rows } : g,
                ),
            );
        },
        [groups, updateGroups],
    );

    const indentRow = React.useCallback(
        (groupId: string, rowId: string, dir: -1 | 1) => {
            const group = groups.find((g) => g.id === groupId);
            const row = group?.rows.find((r) => r.id === rowId);
            if (!group || !row) return;

            const minIndent = getMinIndentForRowType(row.type);
            const nextIndent = Math.max(minIndent, Math.min(MAX_INDENT, (row.indent ?? minIndent) + dir));
            updateRow(groupId, rowId, { indent: nextIndent });
        },
        [groups, updateRow],
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
        (targetGroupId: string, targetRowId: string) => {
            if (!dragState) return;
            if (dragState.fromGroupId !== targetGroupId) return;
            if (dragState.rowId === targetRowId) return;

            const group = groups.find((g) => g.id === targetGroupId);
            if (!group) return;

            const rows = group.rows.slice();
            const fromIdx = rows.findIndex((r) => r.id === dragState.rowId);
            const toIdx = rows.findIndex((r) => r.id === targetRowId);

            if (fromIdx < 0 || toIdx < 0) return;

            const moving = rows[fromIdx];
            rows.splice(fromIdx, 1);
            rows.splice(toIdx, 0, moving);

            updateGroups(
                groups.map((g) =>
                    g.id === targetGroupId ? { ...g, rows } : g,
                ),
            );

            setDragState(null);
            setDragOverRowId(null);
        },
        [dragState, groups, updateGroups],
    );

    const structureItems = React.useMemo<StructureItem[]>(() => {
        return groups.flatMap((group) => [
            { kind: 'group' as const, group },
            ...group.rows.map((row, rowIndex) => ({
                kind: 'row' as const,
                group,
                row,
                rowIndex,
            })),
        ]);
    }, [groups]);

    const mappingPreview = React.useMemo(() => buildMappingPreview(groups), [groups]);

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
                                    minHeight: '12rem',
                                    border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                                    borderRadius: 8,
                                    background: '#fff',
                                    padding: '0.5rem',
                                    overflow: 'auto',
                                }}
                            >
                                {structureItems.length === 0 ? (
                                    <div style={{ opacity: 0.7 }}>No sections/rows yet. Generate from definition.</div>
                                ) : (
                                    structureItems.map((item) => {
                                        if (item.kind === 'group') {
                                            return null;
                                        }

                                        const { group, row, rowIndex } = item;
                                        const isSelected = row.id === selectedRowId;
                                        const isDragOver = row.id === dragOverRowId;

                                        const isSectionLabel = row.type === ('section-label' as any);
                                        const isGroupLabel = row.type === ('group-label' as any);

                                        return (
                                            <div
                                                key={row.id}
                                                draggable
                                                onDragStart={() => handleDragStart(row.id, group.id)}
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
                                                    handleDropOnRow(group.id, row.id);
                                                }}
                                                onClick={() => {
                                                    setSelectedGroupId(group.id);
                                                    setSelectedRowId(row.id);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    padding: '0.65rem 0.75rem',
                                                    marginBottom: '0.35rem',
                                                    marginLeft: `${(row.indent ?? 0) * 18}px`,
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
                                                <span
                                                    style={{
                                                        fontWeight: isSectionLabel ? 700 : isGroupLabel ? 600 : 500,
                                                    }}
                                                >
                          {row.label || row.code || 'Untitled row'}
                        </span>

                                                <Tag
                                                    size="sm"
                                                    type={
                                                        isSectionLabel
                                                            ? 'purple'
                                                            : isGroupLabel
                                                                ? 'cyan'
                                                                : 'gray'
                                                    }
                                                >
                                                    {isSectionLabel
                                                        ? 'section'
                                                        : isGroupLabel
                                                            ? 'group'
                                                            : row.code || row.type}
                                                </Tag>

                                                {isSectionLabel ? (
                                                    <Button
                                                        size="sm"
                                                        kind="ghost"
                                                        renderIcon={Add}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addRowToGroup(group.id);
                                                        }}
                                                    >
                                                        Add Node
                                                    </Button>
                                                ) : null}

                                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
                                                    <Button
                                                        kind="ghost"
                                                        size="sm"
                                                        hasIconOnly
                                                        iconDescription="Move up"
                                                        renderIcon={ArrowUp}
                                                        disabled={rowIndex === 0}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            moveRow(group.id, row.id, -1);
                                                        }}
                                                    />
                                                    <Button
                                                        kind="ghost"
                                                        size="sm"
                                                        hasIconOnly
                                                        iconDescription="Move down"
                                                        renderIcon={ArrowDown}
                                                        disabled={rowIndex === group.rows.length - 1}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            moveRow(group.id, row.id, 1);
                                                        }}
                                                    />
                                                    <Button
                                                        kind="ghost"
                                                        size="sm"
                                                        hasIconOnly
                                                        iconDescription="Indent"
                                                        renderIcon={ArrowRight}
                                                        disabled={(row.indent ?? getMinIndentForRowType(row.type)) >= MAX_INDENT}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            indentRow(group.id, row.id, 1);
                                                        }}
                                                    />
                                                    <Button
                                                        kind="ghost"
                                                        size="sm"
                                                        hasIconOnly
                                                        iconDescription="Outdent"
                                                        renderIcon={ArrowLeft}
                                                        disabled={(row.indent ?? getMinIndentForRowType(row.type)) <= getMinIndentForRowType(row.type)}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            indentRow(group.id, row.id, -1);
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
                                                            removeRow(group.id, row.id);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
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
                                {!selectedRow || !selectedGroupId ? (
                                    <div style={{ opacity: 0.7 }}>Select a node to edit.</div>
                                ) : propTab === 'details' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <TextInput
                                            id="design-row-label"
                                            labelText="Label"
                                            value={selectedRow.label}
                                            onChange={(e) =>
                                                updateRow(selectedGroupId, selectedRow.id, { label: (e.target as HTMLInputElement).value })
                                            }
                                        />
                                        <TextInput
                                            id="design-row-code"
                                            labelText="Code"
                                            value={selectedRow.code ?? ''}
                                            onChange={(e) =>
                                                updateRow(selectedGroupId, selectedRow.id, { code: (e.target as HTMLInputElement).value })
                                            }
                                        />
                                        <Select
                                            id="design-row-type"
                                            labelText="Row type"
                                            value={selectedRow.type}
                                            onChange={(e) => {
                                                const nextType = (e.target as HTMLSelectElement).value;
                                                const nextRow = applyRowTypeDefaults(selectedRow, nextType);
                                                updateRow(selectedGroupId, selectedRow.id, nextRow);
                                            }}
                                        >
                                            <SelectItem value="section-label" text="Section Label" />
                                            <SelectItem value="group-label" text="Group Label" />
                                            <SelectItem value="indicator" text="Indicator" />
                                            <SelectItem value="label" text="Label" />
                                            <SelectItem value="spacer" text="Spacer" />
                                        </Select>
                                        <NumberInput
                                            id="design-row-indent"
                                            label="Indent"
                                            min={getMinIndentForRowType(selectedRow.type)}
                                            max={MAX_INDENT}
                                            value={selectedRow.indent ?? getMinIndentForRowType(selectedRow.type)}
                                            onChange={(e) => {
                                                const next = Number((e.target as HTMLInputElement).value || getMinIndentForRowType(selectedRow.type));
                                                updateRow(selectedGroupId, selectedRow.id, {
                                                    indent: clampIndentForRowType(next, selectedRow.type),
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
                                                updateRow(selectedGroupId, selectedRow.id, { showTotal: Boolean(checked) })
                                            }
                                        />
                                        <Checkbox
                                            id="design-row-disagg"
                                            labelText="Show disaggregation"
                                            checked={Boolean(selectedRow.showDisaggregation)}
                                            onChange={(checked) =>
                                                updateRow(selectedGroupId, selectedRow.id, { showDisaggregation: Boolean(checked) })
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
                                                updateRow(selectedGroupId, selectedRow.id, { keyPattern: (e.target as HTMLInputElement).value })
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
                                    mappingPreview.rows.map((row: any) =>
                                        row.type === 'section-label' ? (
                                            <div
                                                key={row.id}
                                                style={{
                                                    borderTop: '1px solid var(--cds-border-subtle, #f0f0f0)',
                                                    background: 'var(--cds-layer-accent, #f4f4f4)',
                                                    fontWeight: 700,
                                                    padding: '0.85rem 0.75rem',
                                                }}
                                            >
                                                {row.label}
                                            </div>
                                        ) : row.type === 'group-label' ? (
                                            <div
                                                key={row.id}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: `minmax(220px, 1.3fr) repeat(${mappingPreview.columns.length}, minmax(120px, 1fr))`,
                                                    borderTop: '1px solid var(--cds-border-subtle, #f0f0f0)',
                                                    background: '#fafafa',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        padding: '0.75rem',
                                                        fontWeight: 600,
                                                        paddingLeft: `${12 + row.indent * 18}px`,
                                                    }}
                                                >
                                                    {row.code ? `${row.code} ${row.label}` : row.label}
                                                </div>
                                                {mappingPreview.columns.map((_: any, idx: number) => (
                                                    <div key={idx} style={{ padding: '0.75rem' }} />
                                                ))}
                                            </div>
                                        ) : (
                                            <div
                                                key={row.id}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: `minmax(220px, 1.3fr) repeat(${mappingPreview.columns.length}, minmax(120px, 1fr))`,
                                                    borderTop: '1px solid var(--cds-border-subtle, #f0f0f0)',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        padding: '0.75rem',
                                                        fontWeight: 600,
                                                        paddingLeft: `${12 + row.indent * 18}px`,
                                                    }}
                                                >
                                                    {row.label}
                                                </div>
                                                {row.values.map((v: any, idx: number) => (
                                                    <div key={idx} style={{ padding: '0.75rem' }}>
                                                        {v}
                                                    </div>
                                                ))}
                                            </div>
                                        ),
                                    )
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
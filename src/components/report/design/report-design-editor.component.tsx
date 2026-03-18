import React from 'react';
import {
    Button,
    InlineNotification,
    Search,
    TextInput,
    NumberInput,
    Select,
    SelectItem,
    Checkbox,
    Tag,
} from '@carbon/react';
import { Add, ArrowUp, ArrowDown, TrashCan } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';

import styles from '../../../routes/report-builder.scss';

import type { ReportDefinitionDraft } from '../definition/report-definition.types';
import type { DesignGroup, DesignRow, ReportDesignDraft } from './report-design.types';
import {
    buildDesignFromDefinition,
    createEmptyDesignGroup,
    createEmptyDesignRow,
    createEmptyReportDesignDraft,
} from './report-design.utils';

type Props = {
    value?: ReportDesignDraft | null;
    onChange?: (next: ReportDesignDraft) => void;
    definitionDraft?: ReportDefinitionDraft | null;
    sectionNameLookup?: Record<string, string>;
};

const ReportDesignEditor: React.FC<Props> = ({
                                                 value,
                                                 onChange,
                                                 definitionDraft,
                                                 sectionNameLookup,
                                             }) => {
    const { t } = useTranslation();

    const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);
    const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null);
    const [search, setSearch] = React.useState('');

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

    const selectedGroup = React.useMemo(
        () => groups.find((g) => g.id === selectedGroupId) ?? null,
        [groups, selectedGroupId],
    );

    const selectedRow = React.useMemo(
        () => selectedGroup?.rows.find((r) => r.id === selectedRowId) ?? null,
        [selectedGroup, selectedRowId],
    );

    const filteredGroups = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return groups;
        return groups.filter((g) => g.title.toLowerCase().includes(q));
    }, [groups, search]);

    const updateGroups = React.useCallback(
        (nextGroups: DesignGroup[]) => {
            setDraft({
                ...draft,
                groups: nextGroups,
            });
        },
        [draft, setDraft],
    );

    const addGroup = React.useCallback(() => {
        const next = [...groups, createEmptyDesignGroup()];
        updateGroups(next);
        const last = next[next.length - 1];
        setSelectedGroupId(last.id);
        setSelectedRowId(null);
    }, [groups, updateGroups]);

    const removeGroup = React.useCallback(
        (groupId: string) => {
            const next = groups.filter((g) => g.id !== groupId);
            updateGroups(next);
            if (selectedGroupId === groupId) {
                setSelectedGroupId(next[0]?.id ?? null);
                setSelectedRowId(null);
            }
        },
        [groups, updateGroups, selectedGroupId],
    );

    const moveGroup = React.useCallback(
        (groupId: string, dir: -1 | 1) => {
            const idx = groups.findIndex((g) => g.id === groupId);
            if (idx < 0) return;
            const j = idx + dir;
            if (j < 0 || j >= groups.length) return;

            const next = groups.slice();
            const tmp = next[idx];
            next[idx] = next[j];
            next[j] = tmp;
            updateGroups(next);
        },
        [groups, updateGroups],
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
                    ? {
                        ...g,
                        rows: [...g.rows, row],
                    }
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
                        ? {
                            ...g,
                            rows: g.rows.filter((r) => r.id !== rowId),
                        }
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
                        ? {
                            ...g,
                            rows,
                        }
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

    const generateFromDefinition = React.useCallback(() => {
        if (!definitionDraft) return;

        const next = buildDesignFromDefinition(definitionDraft, sectionNameLookup);
        setDraft(next);

        const firstGroup = next.groups[0];
        setSelectedGroupId(firstGroup?.id ?? null);
        setSelectedRowId(null);
    }, [definitionDraft, sectionNameLookup, setDraft]);

    return (
        <div className={styles.designWorkspace}>
            <div style={{ marginBottom: '1rem' }}>
                <h3 className={styles.workspaceTitle}>{t('reportDesign', 'Report Design')}</h3>
                <p className={styles.workspaceHint}>
                    {t(
                        'reportDesignHint',
                        'Design how the report should be displayed and downloaded, including groups, rows, indentation, and dimensions.',
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
                <Button size="sm" kind="secondary" renderIcon={Add} onClick={addGroup}>
                    Add Group
                </Button>

                <Button
                    size="sm"
                    kind="primary"
                    onClick={generateFromDefinition}
                    disabled={!definitionDraft}
                >
                    Generate From Definition
                </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: '1rem' }}>
                {/* Groups */}
                <div
                    style={{
                        border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                        borderRadius: 8,
                        padding: '0.75rem',
                    }}
                >
                    <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Groups</div>

                    <Search
                        size="lg"
                        labelText="Search groups"
                        placeholder="Search groups"
                        value={search}
                        onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                        {filteredGroups.length === 0 ? (
                            <div style={{ opacity: 0.7 }}>No groups yet.</div>
                        ) : (
                            filteredGroups.map((g, idx) => {
                                const selected = g.id === selectedGroupId;
                                return (
                                    <div
                                        key={g.id}
                                        onClick={() => {
                                            setSelectedGroupId(g.id);
                                            setSelectedRowId(null);
                                        }}
                                        style={{
                                            padding: '0.75rem',
                                            border: selected
                                                ? '2px solid var(--cds-border-interactive, #0f62fe)'
                                                : '1px solid var(--cds-border-subtle, #e0e0e0)',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            background: selected ? 'var(--cds-layer-selected, #e8f1ff)' : '#fff',
                                        }}
                                    >
                                        <div style={{ fontWeight: 600 }}>{g.title || 'Untitled group'}</div>
                                        <div style={{ opacity: 0.7, fontSize: '0.85rem' }}>{g.rows.length} rows</div>

                                        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                                            <Button
                                                kind="ghost"
                                                size="sm"
                                                hasIconOnly
                                                iconDescription="Move up"
                                                renderIcon={ArrowUp}
                                                disabled={idx === 0}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    moveGroup(g.id, -1);
                                                }}
                                            />
                                            <Button
                                                kind="ghost"
                                                size="sm"
                                                hasIconOnly
                                                iconDescription="Move down"
                                                renderIcon={ArrowDown}
                                                disabled={idx === filteredGroups.length - 1}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    moveGroup(g.id, 1);
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
                                                    removeGroup(g.id);
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Rows */}
                <div
                    style={{
                        border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                        borderRadius: 8,
                        padding: '0.75rem',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ fontWeight: 600 }}>Rows</div>
                        <Button size="sm" kind="secondary" renderIcon={Add} onClick={addRow} disabled={!selectedGroup}>
                            Add Row
                        </Button>
                    </div>

                    {!selectedGroup ? (
                        <div style={{ opacity: 0.7 }}>Select a group first.</div>
                    ) : selectedGroup.rows.length === 0 ? (
                        <div style={{ opacity: 0.7 }}>No rows in this group yet.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {selectedGroup.rows.map((row, idx) => {
                                const isSelected = row.id === selectedRowId;
                                return (
                                    <div
                                        key={row.id}
                                        onClick={() => setSelectedRowId(row.id)}
                                        style={{
                                            padding: '0.75rem',
                                            border: isSelected
                                                ? '2px solid var(--cds-border-interactive, #0f62fe)'
                                                : '1px solid var(--cds-border-subtle, #e0e0e0)',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            background: isSelected ? 'var(--cds-layer-selected, #e8f1ff)' : '#fff',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Tag size="sm" type="blue">{row.type}</Tag>
                                            <span style={{ paddingLeft: `${row.indent * 16}px`, fontWeight: 600 }}>
                        {row.label || row.code || 'Untitled row'}
                      </span>
                                        </div>

                                        <div style={{ opacity: 0.7, fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                            Code: {row.code || '-'} • Indent: {row.indent}
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
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
                            })}
                        </div>
                    )}
                </div>

                {/* Properties */}
                <div
                    style={{
                        border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                        borderRadius: 8,
                        padding: '0.75rem',
                    }}
                >
                    <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Properties</div>

                    {selectedGroup && !selectedRow ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <TextInput
                                id="design-group-title"
                                labelText="Group title"
                                value={selectedGroup.title}
                                onChange={(e) =>
                                    updateGroup(selectedGroup.id, { title: (e.target as HTMLInputElement).value })
                                }
                            />
                        </div>
                    ) : null}

                    {!selectedRow ? (
                        !selectedGroup ? <div style={{ opacity: 0.7 }}>Select a group or row to edit.</div> : null
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <Select
                                id="design-row-type"
                                labelText="Row type"
                                value={selectedRow.type}
                                onChange={(e) =>
                                    updateRow(selectedRow.id, { type: (e.target as HTMLSelectElement).value as DesignRow['type'] })
                                }
                            >
                                <SelectItem value="indicator" text="Indicator" />
                                <SelectItem value="label" text="Label" />
                                <SelectItem value="spacer" text="Spacer" />
                            </Select>

                            <TextInput
                                id="design-row-code"
                                labelText="Code"
                                value={selectedRow.code ?? ''}
                                onChange={(e) =>
                                    updateRow(selectedRow.id, { code: (e.target as HTMLInputElement).value })
                                }
                            />

                            <TextInput
                                id="design-row-label"
                                labelText="Label"
                                value={selectedRow.label}
                                onChange={(e) =>
                                    updateRow(selectedRow.id, { label: (e.target as HTMLInputElement).value })
                                }
                            />

                            <NumberInput
                                id="design-row-indent"
                                label="Indent"
                                min={0}
                                max={10}
                                value={selectedRow.indent}
                                onChange={(e) => {
                                    const next = Number((e.target as HTMLInputElement).value || 0);
                                    updateRow(selectedRow.id, { indent: Number.isNaN(next) ? 0 : next });
                                }}
                            />

                            <TextInput
                                id="design-row-key-pattern"
                                labelText="Key pattern"
                                value={selectedRow.keyPattern ?? ''}
                                onChange={(e) =>
                                    updateRow(selectedRow.id, { keyPattern: (e.target as HTMLInputElement).value })
                                }
                            />

                            <Checkbox
                                id="design-row-total"
                                labelText="Show total"
                                checked={Boolean(selectedRow.showTotal)}
                                onChange={(checked) => updateRow(selectedRow.id, { showTotal: Boolean(checked) })}
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
                    )}
                </div>
            </div>

            <div
                style={{
                    marginTop: '1rem',
                    padding: '0.9rem 1rem',
                    background: '#fff',
                    border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                    borderRadius: 12,
                }}
            >
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Current Design Draft</div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.85rem' }}>
          {JSON.stringify(draft, null, 2)}
        </pre>
            </div>
        </div>
    );
};

export default ReportDesignEditor;
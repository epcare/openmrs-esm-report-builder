import React from 'react';
import { ComboBox, Select, SelectItem, InlineLoading, Button, TextInput, Stack } from '@carbon/react';
import { Add, TrashCan } from '@carbon/react/icons';

import type { DataThemeConfig, CombinationStrategy, SourceJoinConfig } from '../../../types/theme/data-theme.types';
import { getSchemaTables, type SchemaTable } from '../../../resources/theme/etl-schema.api';
import { getETLTableMeta, type TableColumn } from '../../../resources/theme/etl-table-meta.api';

type Props = {
    open: boolean;
    config: DataThemeConfig;
    onChange: (next: DataThemeConfig) => void;
};

function getTableName(t: SchemaTable): string {
    // supports { name }, { table }, { tableName }, or string-ish payloads (defensive)
    if (typeof (t as any) === 'string') return String(t);
    return (t as any)?.name ?? (t as any)?.table ?? (t as any)?.tableName ?? '';
}

const COMBINATION_STRATEGIES: Array<{ value: CombinationStrategy; label: string; description: string }> = [
    { value: 'UNION_ALL', label: 'Combine All (Union All)', description: 'Combine all rows from all sources, including duplicates' },
    { value: 'UNION', label: 'Combine Unique (Union)', description: 'Combine all rows from all sources, removing duplicates' },
    { value: 'INTERSECTION', label: 'Common Records (Intersection)', description: 'Only rows that exist in ALL sources' },
    { value: 'EXCEPT', label: 'Unique to First (Except)', description: 'Rows from the first source that are NOT in others' },
    { value: 'CUSTOM', label: 'Custom Joins', description: 'Specify custom join relationships between sources' },
];

const JOIN_TYPES = [
    { value: 'INNER', label: 'Inner Join', description: 'Only matching rows from both sources' },
    { value: 'LEFT', label: 'Left Join', description: 'All rows from first source, matching from second' },
    { value: 'RIGHT', label: 'Right Join', description: 'All rows from second source, matching from first' },
    { value: 'FULL', label: 'Full Join', description: 'All rows from both sources' },
] as const;

export default function DataThemeSourceSection({ open, config, onChange }: Props) {
    // tables state
    const [tables, setTables] = React.useState<SchemaTable[]>([]);
    const [loadingTables, setLoadingTables] = React.useState(false);
    const [tablesError, setTablesError] = React.useState<string | null>(null);

    // columns state
    const [columns, setColumns] = React.useState<TableColumn[]>([]);
    const [loadingCols, setLoadingCols] = React.useState(false);
    const [colsError, setColsError] = React.useState<string | null>(null);

    // Load schema tables only when modal is open
    React.useEffect(() => {
        if (!open) {
            setTables([]);
            setLoadingTables(false);
            setTablesError(null);
            return;
        }

        const ac = new AbortController();
        setLoadingTables(true);
        setTablesError(null);

        getSchemaTables(ac.signal)
            .then((data) => setTables(data ?? []))
            .catch((e) => {
                if (e?.name !== 'AbortError') setTablesError(e?.message ?? 'Failed to load tables');
            })
            .finally(() => setLoadingTables(false));

        return () => ac.abort();
    }, [open]);

    // Load columns only when modal is open AND tables are selected
    React.useEffect(() => {
        if (!open) {
            setColumns([]);
            setLoadingCols(false);
            setColsError(null);
            return;
        }

        const sourceTables = config?.sourceTables ?? [];
        const firstTable = sourceTables[0];

        if (!firstTable) {
            setColumns([]);
            setLoadingCols(false);
            setColsError(null);
            return;
        }

        const ac = new AbortController();
        setLoadingCols(true);
        setColsError(null);

        getETLTableMeta(firstTable, ac.signal)
            .then((data) => setColumns(data ?? []))
            .catch((e) => {
                if (e?.name !== 'AbortError') setColsError(e?.message ?? 'Failed to load columns');
            })
            .finally(() => setLoadingCols(false));

        return () => ac.abort();
    }, [open, config?.sourceTables]);

    const colNames = React.useMemo(
        () => (columns ?? []).map((c) => c?.name).filter(Boolean) as string[],
        [columns],
    );

    const tableNames = React.useMemo(() => (tables ?? []).map(getTableName).filter(Boolean), [tables]);

    const selectedTables = React.useMemo(() => config?.sourceTables ?? [], [config?.sourceTables]);

    const availableTables = React.useMemo(
        () => tableNames.filter(t => !selectedTables.includes(t)),
        [tableNames, selectedTables]
    );

    const combinationStrategy = config?.combinationStrategy ?? 'UNION_ALL';

    const canPickTable = open && !loadingTables && !tablesError;
    const canPickCols = open && selectedTables.length > 0 && !loadingCols && !colsError;

    const addTable = (table: string) => {
        if (!table) return;
        const current = config?.sourceTables ?? [];
        if (!current.includes(table)) {
            onChange({
                ...config,
                sourceTables: [...current, table],
            });
        }
    };

    const removeTable = (table: string) => {
        const current = config?.sourceTables ?? [];
        const next = current.filter(t => t !== table);
        onChange({
            ...config,
            sourceTables: next,
        });
    };

    return (
        <div>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Source Tables</div>

            {/* Selected sources as removable tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {selectedTables.length === 0 ? (
                    <div style={{ opacity: 0.6, fontSize: '0.875rem' }}>No source tables selected</div>
                ) : null}
                {selectedTables.map((table) => (
                    <div
                        key={table}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            background: 'var(--cds-tag-blue, #0f62fe)',
                            color: 'white',
                            borderRadius: '2px',
                            fontSize: '0.75rem',
                        }}
                    >
                        <span>{table}</span>
                        <button
                            onClick={() => removeTable(table)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '0',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                            title={`Remove ${table}`}
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>

            {/* Add new source */}
            <ComboBox
                id="theme-source-tables"
                titleText="Add source table/view"
                items={availableTables}
                selectedItem={null}
                disabled={!canPickTable || availableTables.length === 0}
                placeholder={
                    loadingTables
                        ? 'Loading…'
                        : tablesError
                        ? 'Failed to load tables'
                        : availableTables.length === 0
                        ? 'All tables selected'
                        : 'Type to search and add tables…'
                }
                onChange={(e: any) => {
                    const nextTable = e?.selectedItem ?? '';
                    addTable(nextTable);
                    // Clear the selection after adding
                    e?.selectedItem?.toString();
                }}
            />

            <div style={{ marginTop: '0.5rem' }}>
                {loadingTables ? <InlineLoading description="Loading tables…" /> : null}
                {!loadingTables && tablesError ? (
                    <div style={{ color: 'var(--cds-text-error, #da1e28)' }}>{tablesError}</div>
                ) : null}
            </div>

            {/* Combination Strategy - only show when multiple tables selected */}
            {selectedTables.length > 1 ? (
                <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Combination Strategy</div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.75rem' }}>
                        How to combine results from multiple source tables
                    </div>
                    <Select
                        id="theme-combination-strategy"
                        labelText=""
                        value={combinationStrategy}
                        disabled={!open}
                        onChange={(e) => onChange({ ...config, combinationStrategy: (e.target as HTMLSelectElement).value as CombinationStrategy })}
                    >
                        {COMBINATION_STRATEGIES.map((cs) => (
                            <SelectItem key={cs.value} value={cs.value} text={cs.label}>
                                {cs.description}
                            </SelectItem>
                        ))}
                    </Select>
                </div>
            ) : null}

            {/* Custom Joins - only show when CUSTOM strategy selected and multiple tables */}
            {combinationStrategy === 'CUSTOM' && selectedTables.length > 1 ? (
                <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Custom Join Configuration</div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.75rem' }}>
                        Specify how sources should be joined together
                    </div>

                    {/* Existing joins */}
                    {(config?.sourceJoins ?? []).map((join, joinIdx) => (
                        <div
                            key={joinIdx}
                            style={{
                                padding: '1rem',
                                marginBottom: '0.75rem',
                                background: 'var(--cds-field, #f4f4f4)',
                                borderRadius: '4px',
                                border: '1px solid var(--cds-interactive, #0f62fe)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Join #{joinIdx + 1}</span>
                                <Button
                                    kind="ghost"
                                    size="sm"
                                    renderIcon={TrashCan}
                                    iconDescription="Remove join"
                                    onClick={() => {
                                        const nextJoins = (config?.sourceJoins ?? []).filter((_, i) => i !== joinIdx);
                                        onChange({ ...config, sourceJoins: nextJoins });
                                    }}
                                >
                                    Remove
                                </Button>
                            </div>

                            <Stack gap={0.75}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <Select
                                        id={`join-${joinIdx}-from`}
                                        labelText="From source"
                                        value={join.fromSource}
                                        disabled={!open}
                                        onChange={(e) => {
                                            const nextJoins = [...(config?.sourceJoins ?? [])];
                                            nextJoins[joinIdx] = { ...join, fromSource: (e.target as HTMLSelectElement).value };
                                            onChange({ ...config, sourceJoins: nextJoins });
                                        }}
                                    >
                                        {selectedTables.map((t) => (
                                            <SelectItem key={t} value={t} text={t} />
                                        ))}
                                    </Select>

                                    <Select
                                        id={`join-${joinIdx}-to`}
                                        labelText="To source"
                                        value={join.toSource}
                                        disabled={!open}
                                        onChange={(e) => {
                                            const nextJoins = [...(config?.sourceJoins ?? [])];
                                            nextJoins[joinIdx] = { ...join, toSource: (e.target as HTMLSelectElement).value };
                                            onChange({ ...config, sourceJoins: nextJoins });
                                        }}
                                    >
                                        {selectedTables.map((t) => (
                                            <SelectItem key={t} value={t} text={t} />
                                        ))}
                                    </Select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                                    <Select
                                        id={`join-${joinIdx}-type`}
                                        labelText="Join type"
                                        value={join.joinType}
                                        disabled={!open}
                                        onChange={(e) => {
                                            const nextJoins = [...(config?.sourceJoins ?? [])];
                                            nextJoins[joinIdx] = { ...join, joinType: (e.target as HTMLSelectElement).value as SourceJoinConfig['joinType'] };
                                            onChange({ ...config, sourceJoins: nextJoins });
                                        }}
                                    >
                                        {JOIN_TYPES.map((jt) => (
                                            <SelectItem key={jt.value} value={jt.value} text={jt.label}>
                                                {jt.description}
                                            </SelectItem>
                                        ))}
                                    </Select>

                                    <TextInput
                                        id={`join-${joinIdx}-condition`}
                                        labelText="Join condition (e.g., src1.patient_id = src2.patient_id)"
                                        value={join.joinCondition}
                                        placeholder="e.g., src1.patient_id = src2.patient_id"
                                        disabled={!open}
                                        onChange={(e) => {
                                            const nextJoins = [...(config?.sourceJoins ?? [])];
                                            nextJoins[joinIdx] = { ...join, joinCondition: e.target.value };
                                            onChange({ ...config, sourceJoins: nextJoins });
                                        }}
                                    />
                                </div>
                            </Stack>
                        </div>
                    ))}

                    {/* Add new join button */}
                    <Button
                        kind="secondary"
                        size="sm"
                        renderIcon={Add}
                        disabled={!open || selectedTables.length < 2}
                        onClick={() => {
                            const newJoin: SourceJoinConfig = {
                                fromSource: selectedTables[0] ?? '',
                                toSource: selectedTables[1] ?? '',
                                joinType: 'INNER',
                                joinCondition: `${selectedTables[0] ?? ''}.patient_id = ${selectedTables[1] ?? ''}.patient_id`,
                            };
                            onChange({ ...config, sourceJoins: [...(config?.sourceJoins ?? []), newJoin] });
                        }}
                    >
                        Add Join
                    </Button>

                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.7 }}>
                        💡 Tip: Use the column picker above to find available columns, then specify joins like
                        "src1.patient_id = src2.patient_id"
                    </div>
                </div>
            ) : null}

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '0.75rem',
                    marginTop: '0.75rem',
                }}
            >
                <Select
                    id="theme-patient-id-col"
                    labelText="patient_id column"
                    value={config.patientIdColumn || ''}
                    disabled={!canPickCols}
                    onChange={(e) => onChange({ ...config, patientIdColumn: (e.target as HTMLSelectElement).value })}
                >
                    <SelectItem value="" disabled text={loadingCols ? 'Loading…' : 'Select'} />
                    {colNames.map((c) => (
                        <SelectItem key={c} value={c} text={c} />
                    ))}
                </Select>

                <Select
                    id="theme-date-col"
                    labelText="date column"
                    value={config.dateColumn || ''}
                    disabled={!canPickCols}
                    onChange={(e) => onChange({ ...config, dateColumn: (e.target as HTMLSelectElement).value })}
                >
                    <SelectItem value="" disabled text={loadingCols ? 'Loading…' : 'Select'} />
                    {colNames.map((c) => (
                        <SelectItem key={c} value={c} text={c} />
                    ))}
                </Select>

                <Select
                    id="theme-location-col"
                    labelText="location column (optional)"
                    value={config.locationColumn || ''}
                    disabled={!canPickCols}
                    onChange={(e) => onChange({ ...config, locationColumn: (e.target as HTMLSelectElement).value })}
                >
                    <SelectItem value="" disabled text={loadingCols ? 'Loading…' : 'Select'} />
                    {colNames.map((c) => (
                        <SelectItem key={c} value={c} text={c} />
                    ))}
                </Select>
            </div>

            <div style={{ marginTop: '0.5rem' }}>
                {loadingCols ? <InlineLoading description="Loading columns…" /> : null}
                {!loadingCols && colsError ? (
                    <div style={{ color: 'var(--cds-text-error, #da1e28)' }}>{colsError}</div>
                ) : null}
            </div>
        </div>
    );
}

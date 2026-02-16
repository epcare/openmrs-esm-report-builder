import React from 'react';
import { Select, SelectItem, InlineLoading } from '@carbon/react';
import { useMambaTables } from '../../../hooks/theme/useMambaTables';
import { useMambaTableMeta } from '../../../hooks/theme/useMambaTableMeta';
import type { DataThemeConfig } from '../../../types/theme/data-theme.types';

type Props = {
    config: DataThemeConfig;
    onChange: (next: DataThemeConfig) => void;
    open: boolean; // ✅ only load when modal is open
};

export default function DataThemeSourceSection({ config, onChange, open }: Props) {
    const { tables, loading: loadingTables, error: tablesError } = useMambaTables(open);

    const shouldLoadCols = open && Boolean(config.sourceTable);
    const { columns, loading: loadingCols, error: colsError } = useMambaTableMeta(config.sourceTable, shouldLoadCols);

    const colNames = (columns ?? []).map((c) => c.name);

    // ✅ tolerate tables being string[] OR {name:string}[]
    const tableNames = React.useMemo(() => {
        const raw: any[] = (tables as any) ?? [];
        return raw
            .map((t) => (typeof t === 'string' ? t : t?.name))
            .filter(Boolean) as string[];
    }, [tables]);

    return (
        <div>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Source</div>

            <Select
                id="theme-source-table"
                labelText="Source table/view"
                value={config.sourceTable || ''}
                disabled={!open}
                onChange={(e) => {
                    const nextTable = (e.target as HTMLSelectElement).value;
                    onChange({
                        ...config,
                        sourceTable: nextTable,
                        patientIdColumn: '',
                        dateColumn: '',
                        locationColumn: '',
                        fields: config.fields ?? [],
                    });
                }}>
                <SelectItem value="" text={loadingTables ? 'Loading…' : 'Select a table'} />
                {tableNames.map((t) => (
                    <SelectItem key={t} value={t} text={t} />
                ))}
            </Select>

            <div style={{ marginTop: '0.5rem' }}>
                {loadingTables ? <InlineLoading description="Loading tables…" /> : null}
                {!loadingTables && tablesError ? (
                    <div style={{ color: 'var(--cds-text-error, #da1e28)' }}>{tablesError}</div>
                ) : null}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                <Select
                    id="theme-patient-id-col"
                    labelText="patient_id column"
                    value={config.patientIdColumn || ''}
                    onChange={(e) => onChange({ ...config, patientIdColumn: (e.target as HTMLSelectElement).value })}
                    disabled={!shouldLoadCols}
                >
                    <SelectItem value="" text={loadingCols ? 'Loading…' : 'Select'} />
                    {colNames.map((c) => (
                        <SelectItem key={c} value={c} text={c} />
                    ))}
                </Select>

                <Select
                    id="theme-date-col"
                    labelText="date column"
                    value={config.dateColumn || ''}
                    onChange={(e) => onChange({ ...config, dateColumn: (e.target as HTMLSelectElement).value })}
                    disabled={!shouldLoadCols}
                >
                    <SelectItem value="" text={loadingCols ? 'Loading…' : 'Select'} />
                    {colNames.map((c) => (
                        <SelectItem key={c} value={c} text={c} />
                    ))}
                </Select>

                <Select
                    id="theme-location-col"
                    labelText="location column (optional)"
                    value={config.locationColumn || ''}
                    onChange={(e) => onChange({ ...config, locationColumn: (e.target as HTMLSelectElement).value })}
                    disabled={!shouldLoadCols}
                >
                    <SelectItem value="" text={loadingCols ? 'Loading…' : 'Select'} />
                    {colNames.map((c) => (
                        <SelectItem key={c} value={c} text={c} />
                    ))}
                </Select>
            </div>

            <div style={{ marginTop: '0.5rem' }}>
                {loadingCols ? <InlineLoading description="Loading columns…" /> : null}
                {!loadingCols && colsError ? <div style={{ color: 'var(--cds-text-error, #da1e28)' }}>{colsError}</div> : null}
            </div>
        </div>
    );
}
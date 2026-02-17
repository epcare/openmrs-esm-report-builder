import React from 'react';
import { Modal, Stack, InlineLoading } from '@carbon/react';

import DataThemeBasicsSection from './sections/data-theme-basics.section';
import DataThemeSourceSection from './sections/data-theme-source.section';
import DataThemeFieldsEditorSection from './sections/data-theme-fields-editor.section';
import DataThemePreviewSection from './sections/data-theme-preview.section';

import type { DataTheme, DataThemeConfig } from '../../types/theme/data-theme.types';
import { getSchemaTables, type SchemaTable } from '../../services/theme/mamba-schema.api';
import { getMambaTableMeta, type TableColumn } from '../../services/theme/mamba-table-meta.api';

type Props = {
    open: boolean;
    mode: 'create' | 'edit';
    initial?: DataTheme | null;
    onClose: () => void;
    onSave: (payload: DataTheme) => void;
};

const defaultConfig: DataThemeConfig = {
    sourceTable: '',
    patientIdColumn: '',
    dateColumn: '',
    locationColumn: '',
    fields: [],
};

function toCode(name: string) {
    return (name ?? '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 30);
}

export default function DataThemeModal({ open, mode, initial, onClose, onSave }: Props) {
    const [name, setName] = React.useState('');
    const [code, setCode] = React.useState('');
    const [domain, setDomain] = React.useState<DataTheme['domain']>('OBSERVATIONS');
    const [description, setDescription] = React.useState('');

    const [config, setConfig] = React.useState<DataThemeConfig>(defaultConfig);
    const [configJson, setConfigJson] = React.useState<string>(JSON.stringify(defaultConfig, null, 2));

    // ✅ schema tables (modal owns this)
    const [tables, setTables] = React.useState<SchemaTable[]>([]);
    const [loadingTables, setLoadingTables] = React.useState(false);
    const [tablesError, setTablesError] = React.useState<string | null>(null);

    // ✅ columns (modal owns this)
    const [columns, setColumns] = React.useState<TableColumn[]>([]);
    const [loadingCols, setLoadingCols] = React.useState(false);
    const [colsError, setColsError] = React.useState<string | null>(null);

    // init when open
    React.useEffect(() => {
        if (!open) return;

        if (initial) {
            setName(initial.name ?? '');
            setCode(initial.code ?? '');
            setDomain(initial.domain ?? 'OBSERVATIONS');
            setDescription(initial.description ?? '');

            try {
                const parsed = initial.configJson ? (JSON.parse(initial.configJson) as DataThemeConfig) : defaultConfig;
                setConfig(parsed);
            } catch {
                setConfig(defaultConfig);
            }
        } else {
            setName('');
            setCode('');
            setDomain('OBSERVATIONS');
            setDescription('');
            setConfig(defaultConfig);
        }
    }, [open, initial]);

    // ✅ load tables when modal opens
    React.useEffect(() => {
        if (!open) return;

        const ac = new AbortController();
        setLoadingTables(true);
        setTablesError(null);
        setTables([]);

        getSchemaTables(ac.signal)
            .then((data) => setTables(data ?? []))
            .catch((e) => {
                if (e?.name !== 'AbortError') setTablesError(e?.message ?? 'Failed to load schema tables');
            })
            .finally(() => setLoadingTables(false));

        return () => ac.abort();
    }, [open]);

    // ✅ load columns when table changes
    React.useEffect(() => {
        if (!open) return;

        const table = config?.sourceTable;
        if (!table) {
            setColumns([]);
            setColsError(null);
            setLoadingCols(false);
            return;
        }

        const ac = new AbortController();
        setLoadingCols(true);
        setColsError(null);
        setColumns([]);

        getMambaTableMeta(table, ac.signal)
            .then((data) => setColumns(data ?? []))
            .catch((e) => {
                if (e?.name !== 'AbortError') setColsError(e?.message ?? 'Failed to load table columns');
            })
            .finally(() => setLoadingCols(false));

        return () => ac.abort();
    }, [open, config?.sourceTable]);

    // ✅ keep configJson synced
    React.useEffect(() => {
        setConfigJson(JSON.stringify(config ?? defaultConfig, null, 2));
    }, [config]);

    const schemaReady = open && !loadingTables && !tablesError;

    const canSave =
        schemaReady &&
        Boolean(name.trim()) &&
        Boolean((code.trim() || toCode(name)).trim()) &&
        Boolean(domain) &&
        Boolean(config?.sourceTable) &&
        Boolean(config?.patientIdColumn) &&
        Boolean(config?.dateColumn);

    const save = () => {
        if (!canSave) return;

        const payload: DataTheme = {
            ...(initial?.uuid ? { uuid: initial.uuid } : {}),
            name: name.trim(),
            code: (code.trim() || toCode(name)).trim(),
            domain,
            description: description.trim(),
            configJson,
        };

        onSave(payload);
    };

    if (!open) return null;

    // @ts-ignore
    return (
        <Modal
            open={open}
            modalHeading={mode === 'create' ? 'Create Data Theme' : 'Edit Data Theme'}
            primaryButtonText={mode === 'create' ? 'Create' : 'Save'}
            secondaryButtonText="Cancel"
            onRequestClose={onClose}
            onRequestSubmit={save}
            primaryButtonDisabled={!canSave}
        >
            <Stack gap={6}>
                {loadingTables ? <InlineLoading description="Loading schema tables…" /> : null}
                {!loadingTables && tablesError ? (
                    <div style={{ color: 'var(--cds-text-error, #da1e28)' }}>Failed to load schema tables: {tablesError}</div>
                ) : null}

                {schemaReady ? (
                    <>
                        <DataThemeBasicsSection
                            value={{ name, code, domain, description }}
                            onChange={(next) => {
                                setName(next.name);
                                setCode(next.code);
                                setDomain(next.domain);
                                setDescription(next.description ?? '');
                            }}
                        />

                        {/* ✅ THIS is where your big props go */}
                        <DataThemeSourceSection open={open} config={config} onChange={setConfig} />

                        <DataThemeFieldsEditorSection config={config} onChange={setConfig} open={open} />
                        <DataThemePreviewSection config={config} onConfigJson={setConfigJson} />
                    </>
                ) : null}
            </Stack>
        </Modal>
    );
}
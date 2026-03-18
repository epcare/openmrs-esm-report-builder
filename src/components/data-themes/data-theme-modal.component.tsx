import React from 'react';
import { Modal, Stack, InlineLoading, SideNav, SideNavItems, SideNavLink, Content } from '@carbon/react';

import DataThemeBasicsSection from './sections/data-theme-basics.section';
import DataThemeSourceSection from './sections/data-theme-source.section';
import DataThemeFieldsEditorSection from './sections/data-theme-fields-editor.section';
import DataThemeConditionsSection from './sections/data-theme-condition-columns.section';
import DataThemeMetadataSection, { type DataThemeMeta } from './sections/data-theme-metadata.section';
import DataThemePreviewSection from './sections/data-theme-preview.section';

import type { DataTheme, DataThemeConfig } from '../../types/theme/data-theme.types';
import { getSchemaTables, type SchemaTable } from '../../resources/theme/mamba-schema.api';
import { getMambaTableMeta, type TableColumn } from '../../resources/theme/mamba-table-meta.api';

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
    conditions: [],
};

const defaultMeta: DataThemeMeta = {
    icon: '',
    color: '#0f62fe',
    category: '',
    order: 0,
    beta: false,
    descriptionShort: '',
    allowedIndicatorKinds: ['BASE', 'FINAL'],
};

type PanelKey = 'basics' | 'source' | 'fields' | 'conditions' | 'metadata' | 'preview';

function toCode(name: string) {
    return (name ?? '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 30);
}

function safeParseJson<T>(raw: string | undefined | null, fallback: T): T {
    try {
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return (parsed ?? fallback) as T;
    } catch {
        return fallback;
    }
}

/**
 * Supports either:
 * 1) configJson string parses to { ...configFields }
 * 2) configJson string parses to { configJson: { ...configFields } }
 *
 * Also migrates legacy `conditionColumns` -> `conditions[]` when present AND conditions[] missing/empty.
 */
function parseConfig(raw: string | undefined | null): DataThemeConfig {
    const parsed = safeParseJson<any>(raw, defaultConfig);

    const base =
        parsed && typeof parsed === 'object' && parsed.configJson && typeof parsed.configJson === 'object'
            ? parsed.configJson
            : parsed;

    const cfg: any = { ...defaultConfig, ...(base ?? {}) };

    // normalize arrays defensively
    if (!Array.isArray(cfg.fields)) cfg.fields = [];
    if (!Array.isArray(cfg.conditions)) cfg.conditions = [];

    // MIGRATION: old themes might have conditionColumns map
    // Example: { "concept_id": "diagnosis_coded" }
    // Only migrate if conditions[] is missing/empty (do NOT overwrite real conditions).
    const hasLegacyMap = cfg.conditionColumns && typeof cfg.conditionColumns === 'object';
    const hasNoConditions = !Array.isArray(cfg.conditions) || cfg.conditions.length === 0;

    if (hasLegacyMap && hasNoConditions) {
        const entries = Object.entries(cfg.conditionColumns as Record<string, string>);
        cfg.conditions = entries.map(([key, column]) => {
            const looksLikeConcept = key.toLowerCase().includes('concept');
            return {
                key,
                label: key.replace(/_/g, ' '),
                handler: looksLikeConcept ? 'CONCEPT_SEARCH' : 'TEXT',
                column,
                operator: looksLikeConcept ? 'IN' : 'EQUALS',
                valueType: looksLikeConcept ? 'conceptId' : 'string',
            };
        });
    }

    // final guard
    if (!Array.isArray(cfg.conditions)) cfg.conditions = [];
    if (!Array.isArray(cfg.fields)) cfg.fields = [];

    return cfg as DataThemeConfig;
}

/**
 * Supports either:
 * 1) metaJson = { "metaJson": { ...fields } }
 * 2) metaJson = { ...fields }
 */
function parseMeta(raw: string | undefined | null): DataThemeMeta {
    const parsed = safeParseJson<any>(raw, defaultMeta);
    if (parsed && typeof parsed === 'object' && parsed.metaJson && typeof parsed.metaJson === 'object') {
        return { ...defaultMeta, ...parsed.metaJson };
    }
    return { ...defaultMeta, ...parsed };
}

function wrapMeta(meta: DataThemeMeta) {
    return JSON.stringify({ metaJson: meta }, null, 2);
}

export default function DataThemeModal({ open, mode, initial, onClose, onSave }: Props) {
    const [active, setActive] = React.useState<PanelKey>('basics');

    const [name, setName] = React.useState('');
    const [code, setCode] = React.useState('');
    const [domain, setDomain] = React.useState<DataTheme['domain']>('OBSERVATIONS');
    const [description, setDescription] = React.useState('');

    const [config, setConfig] = React.useState<DataThemeConfig>(defaultConfig);
    const [configJson, setConfigJson] = React.useState<string>(JSON.stringify(defaultConfig, null, 2));

    const [meta, setMeta] = React.useState<DataThemeMeta>(defaultMeta);
    const [metaJson, setMetaJson] = React.useState<string>(wrapMeta(defaultMeta));

    // schema tables
    const [tables, setTables] = React.useState<SchemaTable[]>([]);
    const [loadingTables, setLoadingTables] = React.useState(false);
    const [tablesError, setTablesError] = React.useState<string | null>(null);

    // table meta
    const [columns, setColumns] = React.useState<TableColumn[]>([]);
    const [loadingCols, setLoadingCols] = React.useState(false);
    const [colsError, setColsError] = React.useState<string | null>(null);

    // init when open (ensures edit pre-populates EVERYTHING)
    React.useEffect(() => {
        if (!open) return;

        setActive('basics');

        if (initial) {
            setName(initial.name ?? '');
            setCode(initial.code ?? '');
            setDomain(initial.domain ?? 'OBSERVATIONS');
            setDescription(initial.description ?? '');

            const parsedConfig = parseConfig(initial.configJson);
            setConfig(parsedConfig);
            setConfigJson(JSON.stringify(parsedConfig, null, 2));

            const parsedMeta = parseMeta((initial as any).metaJson);
            setMeta(parsedMeta);
            setMetaJson(wrapMeta(parsedMeta));
        } else {
            setName('');
            setCode('');
            setDomain('OBSERVATIONS');
            setDescription('');

            setConfig(defaultConfig);
            setConfigJson(JSON.stringify(defaultConfig, null, 2));

            setMeta(defaultMeta);
            setMetaJson(wrapMeta(defaultMeta));
        }
    }, [open, initial]);

    // load tables when modal opens
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

    // load columns when table changes
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

    // keep configJson synced when user edits config
    React.useEffect(() => {
        setConfigJson(JSON.stringify(config ?? defaultConfig, null, 2));
    }, [config]);

    // keep metaJson synced when user edits meta
    React.useEffect(() => {
        setMetaJson(wrapMeta(meta ?? defaultMeta));
    }, [meta]);

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
            metaJson,
        } as any;

        onSave(payload);
    };

    if (!open) return null;

    const NavLink = ({ id, label }: { id: PanelKey; label: string }) => (
        <SideNavLink isActive={active === id} onClick={() => setActive(id)}>
            {label}
        </SideNavLink>
    );

    return (
        <Modal
            open={open}
            modalHeading={mode === 'create' ? 'Create Data Theme' : 'Edit Data Theme'}
            primaryButtonText={mode === 'create' ? 'Create' : 'Save'}
            secondaryButtonText="Cancel"
            onRequestClose={onClose}
            onRequestSubmit={save}
            primaryButtonDisabled={!canSave}
            size="lg"
        >
            <Stack gap={6}>
                {loadingTables ? <InlineLoading description="Loading schema tables…" /> : null}
                {!loadingTables && tablesError ? (
                    <div style={{ color: 'var(--cds-text-error, #da1e28)' }}>
                        Failed to load schema tables: {tablesError}
                    </div>
                ) : null}

                {schemaReady ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1rem' }}>
                        <div>
                            <SideNav expanded isPersistent={false} aria-label="Theme editor sections">
                                <SideNavItems>
                                    <NavLink id="basics" label="Basics" />
                                    <NavLink id="source" label="Source" />
                                    <NavLink id="fields" label="Fields" />
                                    <NavLink id="conditions" label="Conditions" />
                                    <NavLink id="metadata" label="Metadata" />
                                    <NavLink id="preview" label="Preview" />
                                </SideNavItems>
                            </SideNav>
                        </div>

                        <Content style={{ padding: 0 }}>
                            {active === 'basics' ? (
                                <DataThemeBasicsSection
                                    value={{ name, code, domain, description }}
                                    onChange={(next) => {
                                        setName(next.name);
                                        setCode(next.code);
                                        setDomain(next.domain);
                                        setDescription(next.description ?? '');
                                    }}
                                />
                            ) : null}

                            {active === 'source' ? (
                                <>
                                    <DataThemeSourceSection open={open} config={config} onChange={setConfig} />
                                    {loadingCols ? <InlineLoading description="Loading columns…" /> : null}
                                    {!loadingCols && colsError ? (
                                        <div style={{ color: 'var(--cds-text-error, #da1e28)', marginTop: '0.5rem' }}>
                                            Failed to load table columns: {colsError}
                                        </div>
                                    ) : null}
                                </>
                            ) : null}

                            {active === 'fields' ? (<DataThemeFieldsEditorSection config={config} onChange={setConfig} open={open} />) : null}

                            {active === 'conditions' ? (<DataThemeConditionsSection open={open} config={config} onChange={setConfig} columns={columns} loadingCols={loadingCols}/>) : null}

                            {active === 'metadata' ? (<DataThemeMetadataSection value={meta} onChange={setMeta} open={open} />) : null}

                            {active === 'preview' ? (<DataThemePreviewSection config={config} metaJson={metaJson} onConfigJson={setConfigJson}/>
                            ) : null}
                        </Content>
                    </div>
                ) : null}
            </Stack>
        </Modal>
    );
}
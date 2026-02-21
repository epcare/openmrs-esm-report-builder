import React from 'react';
import { Modal, Stack, SideNav, SideNavItems, SideNavLink, Content } from '@carbon/react';

import { listDataThemes, getDataTheme, type DataThemeDto } from '../../services/theme/data-theme.api';
import type { DataThemeConfig } from './types/data-theme-config.types';
import type { IndicatorCondition } from './types/indicator-types';
import type { IndicatorDto } from '../../services/indicator/indicators.api';

import IndicatorBasicsSection from './sections/indicator-basics.section';
import IndicatorThemeSection from './sections/indicator-theme.section';
import IndicatorConditionsSection from './sections/indicator-conditions.section';
import IndicatorSqlPreviewSection from './sections/indicator-sql-preview.section';

import { buildSqlPreview, applyConditionClauses } from './utils/indicator-sql.utils';

import { searchConcepts, toSelectedConcept } from './utils/concept-preload.utils';
import type { SelectedConcept } from './handler/concept-search-multiselect.component';

type Props = {
    open: boolean;
    mode: 'create' | 'edit';
    initial?: IndicatorDto | null;

    onClose: () => void;
    onCreate: (payload: Partial<IndicatorDto>) => Promise<void>;
    onUpdate: (uuid: string, payload: Partial<IndicatorDto>) => Promise<void>;
    onSaved: () => void;
};

type PanelKey = 'basics' | 'theme' | 'conditions' | 'sql';

type BaseIndicatorAuthoring = {
    version: 1;
    themeUuid: string;
    themeConfig: DataThemeConfig;
    conditions: IndicatorCondition[];
    sqlPreview: string;
};

type QAUiState = { question: SelectedConcept | null; answers: SelectedConcept[]; error?: string };

function safeParse<T>(raw: string | undefined | null, fallback: T): T {
    try {
        if (!raw) return fallback;
        const p = JSON.parse(raw);
        return (p ?? fallback) as T;
    } catch {
        return fallback;
    }
}

function normalizeThemeConfig(rawConfigJson: string | undefined | null): DataThemeConfig {
    const base = safeParse<any>(rawConfigJson, {});
    if (base && typeof base === 'object' && base.configJson && typeof base.configJson === 'object') {
        return base.configJson as DataThemeConfig;
    }
    return base as DataThemeConfig;
}

function buildAuthoring(themeUuid: string, themeConfig: DataThemeConfig, conditions: IndicatorCondition[], sqlPreview: string): BaseIndicatorAuthoring {
    return { version: 1, themeUuid, themeConfig, conditions, sqlPreview };
}

export default function CreateBaseIndicatorModal({
                                                     open,
                                                     mode,
                                                     initial,
                                                     onClose,
                                                     onCreate,
                                                     onUpdate,
                                                     onSaved,
                                                 }: Props) {
    const isEdit = mode === 'edit';

    const [active, setActive] = React.useState<PanelKey>('basics');

    // basics
    const [name, setName] = React.useState('');
    const [code, setCode] = React.useState('');
    const [description, setDescription] = React.useState('');

    // themes list
    const [themes, setThemes] = React.useState<DataThemeDto[]>([]);
    const [loadingThemes, setLoadingThemes] = React.useState(false);
    const [themesError, setThemesError] = React.useState<string | null>(null);

    // theme selection + config
    const [themeUuid, setThemeUuid] = React.useState('');
    const [themeConfig, setThemeConfig] = React.useState<DataThemeConfig | null>(null);
    const [themeConfigError, setThemeConfigError] = React.useState<string | null>(null);

    // picked conditions (payload)
    const [pickedConditions, setPickedConditions] = React.useState<IndicatorCondition[]>([]);

    // UI-only selections
    const [conceptUi, setConceptUi] = React.useState<Record<string, SelectedConcept[]>>({});
    const [qaUi, setQaUi] = React.useState<Record<string, QAUiState>>({});

    // sql
    const [sqlPreview, setSqlPreview] = React.useState('');

    // load themes when modal opens
    React.useEffect(() => {
        if (!open) return;

        setActive('basics');

        const ac = new AbortController();
        setLoadingThemes(true);
        setThemesError(null);
        setThemes([]);

        listDataThemes(undefined, ac.signal)
            .then((data) => setThemes(data ?? []))
            .catch((e) => setThemesError(e?.message ?? 'Failed to load themes'))
            .finally(() => setLoadingThemes(false));

        return () => ac.abort();
    }, [open]);

    // init/reset
    React.useEffect(() => {
        if (!open) return;

        if (isEdit && initial) {
            setName(initial.name ?? '');
            setCode(initial.code ?? '');
            setDescription(initial.description ?? '');

            // ✅ authoring is the source of truth for edit
            const authoring = safeParse<BaseIndicatorAuthoring>(initial.configJson, null as any);

            if (authoring?.themeUuid && authoring?.themeConfig) {
                setThemeUuid(authoring.themeUuid);
                setThemeConfig(authoring.themeConfig);
                setPickedConditions(authoring.conditions ?? []);
                setSqlPreview(authoring.sqlPreview ?? '');
            } else {
                setThemeUuid(initial.themeUuid ?? '');
                setThemeConfig(null);
                setPickedConditions([]);
                setSqlPreview('');
            }

            setConceptUi({});
            setQaUi({});
        } else {
            setName('');
            setCode('');
            setDescription('');
            setThemeUuid('');
            setThemeConfig(null);
            setThemeConfigError(null);
            setPickedConditions([]);
            setConceptUi({});
            setQaUi({});
            setSqlPreview('');
        }
    }, [open, isEdit, initial]);

    // fetch theme config when themeUuid changes
    React.useEffect(() => {
        if (!open) return;

        if (!themeUuid) {
            setThemeConfig(null);
            setThemeConfigError(null);
            setPickedConditions([]);
            setConceptUi({});
            setQaUi({});
            setSqlPreview('');
            return;
        }

        // if edit already has matching themeConfig, skip
        if (themeConfig?.sourceTable && initial?.configJson) {
            const authoring = safeParse<BaseIndicatorAuthoring>(initial.configJson, null as any);
            if (authoring?.themeUuid === themeUuid && authoring?.themeConfig?.sourceTable === themeConfig.sourceTable) {
                return;
            }
        }

        const ac = new AbortController();
        setThemeConfigError(null);

        getDataTheme(themeUuid, ac.signal)
            .then((full) => {
                const cfg = normalizeThemeConfig(full.configJson);
                setThemeConfig(cfg);

                // initialize picked conditions if empty
                setPickedConditions((prev) => {
                    if (prev?.length) return prev;

                    return (cfg.conditions ?? []).map((c) => {
                        const defaultValue =
                            c.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH'
                                ? ({ question: null, answers: [] } as any)
                                : c.operator === 'IN' || c.operator === 'NOT_IN'
                                    ? []
                                    : '';
                        return {
                            key: c.key,
                            operator: c.operator,
                            valueType: c.valueType,
                            value: defaultValue,
                        } as IndicatorCondition;
                    });
                });

                // init UI maps
                const nextConcept: Record<string, SelectedConcept[]> = {};
                const nextQa: Record<string, QAUiState> = {};

                for (const c of cfg.conditions ?? []) {
                    if (c.handler === 'CONCEPT_SEARCH') nextConcept[c.key] = [];
                    if (c.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH') nextQa[c.key] = { question: null, answers: [] };
                }

                setConceptUi((prev) => ({ ...nextConcept, ...(prev ?? {}) }));
                setQaUi((prev) => ({ ...nextQa, ...(prev ?? {}) }));

                const base = buildSqlPreview(cfg);
                setSqlPreview(applyConditionClauses(base, cfg.conditions ?? [], pickedConditions?.length ? pickedConditions : []));
            })
            .catch((e) => setThemeConfigError(e?.message ?? 'Failed to load theme config'));

        return () => ac.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, themeUuid]);

    // preload concepts on edit (concept ids are stored, but UI needs full objects)
    React.useEffect(() => {
        if (!open || !isEdit) return;
        if (!themeConfig?.conditions?.length) return;
        if (!pickedConditions?.length) return;

        const ac = new AbortController();

        const run = async () => {
            const nextConceptUi: Record<string, SelectedConcept[]> = { ...(conceptUi ?? {}) };
            const nextQaUi: Record<string, QAUiState> = { ...(qaUi ?? {}) };

            for (const tc of themeConfig.conditions ?? []) {
                const pc = pickedConditions.find((x) => x.key === tc.key);
                if (!pc) continue;

                // CONCEPT_SEARCH
                if (tc.handler === 'CONCEPT_SEARCH') {
                    if (Array.isArray(nextConceptUi[tc.key]) && nextConceptUi[tc.key].length > 0) continue;
                    if (!Array.isArray(pc.value) || pc.value.length === 0) continue;

                    const selected: SelectedConcept[] = [];
                    for (const tok of pc.value.map((x) => String(x)).filter(Boolean)) {
                        try {
                            const found = await searchConcepts(tok, ac.signal);
                            const exact =
                                found.find((c: any) => String(c.id) === tok) ||
                                found.find((c: any) => String(c.uuid) === tok) ||
                                found[0];
                            if (exact) selected.push(toSelectedConcept(exact));
                        } catch {}
                    }
                    if (selected.length) nextConceptUi[tc.key] = selected;
                }

                // QUESTION_ANSWER_CONCEPT_SEARCH (question + answers)
                if (tc.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH') {
                    const ui = nextQaUi[tc.key] ?? { question: null, answers: [] };
                    if (ui.question || (ui.answers?.length ?? 0) > 0) continue;

                    const raw: any = pc.value;
                    if (!raw || typeof raw !== 'object' || !('question' in raw) || !Array.isArray(raw.answers)) continue;

                    const qTok = raw.question !== null && raw.question !== undefined ? String(raw.question) : '';
                    const aToks = (raw.answers ?? []).map((x: any) => String(x)).filter(Boolean);

                    let qSelected: SelectedConcept | null = null;
                    const aSelected: SelectedConcept[] = [];

                    if (qTok) {
                        try {
                            const found = await searchConcepts(qTok, ac.signal);
                            const exact =
                                found.find((c: any) => String(c.id) === qTok) ||
                                found.find((c: any) => String(c.uuid) === qTok) ||
                                found[0];
                            if (exact) qSelected = toSelectedConcept(exact);
                        } catch {}
                    }

                    for (const tok of aToks) {
                        try {
                            const found = await searchConcepts(tok, ac.signal);
                            const exact =
                                found.find((c: any) => String(c.id) === tok) ||
                                found.find((c: any) => String(c.uuid) === tok) ||
                                found[0];
                            if (exact) aSelected.push(toSelectedConcept(exact));
                        } catch {}
                    }

                    nextQaUi[tc.key] = { ...ui, question: qSelected, answers: aSelected };
                }
            }

            setConceptUi(nextConceptUi);
            setQaUi(nextQaUi);
        };

        run();
        return () => ac.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, isEdit, themeConfig, pickedConditions]);

    // recompute sql preview
    React.useEffect(() => {
        if (!themeConfig) return;
        const base = buildSqlPreview(themeConfig);
        setSqlPreview(applyConditionClauses(base, themeConfig.conditions ?? [], pickedConditions));
    }, [themeConfig, pickedConditions]);

    const canSave =
        Boolean(name.trim()) &&
        Boolean(themeUuid) &&
        Boolean(themeConfig?.sourceTable) &&
        Boolean(themeConfig?.patientIdColumn) &&
        Boolean(themeConfig?.dateColumn);

    const save = async () => {
        if (!canSave || !themeConfig) return;

        const authoring = buildAuthoring(themeUuid, themeConfig, pickedConditions, sqlPreview);

        const payload: Partial<IndicatorDto> = {
            name: name.trim(),
            code: code.trim() || undefined,
            description: description.trim() || undefined,
            kind: 'BASE',
            defaultValueType: 'NUMBER',
            themeUuid,
            configJson: JSON.stringify(authoring, null, 2),
            sqlTemplate: sqlPreview,
            metaJson: undefined,
        };

        if (isEdit && initial?.uuid) await onUpdate(initial.uuid, payload);
        else await onCreate(payload);

        onSaved();
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
            modalHeading={isEdit ? 'Edit Base Indicator' : 'Create Base Indicator'}
            primaryButtonText={isEdit ? 'Save' : 'Create'}
            secondaryButtonText="Cancel"
            onRequestClose={onClose}
            onRequestSubmit={save}
            primaryButtonDisabled={!canSave}
            size="lg"
        >
            <Stack gap={6}>
                <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1rem' }}>
                    <div>
                        <SideNav expanded isPersistent={false} aria-label="Indicator editor sections">
                            <SideNavItems>
                                <NavLink id="basics" label="Basics" />
                                <NavLink id="theme" label="Theme" />
                                <NavLink id="conditions" label="Conditions" />
                                <NavLink id="sql" label="SQL Preview" />
                            </SideNavItems>
                        </SideNav>
                    </div>

                    <Content style={{ padding: 0 }}>
                        {active === 'basics' ? (<IndicatorBasicsSection value={{ name, code, description }} onChange={(next) => {setName(next.name);setCode(next.code);setDescription(next.description);}}/>) : null}

                        {active === 'theme' ? (<IndicatorThemeSection themes={themes} loading={loadingThemes} error={themesError} themeUuid={themeUuid} onThemeUuidChange={setThemeUuid} themeConfigError={themeConfigError}/>) : null}

                        {active === 'conditions' ? (<IndicatorConditionsSection conditions={themeConfig?.conditions ?? []} picked={pickedConditions} onPickedChange={setPickedConditions} conceptUi={conceptUi} onConceptUiChange={setConceptUi} qaUi={qaUi} onQaUiChange={setQaUi}/>) : null}

                        {active === 'sql' ? <IndicatorSqlPreviewSection sql={sqlPreview} /> : null}
                    </Content>
                </div>
            </Stack>
        </Modal>
    );
}
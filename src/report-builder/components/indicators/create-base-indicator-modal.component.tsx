import React from 'react';
import { Modal, Stack, SideNav, SideNavItems, SideNavLink, Content } from '@carbon/react';

import { listDataThemes, getDataTheme, type DataThemeDto } from '../../services/theme/data-theme.api';
import type { DataThemeConfig, ThemeCondition } from './types/data-theme-config.types';
import type { IndicatorCondition } from './types/indicator-types';
import type { IndicatorDto } from '../../services/indicator/indicators.api';

import IndicatorBasicsSection from './sections/indicator-basics.section';
import IndicatorThemeSection from './sections/indicator-theme.section';
import IndicatorConditionsSection from './sections/indicator-conditions.section';
import IndicatorSqlPreviewSection from './sections/indicator-sql-preview.section';

import { buildSqlPreview, applyConditionClauses } from './utils/indicator-sql.utils';

import type { SelectedConcept } from './handler/concept-search-multiselect.component';

type PanelKey = 'basics' | 'theme' | 'conditions' | 'sql';

export type QAUiState = { question: SelectedConcept | null; answers: SelectedConcept[]; error?: string };

type Props = {
    open: boolean;
    mode: 'create' | 'edit';
    initial?: IndicatorDto | null;

    // page-preloaded UI state for edit
    initialConceptUi?: Record<string, SelectedConcept[]>;
    initialQaUi?: Record<string, QAUiState>;

    onClose: () => void;
    onCreate: (payload: Partial<IndicatorDto>) => Promise<void>;
    onUpdate: (uuid: string, payload: Partial<IndicatorDto>) => Promise<void>;
    onSaved: () => void;
};

type BaseIndicatorAuthoring = {
    version: 1;
    themeUuid: string;
    themeConfig: DataThemeConfig;
    conditions: IndicatorCondition[];
    sqlPreview: string;
};

type QAValue = { question: string | null; answers: string[] };

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

/**
 * Supports multiple historical shapes of configJson:
 * - v1 flat: { themeUuid, themeConfig, conditions, sqlPreview }
 * - { base: { ... } }
 * - { authoring: { base: { ... } } }
 */
function normalizeAuthoring(ind: IndicatorDto | null | undefined): BaseIndicatorAuthoring | null {
    if (!ind?.configJson) return null;

    let parsed: any = null;
    try {
        parsed = JSON.parse(ind.configJson);
    } catch {
        return null;
    }
    if (!parsed || typeof parsed !== 'object') return null;

    // flat v1
    if (parsed.themeUuid && parsed.themeConfig) {
        return {
            version: 1,
            themeUuid: parsed.themeUuid,
            themeConfig: parsed.themeConfig,
            conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
            sqlPreview: parsed.sqlPreview ?? ind.sqlTemplate ?? '',
        };
    }

    // { base: {...} }
    if (parsed.base?.themeUuid && parsed.base?.themeConfig) {
        return {
            version: 1,
            themeUuid: parsed.base.themeUuid,
            themeConfig: parsed.base.themeConfig,
            conditions: Array.isArray(parsed.base.conditions) ? parsed.base.conditions : [],
            sqlPreview: parsed.base.sqlPreview ?? ind.sqlTemplate ?? '',
        };
    }

    // { authoring: { base: {...} } }
    if (parsed.authoring?.base?.themeUuid && parsed.authoring?.base?.themeConfig) {
        const b = parsed.authoring.base;
        return {
            version: 1,
            themeUuid: b.themeUuid,
            themeConfig: b.themeConfig,
            conditions: Array.isArray(b.conditions) ? b.conditions : [],
            sqlPreview: b.sqlPreview ?? ind.sqlTemplate ?? '',
        };
    }

    return null;
}

function buildAuthoring(
    themeUuid: string,
    themeConfig: DataThemeConfig,
    conditions: IndicatorCondition[],
    sqlPreview: string,
): BaseIndicatorAuthoring {
    return { version: 1, themeUuid, themeConfig, conditions, sqlPreview };
}

/**
 * ✅ Key improvement:
 * Before saving, enforce that concept-based conditions persist UUIDs (not numeric ids),
 * using the UI maps as the source of truth (conceptUi / qaUi).
 *
 * This eliminates “q doesn’t find numeric ids” problems during edit hydration.
 */
function prepareConditionsForSave(
    themeConditions: ThemeCondition[],
    picked: IndicatorCondition[],
    conceptUi: Record<string, SelectedConcept[]>,
    qaUi: Record<string, QAUiState>,
): IndicatorCondition[] {
    const themeByKey = new Map<string, ThemeCondition>();
    for (const tc of themeConditions ?? []) if (tc?.key) themeByKey.set(tc.key, tc);

    const byKey = new Map<string, IndicatorCondition>();
    for (const pc of picked ?? []) if (pc?.key) byKey.set(pc.key, pc);

    const next: IndicatorCondition[] = [];

    for (const tc of themeConditions ?? []) {
        if (!tc?.key) continue;

        const existing = byKey.get(tc.key);
        const base: IndicatorCondition = existing
            ? { ...existing }
            : ({
                key: tc.key,
                operator: tc.operator,
                valueType: tc.valueType,
                value:
                    tc.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH'
                        ? ({ question: null, answers: [] } as any)
                        : tc.operator === 'IN' || tc.operator === 'NOT_IN'
                            ? []
                            : '',
            } as any);

        // CONCEPT_SEARCH -> store UUID list
        if (tc.handler === 'CONCEPT_SEARCH') {
            const selected = conceptUi?.[tc.key] ?? [];
            const uuids = (selected ?? []).map((c) => c.uuid).filter(Boolean);

            base.valueType = 'conceptUuid' as any;
            base.value = uuids as any;
        }

        // QUESTION_ANSWER_CONCEPT_SEARCH -> store UUID question + UUID answers
        if (tc.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH') {
            const ui = qaUi?.[tc.key] ?? { question: null, answers: [] };
            const qUuid = ui.question?.uuid ?? null;
            const aUuids = (ui.answers ?? []).map((a) => a.uuid).filter(Boolean);

            base.valueType = 'conceptUuid' as any;
            base.value = { question: qUuid, answers: aUuids } as QAValue as any;
        }

        next.push(base);
    }

    // Keep any picked conditions that no longer exist on theme (optional).
    // Safer default: keep them to avoid data loss.
    for (const pc of picked ?? []) {
        if (!pc?.key) continue;
        if (!themeByKey.has(pc.key)) next.push(pc);
    }

    return next;
}

export default function CreateBaseIndicatorModal({
                                                     open,
                                                     mode,
                                                     initial,
                                                     initialConceptUi,
                                                     initialQaUi,
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

    // UI-only selections (fed by page in edit mode)
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

    // init/reset (consumes preloaded UI state from page)
    React.useEffect(() => {
        if (!open) return;

        if (isEdit && initial) {
            setName(initial.name ?? '');
            setCode(initial.code ?? '');
            setDescription(initial.description ?? '');

            const authoring = normalizeAuthoring(initial);

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

            // use page-provided UI maps immediately
            setConceptUi(initialConceptUi ?? {});
            setQaUi(initialQaUi ?? {});
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
    }, [open, isEdit, initial, initialConceptUi, initialQaUi]);

    // fetch theme config when themeUuid changes
    React.useEffect(() => {
        if (!open) return;

        if (!themeUuid) {
            setThemeConfig(null);
            setThemeConfigError(null);
            setPickedConditions([]);
            setSqlPreview('');
            return;
        }

        // if edit already has matching themeConfig, skip
        if (themeConfig?.sourceTable && initial?.configJson) {
            const authoring = normalizeAuthoring(initial);
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

                // initialize picked conditions if empty (create mode)
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

                // only initialize missing keys; do NOT overwrite page-preloaded UI maps
                setConceptUi((prev) => {
                    const next = { ...(prev ?? {}) };
                    for (const c of cfg.conditions ?? []) {
                        if (c.handler === 'CONCEPT_SEARCH' && !(c.key in next)) next[c.key] = [];
                    }
                    return next;
                });

                setQaUi((prev) => {
                    const next = { ...(prev ?? {}) };
                    for (const c of cfg.conditions ?? []) {
                        if (c.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH' && !(c.key in next)) {
                            next[c.key] = { question: null, answers: [] };
                        }
                    }
                    return next;
                });
            })
            .catch((e) => setThemeConfigError(e?.message ?? 'Failed to load theme config'));

        return () => ac.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, themeUuid]);

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

        // ✅ enforce UUID persistence for concept-based conditions
        const preparedConditions = prepareConditionsForSave(themeConfig.conditions ?? [], pickedConditions, conceptUi, qaUi);

        const authoring = buildAuthoring(themeUuid, themeConfig, preparedConditions, sqlPreview);

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
                        {active === 'basics' ? (
                            <IndicatorBasicsSection
                                value={{ name, code, description }}
                                onChange={(next) => {
                                    setName(next.name);
                                    setCode(next.code);
                                    setDescription(next.description);
                                }}
                            />
                        ) : null}

                        {active === 'theme' ? (
                            <IndicatorThemeSection
                                themes={themes}
                                loading={loadingThemes}
                                error={themesError}
                                themeUuid={themeUuid}
                                onThemeUuidChange={setThemeUuid}
                                themeConfigError={themeConfigError}
                            />
                        ) : null}

                        {active === 'conditions' ? (
                            <IndicatorConditionsSection
                                conditions={themeConfig?.conditions ?? []}
                                picked={pickedConditions}
                                onPickedChange={setPickedConditions}
                                conceptUi={conceptUi}
                                onConceptUiChange={setConceptUi}
                                qaUi={qaUi}
                                onQaUiChange={setQaUi}
                            />
                        ) : null}

                        {active === 'sql' ? <IndicatorSqlPreviewSection sql={sqlPreview} /> : null}
                    </Content>
                </div>
            </Stack>
        </Modal>
    );
}
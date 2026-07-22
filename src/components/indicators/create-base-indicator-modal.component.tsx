import React from 'react';
import { Modal, Stack, SideNav, SideNavItems, SideNavLink, Content, Toggle } from '@carbon/react';

import { listDataThemes, getDataTheme, type DataThemeDto } from '../../resources/theme/data-theme.api';
import type { DataThemeConfig, ThemeCondition } from './types/data-theme-config.types';
import type { IndicatorCondition } from './types/indicator-types';
import type { IndicatorDto } from '../../resources/indicator/indicators.api';

import IndicatorBasicsSection from './sections/indicator-basics.section';
import IndicatorThemeSection from './sections/indicator-theme.section';
import IndicatorConditionsSection from './sections/indicator-conditions.section';
import IndicatorSqlPreviewSection from './sections/indicator-sql-preview.section';
import CustomConditionInput, { type CustomCondition } from './custom-condition-input.component';

import { buildSqlPreview, applyConditionClauses, applyCustomConditions } from './utils/indicator-sql.utils';
import type { SelectedConcept } from './handler/concept-search-multiselect.component';
import type { QAUiState } from './types/condition-ui.types';

type PanelKey = 'basics' | 'theme' | 'conditions' | 'sql';



type Props = {
    open: boolean;
    mode: 'create' | 'edit';
    initial?: IndicatorDto | null;

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
    customConditions?: CustomCondition[];
    excludeDateFilter?: boolean;
    sqlPreview: string;
};

type QAValue = { questions: string[]; answers: string[] };

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

function normalizeAuthoring(ind: IndicatorDto | null | undefined): BaseIndicatorAuthoring | null {
    if (!ind?.configJson) return null;

    let parsed: any = null;
    try {
        parsed = JSON.parse(ind.configJson);
    } catch {
        return null;
    }
    if (!parsed || typeof parsed !== 'object') return null;

    if (parsed.themeUuid && parsed.themeConfig) {
        return {
            version: 1,
            themeUuid: parsed.themeUuid,
            themeConfig: parsed.themeConfig,
            conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
            customConditions: Array.isArray(parsed.customConditions) ? parsed.customConditions : [],
            excludeDateFilter: parsed.excludeDateFilter === true,
            sqlPreview: parsed.sqlPreview ?? ind.sqlTemplate ?? '',
        };
    }

    if (parsed.base?.themeUuid && parsed.base?.themeConfig) {
        return {
            version: 1,
            themeUuid: parsed.base.themeUuid,
            themeConfig: parsed.base.themeConfig,
            conditions: Array.isArray(parsed.base.conditions) ? parsed.base.conditions : [],
            customConditions: Array.isArray(parsed.base.customConditions) ? parsed.base.customConditions : [],
            excludeDateFilter: parsed.base.excludeDateFilter === true,
            sqlPreview: parsed.base.sqlPreview ?? ind.sqlTemplate ?? '',
        };
    }

    if (parsed.authoring?.base?.themeUuid && parsed.authoring?.base?.themeConfig) {
        const b = parsed.authoring.base;
        return {
            version: 1,
            themeUuid: b.themeUuid,
            themeConfig: b.themeConfig,
            conditions: Array.isArray(b.conditions) ? b.conditions : [],
            customConditions: Array.isArray(b.customConditions) ? b.customConditions : [],
            excludeDateFilter: b.excludeDateFilter === true,
            sqlPreview: b.sqlPreview ?? ind.sqlTemplate ?? '',
        };
    }

    return null;
}

function buildAuthoring(
    themeUuid: string,
    themeConfig: DataThemeConfig,
    conditions: IndicatorCondition[],
    customConditions: CustomCondition[],
    excludeDateFilter: boolean,
    sqlPreview: string,
): BaseIndicatorAuthoring {
    return { version: 1, themeUuid, themeConfig, conditions, customConditions, excludeDateFilter, sqlPreview };
}

function defaultValueForTheme(tc: ThemeCondition) {
    if (tc.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH') return { questions: [], answers: [] } as any;
    if (tc.operator === 'IN' || tc.operator === 'NOT_IN') return [] as any;
    if (tc.operator === 'BETWEEN' || tc.handler === 'DATE_RANGE') return { start: '', end: '' } as any;
    return '' as any;
}

/**
 * ✅ Ensures pickedConditions has entries for all theme conditions.
 * Keeps existing values.
 */
function normalizePickedAgainstTheme(themeConditions: ThemeCondition[], picked: IndicatorCondition[]) {
    const byKey = new Map<string, IndicatorCondition>();
    for (const p of picked ?? []) if (p?.key) byKey.set(p.key, p);

    const next: IndicatorCondition[] = [];

    for (const tc of themeConditions ?? []) {
        if (!tc?.key) continue;

        const existing = byKey.get(tc.key);
        if (existing) {
            next.push(existing);
            continue;
        }

        next.push({
            key: tc.key,
            operator: tc.operator as any,
            valueType: tc.valueType as any,
            value: defaultValueForTheme(tc),
        } as any);
    }

    // keep unknown keys to avoid data loss
    for (const p of picked ?? []) {
        if (!p?.key) continue;
        if (!byKey.has(p.key)) continue;
        // already included
    }
    for (const p of picked ?? []) {
        if (!p?.key) continue;
        const inTheme = (themeConditions ?? []).some((tc) => tc?.key === p.key);
        if (!inTheme) next.push(p);
    }

    return next;
}

/**
 * Before saving, enforce that concept-based conditions persist UUIDs using UI maps.
 */
function prepareConditionsForSave(
    themeConditions: ThemeCondition[],
    picked: IndicatorCondition[],
    conceptUi: Record<string, SelectedConcept[]>,
    qaUi: Record<string, QAUiState>,
): IndicatorCondition[] {
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
                value: defaultValueForTheme(tc),
            } as any);

        if (tc.handler === 'CONCEPT_SEARCH') {
            const selected = conceptUi?.[tc.key] ?? [];
            const uuids = (selected ?? []).map((c) => c.uuid).filter(Boolean);
            base.valueType = 'conceptUuid' as any;
            base.value = uuids as any;
        }

        if (tc.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH') {
            const ui = qaUi?.[tc.key] ?? { questions: [], answers: [] };
            const qUuids = (ui.questions ?? []).map((q) => q.uuid).filter(Boolean);
            const aUuids = (ui.answers ?? []).map((a) => a.uuid).filter(Boolean);

            base.valueType = 'conceptUuid' as any;
            base.value = { questions: qUuids, answers: aUuids } as QAValue as any;
        }

        next.push(base);
    }

    // keep unknown keys
    const themeKeys = new Set((themeConditions ?? []).map((t) => t?.key).filter(Boolean) as string[]);
    for (const pc of picked ?? []) {
        if (!pc?.key) continue;
        if (!themeKeys.has(pc.key)) next.push(pc);
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

    const [name, setName] = React.useState('');
    const [code, setCode] = React.useState('');
    const [description, setDescription] = React.useState('');

    const [themes, setThemes] = React.useState<DataThemeDto[]>([]);
    const [loadingThemes, setLoadingThemes] = React.useState(false);
    const [themesError, setThemesError] = React.useState<string | null>(null);

    const [themeUuid, setThemeUuid] = React.useState('');
    const [themeConfig, setThemeConfig] = React.useState<DataThemeConfig | null>(null);
    const [themeConfigError, setThemeConfigError] = React.useState<string | null>(null);

    const [pickedConditions, setPickedConditions] = React.useState<IndicatorCondition[]>([]);

    const [customConditions, setCustomConditions] = React.useState<CustomCondition[]>([]);

    const [excludeDateFilter, setExcludeDateFilter] = React.useState(false);

    const [conceptUi, setConceptUi] = React.useState<Record<string, SelectedConcept[]>>({});
    const [qaUi, setQaUi] = React.useState<Record<string, QAUiState>>({});

    const [sqlPreview, setSqlPreview] = React.useState('');
    const [sqlDirty, setSqlDirty] = React.useState(false);

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
                setCustomConditions(authoring.customConditions ?? []);
                setExcludeDateFilter(authoring.excludeDateFilter ?? false);
                setSqlPreview(authoring.sqlPreview ?? '');
            } else {
                setThemeUuid(initial.themeUuid ?? '');
                setThemeConfig(null);
                setPickedConditions([]);
                setCustomConditions([]);
                setExcludeDateFilter(false);
                setSqlPreview('');
            }

            setConceptUi(initialConceptUi ?? {});
            setQaUi(initialQaUi ?? {});
            setSqlDirty(false);
        } else {
            setName('');
            setCode('');
            setDescription('');
            setThemeUuid('');
            setThemeConfig(null);
            setThemeConfigError(null);
            setPickedConditions([]);
            setCustomConditions([]);
            setExcludeDateFilter(false);
            setConceptUi({});
            setQaUi({});
            setSqlPreview('');
            setSqlDirty(true);
        }
    }, [open, isEdit, initial, initialConceptUi, initialQaUi]);

    const onThemeUuidChange = React.useCallback((uuid: string) => {
        setThemeUuid(uuid);
        setSqlDirty(true);
    }, []);

    const onPickedChange = React.useCallback(
        (next: React.SetStateAction<IndicatorCondition[]>) => {
            setPickedConditions(next);
            setSqlDirty(true);
        },
        [],
    );

    React.useEffect(() => {
        if (!open) return;

        if (!themeUuid) {
            setThemeConfig(null);
            setThemeConfigError(null);
            setPickedConditions([]);
            if (!isEdit) setSqlPreview('');
            return;
        }

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

                // ✅ CRITICAL: normalize picked so ALL theme conditions exist (fixes SQL preview)
                setPickedConditions((prev) => normalizePickedAgainstTheme(cfg.conditions ?? [], prev ?? []));

                // init missing UI keys only
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
                            next[c.key] = { questions: [], answers: [] };
                        }
                    }
                    return next;
                });
            })
            .catch((e) => setThemeConfigError(e?.message ?? 'Failed to load theme config'));

        return () => ac.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, themeUuid]);

    React.useEffect(() => {
        if (!themeConfig) return;

        if (isEdit && !sqlDirty) return;

        const base = buildSqlPreview(themeConfig, excludeDateFilter);
        const withThemeConditions = applyConditionClauses(base, themeConfig.conditions ?? [], pickedConditions);
        setSqlPreview(applyCustomConditions(withThemeConditions, customConditions));
    }, [themeConfig, pickedConditions, customConditions, excludeDateFilter, isEdit, sqlDirty]);

    const canSave =
        Boolean(name.trim()) &&
        Boolean(themeUuid) &&
        Boolean(themeConfig?.sourceTable) &&
        Boolean(themeConfig?.patientIdColumn) &&
        Boolean(themeConfig?.dateColumn);

    const save = async () => {
        if (!canSave || !themeConfig) return;

        const preparedConditions = prepareConditionsForSave(themeConfig.conditions ?? [], pickedConditions, conceptUi, qaUi);
        const authoring = buildAuthoring(themeUuid, themeConfig, preparedConditions, customConditions, excludeDateFilter, sqlPreview);

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
                            <Stack gap={6}>
                                <IndicatorThemeSection
                                    themes={themes}
                                    loading={loadingThemes}
                                    error={themesError}
                                    themeUuid={themeUuid}
                                    onThemeUuidChange={onThemeUuidChange}
                                    themeConfigError={themeConfigError}
                                />
                                {themeConfig?.dateColumn ? (
                                    <div style={{
                                        padding: '1rem',
                                        backgroundColor: 'var(--cds-background, #f4f4f4)',
                                        borderRadius: '0.25rem',
                                        border: '1px solid var(--cds-interactive-01, #0f62fe)'
                                    }}>
                                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                                            Date Filtering Control
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary, #525252)', marginBottom: '1rem' }}>
                                            By default, the theme automatically filters by <code>{themeConfig.dateColumn}</code> between the start and end dates.
                                            You can exclude this to define your own custom date conditions.
                                        </div>
                                        <Toggle
                                            id="exclude-date-filter"
                                            labelText="Exclude automatic date filtering"
                                            labelA="Use theme date filtering"
                                            labelB="Use custom date conditions"
                                            toggled={excludeDateFilter}
                                            onToggle={(checked) => {
                                                setExcludeDateFilter(checked);
                                                setSqlDirty(true);
                                            }}
                                        />
                                    </div>
                                ) : null}
                            </Stack>
                        ) : null}

                        {active === 'conditions' ? (
                            <Stack gap={8}>
                                <IndicatorConditionsSection
                                    conditions={themeConfig?.conditions ?? []}
                                    picked={pickedConditions}
                                    onPickedChange={onPickedChange}
                                    conceptUi={conceptUi}
                                    onConceptUiChange={(next) => {
                                        setConceptUi(next);
                                        setSqlDirty(true);
                                    }}
                                    qaUi={qaUi}
                                    onQaUiChange={(next) => {
                                        setQaUi(next);
                                        setSqlDirty(true);
                                    }}
                                />
                                <div style={{ marginTop: '2rem', borderTop: '1px solid var(--cds-interactive-01, #0f62fe)', paddingTop: '1.5rem' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Custom Conditions</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-secondary, #525252)', marginBottom: '1rem' }}>
                                        Add your own conditions beyond the theme-defined ones. These will be applied in addition to the theme conditions.
                                    </div>
                                    <CustomConditionInput
                                        conditions={customConditions}
                                        onChange={(next) => {
                                            setCustomConditions(next);
                                            setSqlDirty(true);
                                        }}
                                    />
                                </div>
                            </Stack>
                        ) : null}

                        {active === 'sql' ? <IndicatorSqlPreviewSection sql={sqlPreview} /> : null}
                    </Content>
                </div>
            </Stack>
        </Modal>
    );
}
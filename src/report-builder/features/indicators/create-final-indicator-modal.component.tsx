import React from 'react';
import { Modal, Stack, InlineLoading, InlineNotification } from '@carbon/react';

import type { IndicatorDto } from '../../services/indicator/indicators.api';
import { getIndicator } from '../../services/indicator/indicators.api';

import type { BaseIndicatorOption } from './types/composite-indicator.types';
import { listAgeCategoriesWithGroups, type AgeCategoryOption } from '../../services/agegroup/mamba-agegroups.api';

import FinalIndicatorBasicsSection from './sections/final-indicator-basics.section';
import FinalIndicatorPickerSection from './sections/final-indicator-picker.section';
import FinalIndicatorDisaggregationSection from './sections/final-indicator-disaggregation.section';
import FinalIndicatorResultsPreviewSection from './sections/final-indicator-results-preview.section';

import { buildFinalIndicatorSql, type FinalIndicatorAuthoringV1 } from './utils/final-indicator-sql.utils';

type Props = {
    open: boolean;
    mode?: 'create' | 'edit';
    initial?: IndicatorDto | null;

    baseIndicators: BaseIndicatorOption[];

    onClose: () => void;

    onCreate: (payload: Partial<IndicatorDto>) => Promise<void>;
    onUpdate?: (uuid: string, payload: Partial<IndicatorDto>) => Promise<void>;
    onSaved: () => void;
};

function safeParseJson<T = any>(input?: string | null): T | null {
    if (!input) return null;
    try {
        return JSON.parse(input) as T;
    } catch {
        return null;
    }
}

const toCode = (name: string) =>
    name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 50);

function todayIso(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function CreateFinalIndicatorModal({
                                                      open,
                                                      mode = 'create',
                                                      initial,
                                                      baseIndicators,
                                                      onClose,
                                                      onCreate,
                                                      onUpdate,
                                                      onSaved,
                                                  }: Props) {
    const [ageCategories, setAgeCategories] = React.useState<AgeCategoryOption[]>([]);
    const [loadingCats, setLoadingCats] = React.useState(false);
    const [catsError, setCatsError] = React.useState<string | null>(null);

    const [basics, setBasics] = React.useState({ name: '', code: '', description: '' });

    const [baseIndicatorId, setBaseIndicatorId] = React.useState('');
    const [ageCategoryCode, setAgeCategoryCode] = React.useState('');
    const [genders, setGenders] = React.useState<Array<'F' | 'M'>>(['F', 'M']);

    const [baseFull, setBaseFull] = React.useState<IndicatorDto | null>(null);
    const [loadingBase, setLoadingBase] = React.useState(false);
    const [baseError, setBaseError] = React.useState<string | null>(null);

    const [sqlPreview, setSqlPreview] = React.useState('');

    // ✅ Preview parameters (must be inside component)
    const [previewStartDate, setPreviewStartDate] = React.useState('2025-01-01');
    const [previewEndDate, setPreviewEndDate] = React.useState(todayIso);

    // load categories when modal opens
    React.useEffect(() => {
        if (!open) return;
        const ac = new AbortController();

        setLoadingCats(true);
        setCatsError(null);

        listAgeCategoriesWithGroups(ac.signal)
            .then((items) => setAgeCategories(items))
            .catch((e: any) => setCatsError(e?.message ?? 'Failed to load age categories'))
            .finally(() => setLoadingCats(false));

        return () => ac.abort();
    }, [open]);

    // init create vs edit
    React.useEffect(() => {
        if (!open) return;

        if (mode === 'edit' && initial?.uuid) {
            const cfg = safeParseJson<Partial<FinalIndicatorAuthoringV1>>(initial.configJson) ?? {};

            setBasics({
                name: initial.name ?? '',
                code: initial.code ?? '',
                description: initial.description ?? '',
            });

            setBaseIndicatorId(String(cfg.baseIndicatorId ?? ''));
            setAgeCategoryCode(String(cfg.ageGroupSetCode ?? cfg.ageCategoryCode ?? '')); // tolerate both keys
            setGenders((cfg.genders as any) ?? ['F', 'M']);

            setSqlPreview(String(cfg.sqlPreview ?? initial.sqlTemplate ?? ''));

            // keep preview dates as-is (user controlled)
            return;
        }

        // create defaults
        setBasics({ name: '', code: '', description: '' });
        setBaseIndicatorId('');
        setAgeCategoryCode('');
        setGenders(['F', 'M']);
        setSqlPreview('');
        setBaseFull(null);
        setBaseError(null);
        // preview dates remain (or you can reset here if desired)
    }, [open, mode, initial?.uuid]);

    // load full base indicator
    React.useEffect(() => {
        if (!open) return;
        if (!baseIndicatorId) {
            setBaseFull(null);
            return;
        }

        const ac = new AbortController();
        setLoadingBase(true);
        setBaseError(null);

        getIndicator(baseIndicatorId, ac.signal, 'full')
            .then((full) => setBaseFull(full))
            .catch((e: any) => setBaseError(e?.message ?? 'Failed to load selected base indicator'))
            .finally(() => setLoadingBase(false));

        return () => ac.abort();
    }, [open, baseIndicatorId]);

    // compute sql preview
    React.useEffect(() => {
        if (!open) return;

        if (!baseFull || !ageCategoryCode) {
            setSqlPreview('');
            return;
        }

        const sql = buildFinalIndicatorSql({
            baseIndicator: baseFull,
            ageCategoryCode,
            genders,
        });

        setSqlPreview(sql);
    }, [open, baseFull, ageCategoryCode, genders]);

    const canSubmit =
        Boolean(basics.name.trim()) &&
        Boolean(baseIndicatorId) &&
        Boolean(ageCategoryCode) &&
        Boolean(sqlPreview.trim());

    const submit = async () => {
        if (!canSubmit || !baseFull) return;

        const finalCode = basics.code.trim() ? basics.code.trim().toUpperCase() : toCode(basics.name);

        // store both keys for forward compatibility (you can later remove ageGroupSetCode)
        const authoring: any = {
            version: 1,
            baseIndicatorId,
            ageCategoryCode,
            ageGroupSetCode: ageCategoryCode,
            genders,
            sqlPreview,
        };

        const payload: Partial<IndicatorDto> = {
            name: basics.name.trim(),
            code: finalCode,
            description: basics.description.trim() || undefined,
            kind: 'FINAL',
            defaultValueType: 'NUMBER',
            themeUuid: null,
            configJson: JSON.stringify(authoring, null, 2),
            sqlTemplate: sqlPreview,
        };

        if (mode === 'edit' && initial?.uuid) {
            if (!onUpdate) throw new Error('onUpdate handler is required for edit mode');
            await onUpdate(initial.uuid, payload);
        } else {
            await onCreate(payload);
        }

        onSaved();
    };

    const showPreview = Boolean(baseIndicatorId) && Boolean(ageCategoryCode);

    return (
        <Modal
            open={open}
            onRequestClose={onClose}
            modalHeading={mode === 'edit' ? 'Edit Final Indicator' : 'Create Final Indicator'}
            primaryButtonText={mode === 'edit' ? 'Update Indicator' : 'Save Indicator'}
            secondaryButtonText="Cancel"
            onRequestSubmit={submit}
            primaryButtonDisabled={!canSubmit}
            size="lg"
        >
            <Stack gap={6}>
                {loadingCats ? <InlineLoading description="Loading age categories…" /> : null}
                {catsError ? <InlineNotification kind="error" lowContrast title="Age categories" subtitle={catsError} /> : null}

                <FinalIndicatorBasicsSection value={basics} onChange={setBasics} />

                <hr style={{ border: 0, borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)' }} />

                <FinalIndicatorPickerSection
                    baseIndicators={baseIndicators}
                    ageCategories={ageCategories}
                    selectedBaseId={baseIndicatorId}
                    selectedAgeCategoryCode={ageCategoryCode}
                    onChangeBaseId={setBaseIndicatorId}
                    onChangeAgeCategoryCode={setAgeCategoryCode}
                />

                {loadingBase ? <InlineLoading description="Loading base indicator details…" /> : null}
                {baseError ? <InlineNotification kind="error" lowContrast title="Base indicator" subtitle={baseError} /> : null}

                <FinalIndicatorDisaggregationSection genders={genders} onChange={setGenders} />

                <FinalIndicatorResultsPreviewSection
                    sql={sqlPreview}
                    maxRows={200}
                    startDate={previewStartDate}
                    endDate={previewEndDate}
                    onChangeStartDate={setPreviewStartDate}
                    onChangeEndDate={setPreviewEndDate}
                />
            </Stack>
        </Modal>
    );
}
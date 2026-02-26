import React from 'react';
import { Modal, Stack, InlineLoading, InlineNotification } from '@carbon/react';

import type { IndicatorDto } from '../../services/indicator/indicators.api';
import { getIndicator } from '../../services/indicator/indicators.api';

import type { BaseIndicatorOption } from './types/composite-indicator.types';
import { listAgeGroupSets, type AgeGroupSetOption } from '../../services/agegroup/mamba-agegroups.api';

import FinalIndicatorBasicsSection from './sections/final-indicator-basics.section';
import FinalIndicatorPickerSection from './sections/final-indicator-picker.section';
import FinalIndicatorDisaggregationSection from './sections/final-indicator-disaggregation.section';
import FinalIndicatorPreviewSection from './sections/final-indicator-preview.section';

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
    const [ageSets, setAgeSets] = React.useState<AgeGroupSetOption[]>([]);
    const [loadingSets, setLoadingSets] = React.useState(false);
    const [setsError, setSetsError] = React.useState<string | null>(null);

    const [basics, setBasics] = React.useState({ name: '', code: '', description: '' });

    const [baseIndicatorId, setBaseIndicatorId] = React.useState('');
    const [ageGroupSetCode, setAgeGroupSetCode] = React.useState('');
    const [genders, setGenders] = React.useState<Array<'F' | 'M'>>(['F', 'M']);

    const [baseFull, setBaseFull] = React.useState<IndicatorDto | null>(null);
    const [loadingBase, setLoadingBase] = React.useState(false);
    const [baseError, setBaseError] = React.useState<string | null>(null);

    const [sqlPreview, setSqlPreview] = React.useState('');

    // load age group sets when modal opens
    React.useEffect(() => {
        if (!open) return;
        const ac = new AbortController();

        setLoadingSets(true);
        setSetsError(null);

        listAgeGroupSets(ac.signal)
            .then((items) => setAgeSets(items))
            .catch((e: any) => setSetsError(e?.message ?? 'Failed to load age groups'))
            .finally(() => setLoadingSets(false));

        return () => ac.abort();
    }, [open]);

    // initialize create vs edit
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
            setAgeGroupSetCode(String(cfg.ageGroupSetCode ?? ''));
            setGenders((cfg.genders as any) ?? ['F', 'M']);

            setSqlPreview(String(cfg.sqlPreview ?? initial.sqlTemplate ?? ''));

            return;
        }

        // create defaults (blank to avoid confusion)
        setBasics({ name: '', code: '', description: '' });
        setBaseIndicatorId('');
        setAgeGroupSetCode('');
        setGenders(['F', 'M']);
        setSqlPreview('');
        setBaseFull(null);
        setBaseError(null);
    }, [open, mode, initial?.uuid]);

    // load full base indicator when selected
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

    // compute SQL preview
    React.useEffect(() => {
        if (!open) return;

        if (!baseFull || !ageGroupSetCode) {
            setSqlPreview('');
            return;
        }

        const sql = buildFinalIndicatorSql({
            baseIndicator: baseFull,
            ageGroupSetCode,
            genders,
        });

        setSqlPreview(sql);
    }, [open, baseFull, ageGroupSetCode, genders]);

    const canSubmit = Boolean(basics.name.trim()) && Boolean(baseIndicatorId) && Boolean(ageGroupSetCode) && Boolean(sqlPreview.trim());

    const submit = async () => {
        if (!canSubmit || !baseFull) return;

        const finalCode = basics.code.trim() ? basics.code.trim().toUpperCase() : toCode(basics.name);

        const authoring: FinalIndicatorAuthoringV1 = {
            version: 1,
            baseIndicatorId,
            ageGroupSetCode,
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

    const showPreview = Boolean(baseIndicatorId) && Boolean(ageGroupSetCode);

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
                {loadingSets ? <InlineLoading description="Loading age groups…" /> : null}
                {setsError ? <InlineNotification kind="error" lowContrast title="Age groups" subtitle={setsError} /> : null}

                <FinalIndicatorBasicsSection value={basics} onChange={setBasics} />

                <hr style={{ border: 0, borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)' }} />

                <FinalIndicatorPickerSection
                    baseIndicators={baseIndicators}
                    ageGroupSets={ageSets}
                    selectedBaseId={baseIndicatorId}
                    selectedAgeSetCode={ageGroupSetCode}
                    onChangeBaseId={setBaseIndicatorId}
                    onChangeAgeSetCode={setAgeGroupSetCode}
                />

                {loadingBase ? <InlineLoading description="Loading base indicator details…" /> : null}
                {baseError ? <InlineNotification kind="error" lowContrast title="Base indicator" subtitle={baseError} /> : null}

                <FinalIndicatorDisaggregationSection genders={genders} onChange={setGenders} />

                <FinalIndicatorPreviewSection sql={sqlPreview} show={showPreview} />
            </Stack>
        </Modal>
    );
}
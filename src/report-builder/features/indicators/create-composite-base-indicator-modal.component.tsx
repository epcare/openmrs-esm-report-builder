import React from 'react';
import { Modal, Stack, InlineNotification } from '@carbon/react';

import { getIndicator, type IndicatorDto } from '../../services/indicator/indicators.api';

import type { BaseIndicatorOption, CompositeOperator } from './types/composite-indicator.types';

import CompositeIndicatorBasicsSection from './sections/composite-indicator-basics.section';
import CompositeIndicatorPickerSection from './sections/composite-indicator-picker.section';
import CompositeIndicatorSqlPreviewSection from './sections/composite-indicator-sql-preview.section';

import {
    countSqlToPopulationSql,
    buildCompositeCountSql,
    tryGetPatientIdColumnFromConfig,
    tryGetCountSqlFromIndicator,
} from './utils/composite-indicator-sql.utils';

type Props = {
    open: boolean;
    mode?: 'create' | 'edit';
    initial?: IndicatorDto | null;
    onClose: () => void;
    onCreate: (payload: Partial<IndicatorDto>) => Promise<void>;
    onUpdate?: (uuid: string, payload: Partial<IndicatorDto>) => Promise<void>;
    onSaved: () => void;
    baseIndicators: BaseIndicatorOption[];
};

type CompositeIndicatorAuthoring = {
    version: 1;
    unit: 'Patients' | 'Encounters';
    operator: CompositeOperator;
    indicatorAId: string;
    indicatorBId: string;
    indicatorACode?: string;
    indicatorBCode?: string;
    sqlPreview: string;
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

const CreateCompositeBaseIndicatorModal: React.FC<Props> = ({
                                                                open,
                                                                mode = 'create',
                                                                initial,
                                                                onClose,
                                                                onCreate,
                                                                onUpdate,
                                                                onSaved,
                                                                baseIndicators,
                                                            }) => {
    // ✅ IMPORTANT: no defaults for create mode
    const [name, setName] = React.useState('');
    const [code, setCode] = React.useState('');
    const [description, setDescription] = React.useState('');

    const [indicatorAId, setIndicatorAId] = React.useState('');
    const [indicatorBId, setIndicatorBId] = React.useState('');
    const [operator, setOperator] = React.useState<CompositeOperator>('AND');

    const [loadingA, setLoadingA] = React.useState(false);
    const [loadingB, setLoadingB] = React.useState(false);
    const [errA, setErrA] = React.useState<string | null>(null);
    const [errB, setErrB] = React.useState<string | null>(null);

    const [indA, setIndA] = React.useState<IndicatorDto | null>(null);
    const [indB, setIndB] = React.useState<IndicatorDto | null>(null);

    // reset / initialize on open
    React.useEffect(() => {
        if (!open) return;

        // EDIT: hydrate from selected composite indicator
        if (mode === 'edit' && initial?.uuid) {
            const cfg = safeParseJson<any>(initial.configJson) ?? {};

            setName(initial.name ?? '');
            setCode(initial.code ?? '');
            setDescription(initial.description ?? '');

            // support both indicatorAId/indicatorBId and indicatorAUuid/indicatorBUuid
            setIndicatorAId(String(cfg.indicatorAId ?? cfg.indicatorAUuid ?? ''));
            setIndicatorBId(String(cfg.indicatorBId ?? cfg.indicatorBUuid ?? ''));
            setOperator((String(cfg.operator ?? 'AND').toUpperCase() as CompositeOperator) ?? 'AND');

            setErrA(null);
            setErrB(null);
            setIndA(null);
            setIndB(null);
            return;
        }

        // CREATE: start blank so users don't confuse it with edit
        setName('');
        setCode('');
        setDescription('');
        setIndicatorAId('');
        setIndicatorBId('');
        setOperator('AND');
        setErrA(null);
        setErrB(null);
        setIndA(null);
        setIndB(null);
    }, [open, mode, initial?.uuid]);

    const AOpt = React.useMemo(() => baseIndicators.find((x) => x.id === indicatorAId) ?? null, [baseIndicators, indicatorAId]);
    const BOpt = React.useMemo(() => baseIndicators.find((x) => x.id === indicatorBId) ?? null, [baseIndicators, indicatorBId]);

    const samePick = Boolean(indicatorAId && indicatorBId && indicatorAId === indicatorBId);

    const inferredUnit: 'Patients' | 'Encounters' = React.useMemo(() => 'Patients', []);

    // load full indicators for A/B
    React.useEffect(() => {
        if (!open) return;
        if (!indicatorAId) {
            setIndA(null);
            return;
        }

        const ac = new AbortController();
        setLoadingA(true);
        setErrA(null);

        getIndicator(indicatorAId, ac.signal, 'full')
            .then((full) => setIndA(full))
            .catch((e: any) => setErrA(e?.message ?? 'Failed to load indicator A'))
            .finally(() => setLoadingA(false));

        return () => ac.abort();
    }, [open, indicatorAId]);

    React.useEffect(() => {
        if (!open) return;
        if (!indicatorBId) {
            setIndB(null);
            return;
        }

        const ac = new AbortController();
        setLoadingB(true);
        setErrB(null);

        getIndicator(indicatorBId, ac.signal, 'full')
            .then((full) => setIndB(full))
            .catch((e: any) => setErrB(e?.message ?? 'Failed to load indicator B'))
            .finally(() => setLoadingB(false));

        return () => ac.abort();
    }, [open, indicatorBId]);

    const populationSqlA = React.useMemo(() => {
        if (!indA) return '';
        const { sql: countSql } = tryGetCountSqlFromIndicator(indA);
        const pidCol = tryGetPatientIdColumnFromConfig(indA);
        if (!countSql) return '';
        return countSqlToPopulationSql(countSql, pidCol, inferredUnit);
    }, [indA, inferredUnit]);

    const populationSqlB = React.useMemo(() => {
        if (!indB) return '';
        const { sql: countSql } = tryGetCountSqlFromIndicator(indB);
        const pidCol = tryGetPatientIdColumnFromConfig(indB);
        if (!countSql) return '';
        return countSqlToPopulationSql(countSql, pidCol, inferredUnit);
    }, [indB, inferredUnit]);

    const compositeSql = React.useMemo(() => {
        if (!populationSqlA || !populationSqlB) return '';
        return buildCompositeCountSql({
            unit: inferredUnit,
            operator,
            populationSqlA,
            populationSqlB,
        });
    }, [populationSqlA, populationSqlB, inferredUnit, operator]);

    const canSubmit =
        Boolean(name.trim()) &&
        Boolean(indicatorAId) &&
        Boolean(indicatorBId) &&
        !samePick &&
        Boolean(compositeSql.trim());

    const submit = async () => {
        if (!canSubmit) return;

        const finalCode = code.trim() ? code.trim().toUpperCase() : toCode(name);

        const authoring: CompositeIndicatorAuthoring = {
            version: 1,
            unit: inferredUnit,
            operator,
            indicatorAId,
            indicatorBId,
            indicatorACode: AOpt?.code,
            indicatorBCode: BOpt?.code,
            sqlPreview: compositeSql,
        };

        const payload: Partial<IndicatorDto> = {
            name: name.trim(),
            code: finalCode,
            description: description.trim() || undefined,
            kind: 'COMPOSITE',
            defaultValueType: 'NUMBER',
            themeUuid: null,
            configJson: JSON.stringify(authoring, null, 2),
            sqlTemplate: compositeSql,
        };

        if (mode === 'edit' && initial?.uuid) {
            if (!onUpdate) throw new Error('onUpdate handler is required for edit mode');
            await onUpdate(initial.uuid, payload);
        } else {
            await onCreate(payload);
        }

        onSaved();
    };

    return (
        <Modal
            open={open}
            onRequestClose={onClose}
            modalHeading={mode === 'edit' ? 'Edit Composite Indicator' : 'Create Composite Indicator'}
            primaryButtonText={mode === 'edit' ? 'Update Indicator' : 'Save Indicator'}
            secondaryButtonText="Cancel"
            onRequestSubmit={submit}
            primaryButtonDisabled={!canSubmit}
            size="lg"
        >
            <Stack gap={5}>
                <div style={{ opacity: 0.8 }}>
                    Select two base indicators, pick an operator, and we generate a composite SQL preview.
                </div>

                {samePick ? (
                    <InlineNotification
                        kind="error"
                        lowContrast
                        title="Pick two different indicators"
                        subtitle="Indicator A and Indicator B cannot be the same."
                    />
                ) : null}

                <CompositeIndicatorBasicsSection
                    value={{ name, code, description }}
                    onChange={(next) => {
                        setName(next.name);
                        setCode(next.code);
                        setDescription(next.description);
                    }}
                />

                <hr style={{ border: 0, borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)' }} />

                <CompositeIndicatorPickerSection
                    baseIndicators={baseIndicators}
                    indicatorAId={indicatorAId}
                    indicatorBId={indicatorBId}
                    operator={operator}
                    inferredUnit={inferredUnit}
                    samePick={samePick}
                    onChangeA={setIndicatorAId}
                    onChangeB={setIndicatorBId}
                    onChangeOperator={setOperator}
                />

                <CompositeIndicatorSqlPreviewSection
                    loading={loadingA || loadingB}
                    errA={errA}
                    errB={errB}
                    compositeSql={compositeSql}
                    show={Boolean(AOpt && BOpt)}
                />
            </Stack>
        </Modal>
    );
};

export default CreateCompositeBaseIndicatorModal;
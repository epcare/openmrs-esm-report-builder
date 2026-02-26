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
    onClose: () => void;
    onCreate: (payload: Partial<IndicatorDto>) => Promise<void>;
    onSaved: () => void;
    baseIndicators: BaseIndicatorOption[];
};

type CompositeIndicatorAuthoring = {
    version: 1;
    unit: 'Patients' | 'Encounters';
    operator: CompositeOperator;
    indicatorAId: string;
    indicatorBId: string;
    // helpful for display / debugging (safe optional)
    indicatorACode?: string;
    indicatorBCode?: string;
    sqlPreview: string;
};

const toCode = (name: string) =>
    name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 50);

const CreateCompositeBaseIndicatorModal: React.FC<Props> = ({ open, onClose, onCreate, onSaved, baseIndicators }) => {
    const firstId = baseIndicators[0]?.id ?? '';
    const secondId = baseIndicators[1]?.id ?? baseIndicators[0]?.id ?? '';

    const [name, setName] = React.useState('New composite indicator');
    const [code, setCode] = React.useState('');
    const [description, setDescription] = React.useState('');

    const [indicatorAId, setIndicatorAId] = React.useState(firstId);
    const [indicatorBId, setIndicatorBId] = React.useState(secondId);
    const [operator, setOperator] = React.useState<CompositeOperator>('AND');

    const [loadingA, setLoadingA] = React.useState(false);
    const [loadingB, setLoadingB] = React.useState(false);
    const [errA, setErrA] = React.useState<string | null>(null);
    const [errB, setErrB] = React.useState<string | null>(null);

    const [indA, setIndA] = React.useState<IndicatorDto | null>(null);
    const [indB, setIndB] = React.useState<IndicatorDto | null>(null);

    // reset on open
    React.useEffect(() => {
        if (!open) return;

        // eslint-disable-next-line no-console
        console.log('[composite] modal open - reset defaults', { firstId, secondId, baseCount: baseIndicators.length });

        setName('New composite indicator');
        setCode('');
        setDescription('');
        setIndicatorAId(firstId);
        setIndicatorBId(secondId);
        setOperator('AND');
        setErrA(null);
        setErrB(null);
        setIndA(null);
        setIndB(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const AOpt = React.useMemo(() => baseIndicators.find((x) => x.id === indicatorAId) ?? null, [baseIndicators, indicatorAId]);
    const BOpt = React.useMemo(() => baseIndicators.find((x) => x.id === indicatorBId) ?? null, [baseIndicators, indicatorBId]);

    const samePick = Boolean(indicatorAId && indicatorBId && indicatorAId === indicatorBId);

    // Keep simple for now; can be expanded later.
    const inferredUnit: 'Patients' | 'Encounters' = React.useMemo(() => 'Patients', []);

    React.useEffect(() => {
        if (!open) return;
        // eslint-disable-next-line no-console
        console.log('[composite] selection changed', {
            indicatorAId,
            indicatorBId,
            operator,
            inferredUnit,
            samePick,
            AOpt: AOpt ? { id: AOpt.id, code: AOpt.code } : null,
            BOpt: BOpt ? { id: BOpt.id, code: BOpt.code } : null,
        });
    }, [open, indicatorAId, indicatorBId, operator, inferredUnit, samePick, AOpt, BOpt]);

    // load full indicators for A/B
    React.useEffect(() => {
        if (!open) return;
        if (!indicatorAId) return;

        const ac = new AbortController();
        setLoadingA(true);
        setErrA(null);

        // eslint-disable-next-line no-console
        console.log('[composite] loading indicator A', { indicatorAId });

        getIndicator(indicatorAId, ac.signal, 'full')
            .then((full) => {
                // eslint-disable-next-line no-console
                console.log('[composite] loaded indicator A', {
                    uuid: full?.uuid,
                    kind: full?.kind,
                    hasSqlTemplate: Boolean(full?.sqlTemplate?.trim()),
                    sqlTemplateLen: full?.sqlTemplate?.length ?? 0,
                    configJsonLen: full?.configJson?.length ?? 0,
                });
                setIndA(full);
            })
            .catch((e: any) => {
                // eslint-disable-next-line no-console
                console.log('[composite] failed loading indicator A', { indicatorAId, error: e });
                setErrA(e?.message ?? 'Failed to load indicator A');
            })
            .finally(() => setLoadingA(false));

        return () => ac.abort();
    }, [open, indicatorAId]);

    React.useEffect(() => {
        if (!open) return;
        if (!indicatorBId) return;

        const ac = new AbortController();
        setLoadingB(true);
        setErrB(null);

        // eslint-disable-next-line no-console
        console.log('[composite] loading indicator B', { indicatorBId });

        getIndicator(indicatorBId, ac.signal, 'full')
            .then((full) => {
                // eslint-disable-next-line no-console
                console.log('[composite] loaded indicator B', {
                    uuid: full?.uuid,
                    kind: full?.kind,
                    hasSqlTemplate: Boolean(full?.sqlTemplate?.trim()),
                    sqlTemplateLen: full?.sqlTemplate?.length ?? 0,
                    configJsonLen: full?.configJson?.length ?? 0,
                });
                setIndB(full);
            })
            .catch((e: any) => {
                // eslint-disable-next-line no-console
                console.log('[composite] failed loading indicator B', { indicatorBId, error: e });
                setErrB(e?.message ?? 'Failed to load indicator B');
            })
            .finally(() => setLoadingB(false));

        return () => ac.abort();
    }, [open, indicatorBId]);

    const populationSqlA = React.useMemo(() => {
        if (!indA) return '';

        const { sql: countSql, source } = tryGetCountSqlFromIndicator(indA);
        const pidCol = tryGetPatientIdColumnFromConfig(indA);

        // eslint-disable-next-line no-console
        console.log('[composite] A count sql source', { source, countSqlLen: countSql.length, pidCol });

        if (!countSql) {
            // eslint-disable-next-line no-console
            console.log('[composite] populationSqlA: missing count SQL (both sqlTemplate and configJson.sqlPreview empty)');
            return '';
        }

        const out = countSqlToPopulationSql(countSql, pidCol, inferredUnit);
        // eslint-disable-next-line no-console
        console.log('[composite] populationSqlA output', { outLen: out.length, outHead: out.slice(0, 120) });

        return out;
    }, [indA, inferredUnit]);

    const populationSqlB = React.useMemo(() => {
        if (!indB) return '';

        const { sql: countSql, source } = tryGetCountSqlFromIndicator(indB);
        const pidCol = tryGetPatientIdColumnFromConfig(indB);

        // eslint-disable-next-line no-console
        console.log('[composite] B count sql source', { source, countSqlLen: countSql.length, pidCol });

        if (!countSql) {
            // eslint-disable-next-line no-console
            console.log('[composite] populationSqlB: missing count SQL (both sqlTemplate and configJson.sqlPreview empty)');
            return '';
        }

        const out = countSqlToPopulationSql(countSql, pidCol, inferredUnit);
        // eslint-disable-next-line no-console
        console.log('[composite] populationSqlB output', { outLen: out.length, outHead: out.slice(0, 120) });

        return out;
    }, [indB, inferredUnit]);

    const compositeSql = React.useMemo(() => {
        if (!populationSqlA || !populationSqlB) {
            // eslint-disable-next-line no-console
            console.log('[composite] compositeSql: missing population SQL', {
                popALen: populationSqlA?.length ?? 0,
                popBLen: populationSqlB?.length ?? 0,
            });
            return '';
        }

        const out = buildCompositeCountSql({
            unit: inferredUnit,
            operator,
            populationSqlA,
            populationSqlB,
        });

        // eslint-disable-next-line no-console
        console.log('[composite] compositeSql computed', { operator, outLen: out.length, outHead: out.slice(0, 160) });

        return out;
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

        // eslint-disable-next-line no-console
        console.log('[composite] submit payload', {
            finalCode,
            name: name.trim(),
            indicatorAId,
            indicatorBId,
            operator,
            inferredUnit,
            compositeSqlLen: compositeSql.length,
        });

        await onCreate(payload);
        onSaved();
    };

    return (
        <Modal
            open={open}
            onRequestClose={onClose}
            modalHeading="Create Composite Indicator"
            primaryButtonText="Save Indicator"
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
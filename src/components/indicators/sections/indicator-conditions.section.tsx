import React from 'react';
import { Stack, TextInput } from '@carbon/react';

import type { ThemeCondition } from '../types/data-theme-config.types';
import type { IndicatorCondition } from '../types/indicator-types';

import ConceptSearchMultiSelect, { type SelectedConcept } from '../handler/concept-search-multiselect.component';
import QuestionAnswerConceptSearch from '../handler/question-answer-concept-search.component';

import type { QAUiState } from '../types/condition-ui.types';

type QAValue = { questions: Array<string | number>; answers: Array<string | number> };

type Props = {
    conditions: ThemeCondition[];

    picked: IndicatorCondition[];
    /**
     * We accept a React state setter signature so callers can pass setState directly
     * and we can safely use functional updates.
     */
    onPickedChange: React.Dispatch<React.SetStateAction<IndicatorCondition[]>>;

    conceptUi: Record<string, SelectedConcept[]>;
    onConceptUiChange: (next: Record<string, SelectedConcept[]>) => void;

    qaUi: Record<string, QAUiState>;
    onQaUiChange: (next: Record<string, QAUiState>) => void;
};

function normalizeNumericIds(xs: Array<any>) {
    return xs.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
}

function normalizeStrings(xs: Array<any>) {
    return xs.map((x) => String(x)).filter(Boolean);
}

function upsert(list: IndicatorCondition[], next: IndicatorCondition) {
    const idx = (list ?? []).findIndex((p) => p.key === next.key);
    if (idx === -1) return [...(list ?? []), next];
    const copy = [...(list ?? [])];
    copy[idx] = { ...copy[idx], ...next };
    return copy;
}

export default function IndicatorConditionsSection({
                                                       conditions,
                                                       picked,
                                                       onPickedChange,
                                                       conceptUi,
                                                       onConceptUiChange,
                                                       qaUi,
                                                       onQaUiChange,
                                                   }: Props) {
    const upsertPicked = React.useCallback(
        (tc: ThemeCondition, patch: Partial<IndicatorCondition>) => {
            const existing =
                (picked ?? []).find((p) => p.key === tc.key) ??
                ({
                    key: tc.key,
                    operator: tc.operator,
                    valueType: tc.valueType,
                    value:
                        tc.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH'
                            ? ({ questions: [], answers: [] } as any)
                            : tc.operator === 'IN' || tc.operator === 'NOT_IN'
                                ? []
                                : '',
                } as IndicatorCondition);

            onPickedChange(upsert(picked ?? [], { ...existing, ...patch, key: tc.key }));
        },
        [onPickedChange, picked],
    );

    const mergeQaUi = React.useCallback(
        (key: string, next: Partial<QAUiState>) => {
            onQaUiChange({
                ...(qaUi ?? {}),
                [key]: {
                    ...(qaUi?.[key] ?? { questions: [], answers: [] }),
                    ...next,
                },
            });
        },
        [onQaUiChange, qaUi],
    );

    const mergeConceptUi = React.useCallback(
        (key: string, nextSelected: SelectedConcept[]) => {
            onConceptUiChange({
                ...(conceptUi ?? {}),
                [key]: nextSelected,
            });
        },
        [onConceptUiChange, conceptUi],
    );

    const renderCondition = (tc: ThemeCondition) => {
        const current = (picked ?? []).find((x) => x.key === tc.key);

        // QUESTION + ANSWERS
        if (tc.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH') {
            const ui = qaUi?.[tc.key] ?? { questions: [], answers: [] };

            return (
                <div key={tc.key}>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{tc.label || tc.key}</div>

                    <QuestionAnswerConceptSearch
                        id={`cond-${tc.key}`}
                        labelText={tc.label || 'Select question(s) & answers'}
                        value={{ questions: ui.questions, answers: ui.answers }}
                        onChange={(next) => {
                            // UI
                            mergeQaUi(tc.key, { questions: next.questions, answers: next.answers, error: undefined });

                            // Payload
                            const qVals =
                                tc.valueType === 'conceptUuid'
                                    ? normalizeStrings((next.questions ?? []).map((q) => q.uuid))
                                    : normalizeNumericIds((next.questions ?? []).map((q) => q.id));

                            const aVals =
                                tc.valueType === 'conceptUuid'
                                    ? normalizeStrings((next.answers ?? []).map((a) => a.uuid))
                                    : normalizeNumericIds((next.answers ?? []).map((a) => a.id));

                            upsertPicked(tc, { value: { questions: qVals, answers: aVals } as QAValue as any });
                        }}
                    />

                    {qaUi?.[tc.key]?.error ? (
                        <div style={{ marginTop: '0.5rem', color: 'var(--cds-text-error, #da1e28)', fontSize: '0.875rem' }}>
                            {qaUi[tc.key].error}
                        </div>
                    ) : null}
                </div>
            );
        }

        // CONCEPT_SEARCH
        if (tc.handler === 'CONCEPT_SEARCH') {
            const uiSelected = conceptUi?.[tc.key] ?? [];

            return (
                <div key={tc.key}>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{tc.label || tc.key}</div>

                    <ConceptSearchMultiSelect
                        id={`cond-${tc.key}`}
                        labelText={tc.label || 'Select concepts'}
                        value={uiSelected}
                        onChange={(nextSelected) => {
                            mergeConceptUi(tc.key, nextSelected);

                            if (tc.valueType === 'conceptUuid') {
                                upsertPicked(tc, { value: normalizeStrings(nextSelected.map((c) => c.uuid)) as any });
                            } else {
                                upsertPicked(tc, { value: normalizeNumericIds(nextSelected.map((c) => c.id)) as any });
                            }
                        }}
                    />
                </div>
            );
        }

        // default: text input
        return (
            <div key={tc.key}>
                <TextInput
                    id={`cond-${tc.key}`}
                    labelText={tc.label || tc.key}
                    value={typeof current?.value === 'string' ? current.value : ''}
                    onChange={(e) =>
                        upsertPicked(tc, {
                            value: (e.target as HTMLInputElement).value as any,
                        })
                    }
                />
            </div>
        );
    };

    if (!conditions?.length) return <div style={{ opacity: 0.8 }}>No conditions configured for this theme.</div>;

    return (
        <div>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Conditions</div>
            <Stack gap={5}>{conditions.map(renderCondition)}</Stack>
        </div>
    );
}
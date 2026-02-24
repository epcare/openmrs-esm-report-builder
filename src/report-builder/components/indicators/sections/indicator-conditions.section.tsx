import React from 'react';
import { Stack, TextInput } from '@carbon/react';

import type { ThemeCondition } from '../types/data-theme-config.types';
import type { IndicatorCondition } from '../types/indicator-types';

import ConceptSearchMultiSelect, { type SelectedConcept } from '../handler/concept-search-multiselect.component';
import QuestionAnswerConceptSearch from '../handler/question-answer-concept-search.component';

type QAUiState = { question: SelectedConcept | null; answers: SelectedConcept[]; error?: string };
type QAValue = { question: string | number | null; answers: Array<string | number> };

type Props = {
    conditions: ThemeCondition[];

    picked: IndicatorCondition[];
    onPickedChange: (next: IndicatorCondition[]) => void;

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

export default function IndicatorConditionsSection({
                                                       conditions,
                                                       picked,
                                                       onPickedChange,
                                                       conceptUi,
                                                       onConceptUiChange,
                                                       qaUi,
                                                       onQaUiChange,
                                                   }: Props) {
    const updatePicked = React.useCallback(
        (key: string, patch: Partial<IndicatorCondition>) => {
            onPickedChange((picked ?? []).map((p) => (p.key === key ? { ...p, ...patch } : p)));
        },
        [onPickedChange, picked],
    );

    const mergeQaUi = React.useCallback(
        (key: string, next: Partial<QAUiState>) => {
            onQaUiChange({
                ...(qaUi ?? {}),
                [key]: {
                    ...(qaUi?.[key] ?? { question: null, answers: [] }),
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

    console.log('conditions', conditions);
    console.log('picked', picked);
    console.log('conceptUi', conceptUi);
    console.log('qaUi', qaUi);
    console.log('---------------------------------------');
    console.log("mergeConceptUi",mergeConceptUi)

    const renderCondition = (tc: ThemeCondition) => {
        const current = (picked ?? []).find((x) => x.key === tc.key);

        // -----------------------------
        // QUESTION + ANSWERS handler
        // -----------------------------
        if (tc.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH') {
            const ui = qaUi?.[tc.key] ?? { question: null, answers: [] };

            return (
                <div key={tc.key}>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{tc.label || tc.key}</div>

                    <QuestionAnswerConceptSearch
                        id={`cond-${tc.key}`}
                        labelText={tc.label || 'Select question & answers'}
                        value={{ question: ui.question, answers: ui.answers }}
                        onChange={(next) => {
                            // UI state (clear any previous error here)
                            mergeQaUi(tc.key, { question: next.question, answers: next.answers, error: undefined });

                            // Payload state
                            const qVal =
                                tc.valueType === 'conceptUuid'
                                    ? (next.question?.uuid ?? null)
                                    : next.question?.id
                                        ? Number(next.question.id)
                                        : null;

                            const aVals =
                                tc.valueType === 'conceptUuid'
                                    ? normalizeStrings((next.answers ?? []).map((a) => a.uuid))
                                    : normalizeNumericIds((next.answers ?? []).map((a) => a.id));

                            updatePicked(tc.key, { value: { question: qVal, answers: aVals } as QAValue as any });
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

        // -----------------------------
        // Concept multi-select handler
        // -----------------------------
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
                                updatePicked(tc.key, { value: normalizeStrings(nextSelected.map((c) => c.uuid)) as any });
                            } else {
                                updatePicked(tc.key, { value: normalizeNumericIds(nextSelected.map((c) => c.id)) as any });
                            }
                        }}
                    />
                </div>
            );
        }

        // -----------------------------
        // default: text input handler
        // -----------------------------
        return (
            <div key={tc.key}>
                <TextInput
                    id={`cond-${tc.key}`}
                    labelText={tc.label || tc.key}
                    value={typeof current?.value === 'string' ? current.value : ''}
                    onChange={(e) =>
                        updatePicked(tc.key, {
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
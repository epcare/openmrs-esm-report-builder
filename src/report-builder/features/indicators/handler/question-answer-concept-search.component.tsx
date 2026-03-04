import React from 'react';
import { ComboBox, InlineLoading, Tag } from '@carbon/react';

import { useConceptSearch } from '../../../services/concepts/useConceptSearch';
import type { ConceptSummary } from '../../../services/concepts/concept-types';
import { getConceptAnswers } from '../../../services/concepts/concepts.resource';

import type { SelectedConcept } from './concept-search-multiselect.component';

type Value = {
    questions: SelectedConcept[]; // ✅ multi
    answers: SelectedConcept[];
};

type Props = {
    id: string;
    labelText: string;
    helperText?: string;

    questionsLabelText?: string;
    answersLabelText?: string;

    value: Value;
    onChange: (next: Value) => void;
};

function extractCodeFromMappingDisplay(mappingDisplay: string, systemPrefix: string) {
    const raw = (mappingDisplay ?? '').trim();
    const prefix = `${systemPrefix}:`;
    if (!raw.startsWith(prefix)) return undefined;

    const remainder = raw.slice(prefix.length).trim();
    if (!remainder) return undefined;

    const token = remainder.split(' ')[0]?.split('(')[0]?.trim();
    return token || undefined;
}

function getIcd10And11(concept: ConceptSummary) {
    const mappings = concept.mappings ?? [];
    let icd10: string | undefined;
    let icd11: string | undefined;

    for (const m of mappings) {
        const disp = m?.display ?? '';
        if (!icd10) icd10 = extractCodeFromMappingDisplay(disp, 'ICD-10-WHO');
        if (!icd11) icd11 = extractCodeFromMappingDisplay(disp, 'ICD-11-WHO');
        if (icd10 && icd11) break;
    }

    return { icd10Code: icd10, icd11Code: icd11 };
}

function toSelectedConcept(c: ConceptSummary): SelectedConcept {
    const { icd10Code, icd11Code } = getIcd10And11(c);

    return {
        id: Number(c.id) || 0,
        uuid: c.uuid,
        display: c.display,
        icd10Code,
        icd11Code,
        conceptClass: c.conceptClass?.name,
        datatype: c.datatype?.name,
    };
}

function itemToString(c: ConceptSummary | null) {
    if (!c) return '';
    const { icd10Code, icd11Code } = getIcd10And11(c);

    const bits: string[] = [];
    if (icd10Code) bits.push(`ICD-10:${icd10Code}`);
    if (icd11Code) bits.push(`ICD-11:${icd11Code}`);
    if (c.conceptClass?.name) bits.push(c.conceptClass.name);

    return bits.length ? `${c.display} • ${bits.join(' • ')}` : c.display;
}

function selectedToString(c: SelectedConcept | null) {
    if (!c) return '';
    const bits: string[] = [];
    if (c.icd10Code) bits.push(`ICD-10:${c.icd10Code}`);
    if (c.icd11Code) bits.push(`ICD-11:${c.icd11Code}`);
    if (c.conceptClass) bits.push(c.conceptClass);
    return bits.length ? `${c.display} • ${bits.join(' • ')}` : c.display;
}

export default function QuestionAnswerConceptSearch({
                                                        id,
                                                        labelText,
                                                        helperText,
                                                        questionsLabelText = 'Question concept(s)',
                                                        answersLabelText = 'Expected answers',
                                                        value,
                                                        onChange,
                                                    }: Props) {
    // Question search
    const [qQuery, setQQuery] = React.useState('');
    const { loading: qLoading, results: qResults, error: qError } = useConceptSearch(qQuery);

    // Answers derived from selected questions
    const [answersOptions, setAnswersOptions] = React.useState<SelectedConcept[]>([]);
    const [aLoading, setALoading] = React.useState(false);
    const [aError, setAError] = React.useState<string | null>(null);

    // Used only to clear ComboBox input after picking an answer
    const [answerComboKey, setAnswerComboKey] = React.useState(0);
    const [questionComboKey, setQuestionComboKey] = React.useState(0);

    const selectedQuestions = value.questions ?? [];
    const selectedAnswers = value.answers ?? [];

    const mergeUniqueByUuid = React.useCallback((xs: SelectedConcept[]) => {
        const m = new Map<string, SelectedConcept>();
        for (const x of xs ?? []) {
            if (x?.uuid) m.set(x.uuid, x);
        }
        return Array.from(m.values());
    }, []);

    const loadAnswersForQuestions = React.useCallback(
        async (questionUuids: string[], signal?: AbortSignal) => {
            setALoading(true);
            setAError(null);
            setAnswersOptions([]);

            try {
                const uniqQ = Array.from(new Set(questionUuids.filter(Boolean)));
                if (!uniqQ.length) {
                    setAnswersOptions([]);
                    setAError(null);
                    return;
                }

                // fetch answers per question, then union
                const answerLists = await Promise.all(
                    uniqQ.map(async (qUuid) => {
                        try {
                            const answers = await getConceptAnswers(qUuid, signal);
                            return (answers ?? []).map(toSelectedConcept).filter((x) => Boolean(x.uuid));
                        } catch {
                            return [];
                        }
                    }),
                );

                const merged = mergeUniqueByUuid(answerLists.flat());

                if (!merged.length) {
                    setAError('Selected question(s) have no configured answers. Please choose a different question.');
                    setAnswersOptions([]);
                    return;
                }

                setAnswersOptions(merged);

                // keep currently selected answers only if still valid
                const allowed = new Set(merged.map((x) => x.uuid));
                const filtered = (selectedAnswers ?? []).filter((a) => a?.uuid && allowed.has(a.uuid));
                if (filtered.length !== (selectedAnswers?.length ?? 0)) {
                    onChange({ questions: selectedQuestions, answers: filtered });
                }
            } finally {
                setALoading(false);
            }
        },
        [mergeUniqueByUuid, onChange, selectedAnswers, selectedQuestions],
    );

    // whenever questions change, reload and union answers
    React.useEffect(() => {
        const uuids = (selectedQuestions ?? []).map((q) => q.uuid).filter(Boolean);
        if (!uuids.length) {
            setAnswersOptions([]);
            setAError(null);
            setALoading(false);
            return;
        }

        const ac = new AbortController();
        loadAnswersForQuestions(uuids, ac.signal);
        return () => ac.abort();
    }, [loadAnswersForQuestions, selectedQuestions]);

    const addQuestion = (picked: ConceptSummary | null) => {
        if (!picked) return;

        const nextQ = toSelectedConcept(picked);
        const next = mergeUniqueByUuid([...(selectedQuestions ?? []), nextQ]);

        onChange({ questions: next, answers: selectedAnswers });

        // reset question combobox input
        setQuestionComboKey((k) => k + 1);
    };

    const removeQuestionUuid = (uuid: string) => {
        const nextQ = (selectedQuestions ?? []).filter((q) => q.uuid !== uuid);
        onChange({ questions: nextQ, answers: selectedAnswers });
    };

    const clearAllQuestions = () => {
        onChange({ questions: [], answers: [] });
        setAnswersOptions([]);
        setAError(null);
        setALoading(false);
    };

    const addAnswer = (picked: SelectedConcept | null) => {
        if (!picked) return;

        const next = mergeUniqueByUuid([...(selectedAnswers ?? []), picked]);
        onChange({ questions: selectedQuestions, answers: next });

        // reset answer combobox input
        setAnswerComboKey((k) => k + 1);
    };

    const removeAnswerUuid = (uuid: string) => {
        onChange({ questions: selectedQuestions, answers: (selectedAnswers ?? []).filter((x) => x.uuid !== uuid) });
    };

    const canPickAnswers = (selectedQuestions?.length ?? 0) > 0 && !aLoading && !aError;

    return (
        <div>
            <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{labelText}</div>
            {helperText ? (
                <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.75rem' }}>{helperText}</div>
            ) : null}

            {/* Questions */}
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{questionsLabelText}</div>

                <ComboBox
                    key={questionComboKey}
                    id={`${id}-questions`}
                    titleText="Search question concept"
                    items={qResults ?? []}
                    itemToString={itemToString}
                    placeholder="Type to search question…"
                    onInputChange={(text) => setQQuery(String(text ?? ''))}
                    onChange={(e: any) => addQuestion(e?.selectedItem ?? null)}
                />

                <div style={{ marginTop: '0.5rem' }}>
                    {qLoading ? <InlineLoading description="Searching…" /> : null}
                    {!qLoading && qError ? (
                        <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-error, #da1e28)' }}>{qError}</div>
                    ) : null}
                </div>

                {selectedQuestions?.length ? (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {selectedQuestions.map((q) => (
                            <Tag
                                key={q.uuid}
                                type="gray"
                                filter
                                onClose={() => removeQuestionUuid(q.uuid)}
                                title={selectedToString(q)}
                            >
                                {q.display}
                                {q.icd10Code ? ` • ICD-10:${q.icd10Code}` : ''}
                                {q.icd11Code ? ` • ICD-11:${q.icd11Code}` : ''}
                            </Tag>
                        ))}

                        <Tag type="red" filter onClose={clearAllQuestions} title="Clear all questions">
                            Clear all
                        </Tag>
                    </div>
                ) : null}
            </div>

            {/* Answers */}
            <div>
                <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{answersLabelText}</div>

                {(selectedQuestions?.length ?? 0) > 0 ? (
                    <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.75rem' }}>
                        Pick answer concept(s) for selected question(s).
                    </div>
                ) : (
                    <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.75rem' }}>
                        Select at least one question first to load allowed answers.
                    </div>
                )}

                {aLoading ? <InlineLoading description="Loading answers…" /> : null}
                {!aLoading && aError ? (
                    <div
                        style={{
                            fontSize: '0.875rem',
                            color: 'var(--cds-text-error, #da1e28)',
                            marginBottom: '0.75rem',
                        }}
                    >
                        {aError}
                    </div>
                ) : null}

                <ComboBox
                    key={answerComboKey}
                    id={`${id}-answers`}
                    titleText="Select answer"
                    items={answersOptions}
                    itemToString={(x) => selectedToString(x)}
                    disabled={!canPickAnswers}
                    placeholder={canPickAnswers ? 'Type to filter answers…' : 'Answers disabled'}
                    onChange={(e: any) => addAnswer(e?.selectedItem ?? null)}
                />

                {selectedAnswers?.length ? (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {selectedAnswers.map((x) => (
                            <Tag
                                key={x.uuid}
                                type="gray"
                                filter
                                onClose={() => removeAnswerUuid(x.uuid)}
                                title={selectedToString(x)}
                            >
                                {x.display}
                                {x.icd10Code ? ` • ICD-10:${x.icd10Code}` : ''}
                                {x.icd11Code ? ` • ICD-11:${x.icd11Code}` : ''}
                            </Tag>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
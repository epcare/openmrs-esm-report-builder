import React from 'react';
import { ComboBox, InlineLoading, Tag } from '@carbon/react';

import { useConceptSearch } from '../../../services/concepts/useConceptSearch';
import type { ConceptSummary } from '../../../services/concepts/concept-types';
import { getConceptAnswers } from '../../../services/concepts/concepts.resource';

import type { SelectedConcept } from './concept-search-multiselect.component';

type Value = {
    question: SelectedConcept | null;
    answers: SelectedConcept[];
};

type Props = {
    id: string;
    labelText: string;
    helperText?: string;

    questionLabelText?: string;
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
                                                        questionLabelText = 'Question concept',
                                                        answersLabelText = 'Expected answers',
                                                        value,
                                                        onChange,
                                                    }: Props) {
    // Question search
    const [qQuery, setQQuery] = React.useState('');
    const { loading: qLoading, results: qResults, error: qError } = useConceptSearch(qQuery);

    // Answers derived from selected question
    const [answersOptions, setAnswersOptions] = React.useState<SelectedConcept[]>([]);
    const [aLoading, setALoading] = React.useState(false);
    const [aError, setAError] = React.useState<string | null>(null);

    // Used only to clear ComboBox input after picking an answer
    const [answerComboKey, setAnswerComboKey] = React.useState(0);

    const loadAnswers = React.useCallback(
        async (questionUuid: string, signal?: AbortSignal) => {
            setALoading(true);
            setAError(null);
            setAnswersOptions([]);

            try {
                const answers = await getConceptAnswers(questionUuid, signal);
                const normalized = (answers ?? []).map(toSelectedConcept).filter((x) => Boolean(x.uuid));

                if (!normalized.length) {
                    setAError('Selected question has no configured answers. Please choose a different question.');
                    setAnswersOptions([]);
                    return;
                }

                setAnswersOptions(normalized);
            } catch (e: any) {
                if (e?.name === 'AbortError') return;
                setAError(e?.message ?? 'Failed to load answers for the selected question');
                setAnswersOptions([]);
            } finally {
                setALoading(false);
            }
        },
        [],
    );

    // When question changes -> clear answers + load allowed answers
    React.useEffect(() => {
        const q = value.question;
        if (!q?.uuid) {
            setAnswersOptions([]);
            setAError(null);
            setALoading(false);
            return;
        }

        const ac = new AbortController();
        // reset selected answers when question changes
        onChange({ question: q, answers: [] });

        loadAnswers(q.uuid, ac.signal);
        return () => ac.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value.question?.uuid]);

    const setQuestion = (picked: ConceptSummary | null) => {
        if (!picked) return;

        const nextQ = toSelectedConcept(picked);
        // set question now; effect will clear answers + load options
        onChange({ question: nextQ, answers: [] });
    };

    const clearQuestion = () => {
        onChange({ question: null, answers: [] });
        setAnswersOptions([]);
        setAError(null);
        setALoading(false);
    };

    const addAnswer = (picked: SelectedConcept | null) => {
        if (!picked) return;
        const next = new Map<string, SelectedConcept>();
        for (const x of value.answers ?? []) next.set(x.uuid, x);
        next.set(picked.uuid, picked);

        onChange({ question: value.question, answers: Array.from(next.values()) });

        // reset answer combobox input
        setAnswerComboKey((k) => k + 1);
    };

    const removeAnswerUuid = (uuid: string) => {
        onChange({ question: value.question, answers: (value.answers ?? []).filter((x) => x.uuid !== uuid) });
    };

    const canPickAnswers = Boolean(value.question?.uuid) && !aLoading && !aError;

    return (
        <div>
            <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{labelText}</div>
            {helperText ? (
                <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.75rem' }}>{helperText}</div>
            ) : null}

            {/* Question */}
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{questionLabelText}</div>

                <ComboBox
                    id={`${id}-question`}
                    titleText="Search question concept"
                    items={qResults ?? []}
                    itemToString={itemToString}
                    placeholder="Type to search question…"
                    onInputChange={(text) => setQQuery(String(text ?? ''))}
                    onChange={(e: any) => setQuestion(e?.selectedItem ?? null)}
                />

                <div style={{ marginTop: '0.5rem' }}>
                    {qLoading ? <InlineLoading description="Searching…" /> : null}
                    {!qLoading && qError ? (
                        <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-error, #da1e28)' }}>{qError}</div>
                    ) : null}
                </div>

                {value.question ? (
                    <div style={{ marginTop: '0.75rem' }}>
                        <Tag type="gray" filter onClose={clearQuestion} title={selectedToString(value.question)}>
                            {value.question.display}
                            {value.question.icd10Code ? ` • ICD-10:${value.question.icd10Code}` : ''}
                            {value.question.icd11Code ? ` • ICD-11:${value.question.icd11Code}` : ''}
                        </Tag>
                    </div>
                ) : null}
            </div>

            {/* Answers (restricted to question answers) */}
            <div>
                <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{answersLabelText}</div>

                {value.question ? (
                    <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.75rem' }}>
                        Pick answer concept(s) for: <b>{value.question.display}</b>
                    </div>
                ) : (
                    <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.75rem' }}>
                        Select a question first to load its allowed answers.
                    </div>
                )}

                {aLoading ? <InlineLoading description="Loading answers…" /> : null}
                {!aLoading && aError ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-error, #da1e28)', marginBottom: '0.75rem' }}>
                        {aError}
                    </div>
                ) : null}

                <ComboBox
                    // force-reset input after each pick
                    key={answerComboKey}
                    id={`${id}-answers`}
                    titleText="Select answer"
                    items={answersOptions}
                    itemToString={(x) => selectedToString(x)}
                    disabled={!canPickAnswers}
                    placeholder={canPickAnswers ? 'Type to filter answers…' : 'Answers disabled'}
                    onChange={(e: any) => addAnswer(e?.selectedItem ?? null)}
                />

                {value.answers?.length ? (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {value.answers.map((x) => (
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
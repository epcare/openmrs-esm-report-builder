import type { SelectedConcept } from '../handler/concept-search-multiselect.component';

export type QAUiState = {
    /** Selected question concepts (multi-select) */
    questions: SelectedConcept[];
    answers: SelectedConcept[];
    error?: string;
};

export type ConceptUiMap = Record<string, SelectedConcept[]>;
export type QaUiMap = Record<string, QAUiState>;
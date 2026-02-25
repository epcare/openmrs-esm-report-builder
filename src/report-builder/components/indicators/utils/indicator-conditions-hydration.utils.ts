// src/report-builder/components/indicators/utils/indicator-conditions-hydration.utils.ts

import type { ThemeCondition } from '../types/data-theme-config.types';
import type { IndicatorCondition } from '../types/indicator-types';

import { getConceptByUuid } from '../../../services/concepts/concepts.resource';
import type { ConceptSummary } from '../../../services/concepts/concept-types';

import { toSelectedConcept, type SelectedConcept } from '../handler/concept-search-multiselect.component';
import type { QAUiState, ConceptUiMap, QaUiMap } from '../types/condition-ui.types';

export type HydrationOptions = {
    force?: boolean;
    dedupe?: boolean;
    preserveUnknownKeys?: boolean;
};

export type HydrationResult = {
    conceptUi: ConceptUiMap;
    qaUi: QaUiMap;
    stats: {
        themeConditionsCount: number;
        pickedConditionsCount: number;
        conceptConditionsHydrated: number;
        qaConditionsHydrated: number;
        tokensHydrated: number;
        tokensMissed: number;
    };
};

// Stored value shape in pickedConditions for QA handler
// (support both legacy single-question and current multi-question formats)
type QAValue = {
    question?: string | number | null;
    questions?: Array<string | number>;
    answers?: Array<string | number>;
};

function uniq(tokens: string[]) {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const t of tokens) {
        const k = String(t ?? '').trim();
        if (!k) continue;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(k);
    }
    return out;
}

/**
 * Hydrate ONE token into ConceptSummary (internal).
 * We now persist UUIDs, so we call direct endpoint by UUID.
 */
async function hydrateConceptSummaryToken(token: string, signal?: AbortSignal): Promise<ConceptSummary | null> {
    const tok = String(token ?? '').trim();
    if (!tok) return null;

    try {
        const concept = await getConceptByUuid(tok, signal);
        if (!concept?.uuid) return null;
        return concept;
    } catch {
        return null;
    }
}

/**
 * Hydrate ONE token into SelectedConcept (UI shape).
 * ✅ Uses toSelectedConcept so ICD mappings are preserved.
 */
async function hydrateConceptToken(token: string, signal?: AbortSignal): Promise<SelectedConcept | null> {
    const cs = await hydrateConceptSummaryToken(token, signal);
    return cs ? toSelectedConcept(cs) : null;
}

/**
 * Hydrate MANY tokens into SelectedConcept[].
 * ✅ for-loop; preserves order; returns only valid concepts.
 */
async function hydrateConceptTokens(tokens: string[], signal?: AbortSignal, dedupe = true): Promise<SelectedConcept[]> {
    const clean = dedupe ? uniq(tokens) : tokens.map((t) => String(t ?? '').trim()).filter(Boolean);
    if (!clean.length) return [];

    const results: SelectedConcept[] = [];

    for (const tok of clean) {
        if (signal?.aborted) break;

        try {
            const concept = await hydrateConceptToken(tok, signal);
            if (concept) results.push(concept);
        } catch {
            // ignore individual token failures
        }
    }

    return results;
}

/**
 * Hydrates UI state for concept-based conditions (edit mode):
 * - iterate picked first (source of truth)
 * - match to themeByKey for handler
 * - ensure defaults for theme conditions not saved
 */
export async function hydrateConditionUiState(
    themeConditions: ThemeCondition[] | undefined,
    pickedConditions: IndicatorCondition[] | undefined,
    existingConceptUi: ConceptUiMap | undefined,
    existingQaUi: QaUiMap | undefined,
    signal?: AbortSignal,
    options?: HydrationOptions,
): Promise<HydrationResult> {
    const opt: Required<HydrationOptions> = {
        force: options?.force ?? true,
        dedupe: options?.dedupe ?? true,
        preserveUnknownKeys: options?.preserveUnknownKeys ?? true,
    };

    const themeList = themeConditions ?? [];
    const pickedList = pickedConditions ?? [];

    const themeByKey = new Map<string, ThemeCondition>();
    for (const tc of themeList) {
        if (tc?.key) themeByKey.set(tc.key, tc);
    }

    const nextConceptUi: ConceptUiMap = { ...(existingConceptUi ?? {}) };
    const nextQaUi: QaUiMap = { ...(existingQaUi ?? {}) };

    let conceptConditionsHydrated = 0;
    let qaConditionsHydrated = 0;
    let tokensHydrated = 0;
    let tokensMissed = 0;

    const seenKeys = new Set<string>();

    // 1) hydrate from picked conditions (source of truth)
    for (const pc of pickedList) {
        if (!pc?.key) continue;
        seenKeys.add(pc.key);

        const tc = themeByKey.get(pc.key);
        if (!tc) {
            if (!opt.preserveUnknownKeys) {
                delete nextConceptUi[pc.key];
                delete nextQaUi[pc.key];
            }
            continue;
        }

        // -----------------------------
        // CONCEPT_SEARCH
        // -----------------------------
        if (tc.handler === 'CONCEPT_SEARCH') {
            const shouldHydrate =
                opt.force || !Array.isArray(nextConceptUi[tc.key]) || nextConceptUi[tc.key].length === 0;

            if (!shouldHydrate) continue;

            const raw = pc.value;

            if (Array.isArray(raw) && raw.length) {
                const tokens = raw.map((x) => String(x)).filter(Boolean);
                const selected = await hydrateConceptTokens(tokens, signal, opt.dedupe);

                tokensHydrated += selected.length;
                tokensMissed += Math.max(0, tokens.length - selected.length);

                nextConceptUi[tc.key] = selected;
            } else {
                nextConceptUi[tc.key] = [];
            }

            conceptConditionsHydrated += 1;
            continue;
        }

        // -----------------------------
        // QUESTION_ANSWER_CONCEPT_SEARCH
        // -----------------------------
        if (tc.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH') {
            const existing = nextQaUi[tc.key];

            const shouldHydrate =
                opt.force ||
                !existing ||
                ((existing.questions?.length ?? 0) === 0 && (existing.answers?.length ?? 0) === 0 && !existing.error);

            if (!shouldHydrate) continue;

            const raw: any = pc.value;

            const qa: QAValue | null = raw && typeof raw === 'object' ? (raw as QAValue) : null;

            // ✅ support both shapes: { question } OR { questions: [] }
            const qTokens: string[] = Array.isArray(qa?.questions)
                ? (qa?.questions ?? []).map((x) => String(x).trim()).filter(Boolean)
                : qa?.question !== null && qa?.question !== undefined
                    ? [String(qa.question).trim()].filter(Boolean)
                    : [];

            const aTokens: string[] = Array.isArray(qa?.answers)
                ? (qa?.answers ?? []).map((x) => String(x).trim()).filter(Boolean)
                : [];

            const questions: SelectedConcept[] = qTokens.length
                ? await hydrateConceptTokens(qTokens, signal, opt.dedupe)
                : [];

            const answers: SelectedConcept[] = aTokens.length
                ? await hydrateConceptTokens(aTokens, signal, opt.dedupe)
                : [];

            tokensHydrated += questions.length + answers.length;
            tokensMissed += Math.max(0, qTokens.length - questions.length) + Math.max(0, aTokens.length - answers.length);

            nextQaUi[tc.key] = { questions, answers };
            qaConditionsHydrated += 1;
            continue;
        }

        // other handlers ignored
    }

    // 2) ensure all theme conditions have UI defaults
    for (const tc of themeList) {
        if (!tc?.key) continue;

        if (!seenKeys.has(tc.key)) {
            if (tc.handler === 'CONCEPT_SEARCH') {
                if (!Array.isArray(nextConceptUi[tc.key])) nextConceptUi[tc.key] = [];
            }
            if (tc.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH') {
                if (!nextQaUi[tc.key]) nextQaUi[tc.key] = { questions: [], answers: [] };
            }
        }
    }

    return {
        conceptUi: nextConceptUi,
        qaUi: nextQaUi,
        stats: {
            themeConditionsCount: themeList.length,
            pickedConditionsCount: pickedList.length,
            conceptConditionsHydrated,
            qaConditionsHydrated,
            tokensHydrated,
            tokensMissed,
        },
    };
}
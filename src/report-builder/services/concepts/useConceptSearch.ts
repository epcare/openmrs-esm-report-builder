import React from 'react';
import { searchConcepts } from './concepts.resource';
import type { ConceptSummary } from './concept-types';

export function useConceptSearch(query: string) {
    const [loading, setLoading] = React.useState(false);
    const [results, setResults] = React.useState<ConceptSummary[]>([]);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            setError(null);
            return;
        }

        const ctrl = new AbortController();

        const t = window.setTimeout(async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await searchConcepts(q, ctrl.signal); // ✅ returns ConceptSummary[]
                setResults(res);
            } catch (e: any) {
                if (e?.name !== 'AbortError') setError('Failed to search concepts');
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            ctrl.abort();
            window.clearTimeout(t);
        };
    }, [query]);

    return { loading, results, error };
}
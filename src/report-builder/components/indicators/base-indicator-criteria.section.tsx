import React from 'react';
import { Stack, Search, InlineLoading, FilterableMultiSelect, Select, SelectItem } from '@carbon/react';

import { useConceptSearch } from '../../services/concepts/useConceptSearch';
import type { ConceptSummary } from '../../services/concepts/concept-types';
import type { CreateBaseIndicatorPayload } from './types/base-indicator-form.types';

type Props = {
    open: boolean; // to reset when modal opens
    state: CreateBaseIndicatorPayload;
    onChange: (patch: Partial<CreateBaseIndicatorPayload>) => void;
};

const BaseIndicatorCriteriaSection: React.FC<Props> = ({ open, state, onChange }) => {
    const [conceptQuery, setConceptQuery] = React.useState('');
    const { loading, results, error } = useConceptSearch(conceptQuery);

    // Force-reset Carbon internal selected state on open
    const [multiKey, setMultiKey] = React.useState(0);

    React.useEffect(() => {
        if (!open) return;
        setConceptQuery('');
        setMultiKey((k) => k + 1);
        onChange({ conditionConceptUuids: [], conditionConceptLabels: [] });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const itemToString = React.useCallback((item: ConceptSummary | null) => (item ? item.display : ''), []);

    const onSelectedItems = (selectedItems: ConceptSummary[]) => {
        onChange({
            conditionConceptUuids: selectedItems.map((x) => x.uuid),
            conditionConceptLabels: selectedItems.map((x) => x.display),
        });
    };

    return (
        <div>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Criteria</div>

            <Stack gap={4}>
                <Search
                    id="concept-search"
                    labelText="Search concepts"
                    placeholder="Type to search concepts..."
                    value={conceptQuery}
                    onChange={(e) => setConceptQuery((e.target as HTMLInputElement).value)}
                    size="lg"
                />

                {loading ? <InlineLoading description="Searching…" /> : null}
                {error ? (
                    <div style={{ fontSize: '0.875rem', color: 'var(--cds-text-error, #da1e28)' }}>{error}</div>
                ) : null}

                <FilterableMultiSelect
                    key={multiKey}
                    id="conditionConcepts"
                    titleText="Condition concept(s)"
                    items={results}
                    itemToString={itemToString}
                    placeholder={results.length ? 'Select concept(s)…' : 'No results'}
                    helperText="Select 1 concept for '=' filtering, select 2+ for 'IN (...)' filtering"
                    onChange={(e: any) => onSelectedItems((e.selectedItems ?? []) as ConceptSummary[])}
                />

                <Select
                    id="preg"
                    labelText="Pregnancy Status"
                    value={state.pregnancyStatus}
                    onChange={(e) => onChange({ pregnancyStatus: (e.target as HTMLSelectElement).value })}
                >
                    {['Pregnant', 'Not pregnant'].map((x) => (
                        <SelectItem key={x} value={x} text={x} />
                    ))}
                </Select>
            </Stack>
        </div>
    );
};

export default BaseIndicatorCriteriaSection;
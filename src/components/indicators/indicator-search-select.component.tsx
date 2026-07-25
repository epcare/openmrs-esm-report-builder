import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ComboBox, InlineLoading } from '@carbon/react';

import { listIndicators } from '../../resources/indicator/indicators.api';
import type { IndicatorOption } from './types/composite-indicator.types';

type ComboItem = {
    id: string;
    label: string;
    kind: 'BASE' | 'COMPOSITE';
    unit?: 'Patients' | 'Encounters';
    code?: string;
    isPlaceholder?: boolean;
};

type Props = {
    id: string;
    titleText: string;
    selectedId: string;
    disabled?: boolean;
    invalid?: boolean;
    invalidText?: string;
    onChange: (id: string, item: IndicatorOption | null) => void;
    placeholder?: string;
    // Filter to only include specific kinds (undefined = all)
    kinds?: ('BASE' | 'COMPOSITE')[];
};

const DEBOUNCE_MS = 600;
const MIN_SEARCH_LENGTH = 4;

/**
 * Async indicator search component that queries the database
 * with debounced search to avoid excessive API calls.
 */
export default function IndicatorSearchSelect({
    id,
    titleText,
    selectedId,
    disabled = false,
    invalid = false,
    invalidText = '',
    onChange,
    placeholder: placeholderText = '',
    kinds = undefined,
}: Props) {
    const [items, setItems] = useState<ComboItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<ComboItem | null>(null);

    // Refs for debouncing and abort control
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isMountedRef = useRef(true);
    const pendingQueryRef = useRef('');
    const completedQueryRef = useRef('');

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Load selected indicator details when selectedId changes
    useEffect(() => {
        if (!selectedId) {
            setSelectedItem(null);
            return;
        }

        const loadSelectedIndicator = async () => {
            try {
                const ac = new AbortController();
                abortControllerRef.current = ac;

                const indicators = await listIndicators(
                    { q: '', kind: undefined, v: 'full', includeRetired: false },
                    ac.signal,
                );

                const found = indicators.find((ind) => ind.uuid === selectedId);
                if (found && isMountedRef.current) {
                    const item: ComboItem = {
                        id: found.uuid,
                        label: `${found.name}${found.code ? ` (${found.code})` : ''}`,
                        kind: (found.kind || 'BASE') as 'BASE' | 'COMPOSITE',
                        unit: 'Patients',
                        code: found.code,
                    };
                    setSelectedItem(item);
                }
            } catch (e) {
                // Silently fail - the item will still work in the UI
            }
        };

        loadSelectedIndicator();
    }, [selectedId]);

    // Perform the actual search (called after debounce)
    const executeSearch = useCallback(
        async (searchQuery: string) => {
            try {
                const ac = new AbortController();
                abortControllerRef.current = ac;

                console.log('🔍 Searching for:', searchQuery);

                const results = await listIndicators(
                    {
                        q: searchQuery,
                        kind: undefined,
                        v: 'full',
                        includeRetired: false,
                    },
                    ac.signal,
                );

                console.log('✅ Search results:', results.length, 'items for:', searchQuery);

                // Only update if this is still the pending query
                if (pendingQueryRef.current === searchQuery && isMountedRef.current) {
                    // Filter by kinds if specified
                    const filtered = kinds
                        ? results.filter((ind) => kinds.includes(ind.kind as 'BASE' | 'COMPOSITE'))
                        : results;

                    // Map to combo items
                    const mapped: ComboItem[] = filtered.map((ind) => ({
                        id: ind.uuid,
                        label: `${ind.name}${ind.code ? ` (${ind.code})` : ''}`,
                        kind: (ind.kind || 'BASE') as 'BASE' | 'COMPOSITE',
                        unit: 'Patients',
                        code: ind.code,
                    }));

                    setItems(mapped);
                    setError(null);
                    completedQueryRef.current = searchQuery;
                }
            } catch (e: any) {
                if (isMountedRef.current && e.name !== 'AbortError') {
                    console.error('❌ Search error:', e);
                    setError(e?.message || 'Failed to search indicators');
                } else if (e.name === 'AbortError') {
                    console.log('⚠️ Search aborted for:', searchQuery);
                }
            } finally {
                if (isMountedRef.current && pendingQueryRef.current === searchQuery) {
                    setLoading(false);
                }
            }
        },
        [kinds],
    );

    // Debounced search function
    const scheduleSearch = useCallback(
        (searchQuery: string) => {
            // Clear previous debounce timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            // Update pending query
            pendingQueryRef.current = searchQuery;

            // If query is too short, don't search
            if (searchQuery.length < MIN_SEARCH_LENGTH) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            // Schedule the search
            debounceTimerRef.current = setTimeout(() => {
                // Cancel any pending request
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }
                // Execute the search
                executeSearch(searchQuery);
            }, DEBOUNCE_MS);
        },
        [executeSearch],
    );

    // Handle input changes
    const handleInputChange = useCallback(
        (inputText: string) => {
            // Ignore if input is empty or matches placeholder
            if (!inputText || inputText === placeholderText) {
                console.log('⏭️ Ignoring empty/placeholder input');
                setLoading(false);
                return;
            }

            // Only search if the input has actually changed
            if (inputText === pendingQueryRef.current || inputText === completedQueryRef.current) {
                console.log('⏭️ Skipping redundant search for:', inputText);
                return;
            }

            console.log('⌨️ Input changed to:', inputText);
            scheduleSearch(inputText);
        },
        [scheduleSearch, placeholderText],
    );

    // Handle selection changes
    const handleSelectionChange = useCallback((selected: ComboItem | null) => {
        console.log('🎯 Selection changed:', selected?.label || 'none');

        if (!selected || selected.isPlaceholder) {
            onChange('', null);
            return;
        }

        const indicatorOption: IndicatorOption = {
            id: selected.id,
            code: selected.code || '',
            name: selected.label.replace(/ \([^)]*\)$/, '').split(' (')[0],
            kind: selected.kind,
            unit: selected.unit || 'Patients',
        };

        onChange(selected.id, indicatorOption);
    }, [onChange]);

    // Build items list - always include placeholder and selected item
    const allItems = React.useMemo(() => {
        const placeholderItem: ComboItem = {
            id: '',
            label: placeholderText,
            kind: 'BASE',
            isPlaceholder: true,
        };

        // Start with placeholder
        const result = [placeholderItem];

        // Add selected item if it exists and is not already in the list
        if (selectedItem && !result.find((item) => item.id === selectedItem.id)) {
            result.push(selectedItem);
        }

        // Add search results (avoiding duplicates)
        items.forEach((item) => {
            if (!result.find((r) => r.id === item.id)) {
                result.push(item);
            }
        });

        return result;
    }, [items, selectedItem, placeholderText]);

    // Find the currently selected item from all items
    const currentSelection = React.useMemo(
        () => allItems.find((item) => item.id === selectedId) || null,
        [allItems, selectedId],
    );

    return (
        <div style={{ position: 'relative' }}>
            <ComboBox
                id={id}
                titleText={titleText}
                items={allItems}
                itemToString={(item) => (item ? item.label : '')}
                selectedItem={currentSelection}
                placeholder={placeholderText}
                disabled={disabled}
                invalid={invalid}
                invalidText={invalidText}
                onInputChange={handleInputChange}
                onChange={({ selectedItem: selected }) => handleSelectionChange(selected as ComboItem | null)}
            />
            {loading && !error && (
                <div
                    style={{
                        position: 'absolute',
                        right: '3rem',
                        top: '2.25rem',
                        zIndex: 1,
                        pointerEvents: 'none',
                    }}
                >
                    <InlineLoading description="Searching…" />
                </div>
            )}
            {error && (
                <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-error, #da1e28)', marginTop: '0.25rem' }}>
                    {error}
                </div>
            )}
        </div>
    );
}

import React from 'react';
import type { AgeCategoryOption } from '../../../resources/agegroup/agegroups.api';
import type { ReportSectionDto } from '../../../resources/report-section/report-sections.api';
import type { Dhis2MappingV1, ReportSectionEditorMode, SectionIndicatorRef, SectionIndicatorType } from '../section-types';
import { makeDisaggKey, safeParseJson } from '../section-utils';
import { listIndicators, getIndicator } from '../../../resources/indicator/indicators.api';

export function useSectionEditorState(args: {
    open: boolean;
    mode: ReportSectionEditorMode;
    initialSection?: ReportSectionDto | null;
    indicators: SectionIndicatorRef[];
    ageCategories: AgeCategoryOption[];
}) {
    const { open, mode, initialSection, indicators, ageCategories } = args;
    const isEdit = mode === 'edit';
    React.useEffect(() => {
        // Reset config-fetched indicators when modal closes or mode changes
        if (!open) {
            setSelectedFullFromConfig([]);
        }
    }, [open]);

    
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');

    const [disaggEnabled, setDisaggEnabled] = React.useState(false);
    const [selectedAgeCategory, setSelectedAgeCategory] = React.useState<AgeCategoryOption | null>(null);
    const [genderF, setGenderF] = React.useState(true);
    const [genderM, setGenderM] = React.useState(true);

    const [q, setQ] = React.useState('');
    const [selected, setSelected] = React.useState<Array<{ id: string; type: SectionIndicatorType; sortOrder: number }>>(
        [],
    );

    // Database search fallback state
    const [dbSearchResults, setDbSearchResults] = React.useState<SectionIndicatorRef[]>([]);
    const [dbSearching, setDbSearching] = React.useState(false);
    const [dbSearchError, setDbSearchError] = React.useState<string | null>(null);
    const [selectedDbResults, setSelectedDbResults] = React.useState<SectionIndicatorRef[]>([]);

    // Full details of selected indicators from section config (for edit mode)
    // This ensures indicators are visible even if not in the paginated list
    const [selectedFullFromConfig, setSelectedFullFromConfig] = React.useState<SectionIndicatorRef[]>([]);

    // DHIS2 mapping state
    const [dhis2Enabled, setDhis2Enabled] = React.useState(false);
    const [dhis2DatasetId, setDhis2DatasetId] = React.useState('');
    const [dhis2PeriodType, setDhis2PeriodType] = React.useState('Monthly');
    const [dhis2OrgUnitStrategy, setDhis2OrgUnitStrategy] = React.useState<'location' | 'fixed'>('location');

    const [dhis2IndicatorMap, setDhis2IndicatorMap] = React.useState<
        Record<string, { dataElementId: string; cocByDisagg: Record<string, string> }>
    >({});

    // For edit: resolve age category once loaded
    const [pendingAgeCategoryUuid, setPendingAgeCategoryUuid] = React.useState<string | null>(null);

    /**
     * ✅ Fix: prevent edit hydration from overwriting user clicks.
     * If parent passes a new initialSection object reference, the effect would re-run and reset everything.
     */
    const hydratedRef = React.useRef(false);

    React.useEffect(() => {
        if (!open) hydratedRef.current = false;
    }, [open]);

    // Reset only for create open
    React.useEffect(() => {
        if (!open) return;

        if (!isEdit) {
            setName('');
            setDescription('');
            setDisaggEnabled(false);
            setSelectedAgeCategory(null);
            setPendingAgeCategoryUuid(null);
            setGenderF(true);
            setGenderM(true);
            setQ('');
            setSelected([]);

            setDhis2Enabled(false);
            setDhis2DatasetId('');
            setDhis2PeriodType('Monthly');
            setDhis2OrgUnitStrategy('location');
            setDhis2IndicatorMap({});
        }
    }, [open, isEdit]);

    // Hydrate edit state (ONLY ONCE per modal open)
    React.useEffect(() => {
        if (!open || !isEdit || !initialSection) return;
        if (hydratedRef.current) return;
        hydratedRef.current = true;

        setQ(''); // clear stale search

        setName(initialSection.name ?? '');
        setDescription(initialSection.description ?? '');

        const cfg = safeParseJson(initialSection.configJson);
        const dis = cfg?.disaggregation;

        const disEnabled = Boolean(dis && dis.none !== true);
        setDisaggEnabled(disEnabled);

        if (disEnabled) {
            setPendingAgeCategoryUuid(dis?.ageCategoryUuid ?? null);
            const gs: Array<'F' | 'M'> = Array.isArray(dis?.genders) ? dis.genders : [];
            setGenderF(gs.includes('F'));
            setGenderM(gs.includes('M'));
        } else {
            setPendingAgeCategoryUuid(null);
            setSelectedAgeCategory(null);
            setGenderF(true);
            setGenderM(true);
        }

        // indicators
        const inds = Array.isArray(cfg?.indicators) ? cfg.indicators : [];
        const sel = inds
            .slice()
            .sort((a: any, b: any) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))
            .map((x: any, idx: number) => ({
                id: String(x.indicatorUuid),
                type: (x.kind as SectionIndicatorType) ?? 'BASE',
                sortOrder: Number(x.sortOrder ?? idx + 1),
            }));
        setSelected(sel);

        // Fetch full indicator details for selected indicators that aren't in the paginated list
        // This ensures they appear in the right panel even if not available in the initial indicators prop
        const fetchSelectedIndicatorDetails = async () => {
            const indicatorIds = sel.map((s) => s.id);
            const missingIds = indicatorIds.filter((id) => !indicators.some((i) => i.id === id));

            if (missingIds.length === 0) {
                setSelectedFullFromConfig([]);
                return;
            }

            try {
                // Fetch missing indicators in parallel
                const details = await Promise.all(
                    missingIds.map((id) =>
                        getIndicator(id, undefined, 'default').catch((e) => {
                            console.warn(`Failed to fetch indicator ${id}:`, e);
                            return null;
                        })
                    )
                );

                const validDetails = details.filter(Boolean);
                const sectionRefs: SectionIndicatorRef[] = validDetails.map((ind) => ({
                    id: ind.uuid,
                    name: ind.name,
                    code: ind.code ?? '',
                    type: ind.kind as SectionIndicatorType,
                }));

                setSelectedFullFromConfig(sectionRefs);
            } catch (e) {
                console.error('Failed to fetch selected indicator details:', e);
                setSelectedFullFromConfig([]);
            }
        };

        fetchSelectedIndicatorDetails();

        // DHIS2 mapping
        const ex = cfg?.exchangeMappings?.dhis2;
        const dh = ex && typeof ex === 'object' ? (ex as Dhis2MappingV1) : null;

        if (dh?.enabled) {
            setDhis2Enabled(true);
            setDhis2DatasetId(dh.datasetId ?? '');
            setDhis2PeriodType(dh.periodType ?? 'Monthly');
            setDhis2OrgUnitStrategy((dh.orgUnitStrategy as any) ?? 'location');

            const map: Record<string, { dataElementId: string; cocByDisagg: Record<string, string> }> = {};
            for (const s of sel) map[s.id] = { dataElementId: '', cocByDisagg: {} };

            for (const m of dh.indicatorMappings ?? []) {
                const uuid = String(m.indicatorUuid);
                map[uuid] = {
                    dataElementId: m.dataElementId ?? '',
                    cocByDisagg: (m.categoryOptionComboByDisagg ?? {}) as Record<string, string>,
                };
            }
            setDhis2IndicatorMap(map);
        } else {
            setDhis2Enabled(false);
            setDhis2DatasetId('');
            setDhis2PeriodType('Monthly');
            setDhis2OrgUnitStrategy('location');

            const map: Record<string, { dataElementId: string; cocByDisagg: Record<string, string> }> = {};
            for (const s of sel) map[s.id] = { dataElementId: '', cocByDisagg: {} };
            setDhis2IndicatorMap(map);
        }
    }, [open, isEdit, initialSection, indicators]);

    // Resolve pending age category uuid once categories loaded
    React.useEffect(() => {
        if (!pendingAgeCategoryUuid || !ageCategories.length) return;
        const found = ageCategories.find((x) => x.uuid === pendingAgeCategoryUuid) ?? null;
        if (found) setSelectedAgeCategory(found);
    }, [pendingAgeCategoryUuid, ageCategories]);

    // Database search fallback: trigger when local search is empty and query exists
    React.useEffect(() => {
        const searchQuery = q.trim().toLowerCase();

        // Reset database results when query is empty
        if (!searchQuery) {
            setDbSearchResults([]);
            setDbSearchError(null);
            return;
        }

        // Check if local search has results
        const localResults = indicators.filter((i) =>
            i.name.toLowerCase().includes(searchQuery) || i.code.toLowerCase().includes(searchQuery)
        );

        // If local search has results, don't search database
        if (localResults.length > 0) {
            setDbSearchResults([]);
            setDbSearchError(null);
            return;
        }

        // Local search is empty - trigger database search with debounce
        const timeoutId = setTimeout(async () => {
            setDbSearching(true);
            setDbSearchError(null);

            try {
                const ac = new AbortController();
                const results = await listIndicators({ q: searchQuery, v: 'default', includeRetired: false }, ac.signal);

                // Convert IndicatorDto to SectionIndicatorRef format
                const sectionRefs: SectionIndicatorRef[] = results.map((ind) => ({
                    id: ind.uuid,
                    name: ind.name,
                    code: ind.code ?? '',
                    type: ind.kind as SectionIndicatorType,
                }));

                setDbSearchResults(sectionRefs);
            } catch (e: any) {
                setDbSearchError(e?.message ?? 'Failed to search database');
                setDbSearchResults([]);
            } finally {
                setDbSearching(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [q, indicators]);

    const pickedGenders = React.useMemo(() => {
        const gs: Array<'F' | 'M'> = [];
        if (genderF) gs.push('F');
        if (genderM) gs.push('M');
        return gs;
    }, [genderF, genderM]);

    const hasBaseLike = React.useMemo(() => selected.some((x) => x.type === 'BASE' || x.type === 'COMPOSITE'), [selected]);

    const disaggMissing = hasBaseLike && (!disaggEnabled || !selectedAgeCategory?.code || pickedGenders.length === 0);

    const available = React.useMemo(() => {
        const s = q.trim().toLowerCase();
        const localResults = indicators.filter((i) => !s || i.name.toLowerCase().includes(s) || i.code.toLowerCase().includes(s));

        // If local search has results OR no search query, return local results only
        if (!s || localResults.length > 0) {
            return localResults;
        }

        // If local search is empty but we have a query, include database search results
        // Combine local results (empty) with database results, avoiding duplicates
        const localIds = new Set(localResults.map((i) => i.id));
        const dbResultsOnly = dbSearchResults.filter((i) => !localIds.has(i.id));

        return [...localResults, ...dbResultsOnly];
    }, [indicators, q, dbSearchResults]);

    const selectedFull = React.useMemo(() => {
        const setIds = new Set(selected.map((x) => x.id));
        const fromIndicators = indicators.filter((i) => setIds.has(i.id));
        const fromDbResults = selectedDbResults.filter((i) => setIds.has(i.id));
        const fromConfig = selectedFullFromConfig.filter((i) => setIds.has(i.id));

        // Deduplicate by id, prioritizing indicators > dbResults > config
        const seen = new Set<string>();
        const result: SectionIndicatorRef[] = [];

        for (const item of [...fromIndicators, ...fromDbResults, ...fromConfig]) {
            if (!seen.has(item.id)) {
                seen.add(item.id);
                result.push(item);
            }
        }

        return result;
    }, [selected, indicators, selectedDbResults, selectedFullFromConfig]);

    const isSelected = (id: string) => selected.some((x) => x.id === id);

    const disaggKeys = React.useMemo(() => {
        if (!disaggEnabled || !selectedAgeCategory || pickedGenders.length === 0) return [];
        const ages = (selectedAgeCategory.ageGroups ?? []).map((ag: any) => ag.label);
        const keys: Array<{ key: string; ageGroup: string; gender: 'F' | 'M' }> = [];
        for (const a of ages) {
            for (const g of pickedGenders) {
                keys.push({ key: makeDisaggKey(a, g), ageGroup: a, gender: g });
            }
        }
        return keys;
    }, [disaggEnabled, selectedAgeCategory, pickedGenders]);

    const toggleIndicator = React.useCallback(
        (i: SectionIndicatorRef, checked: boolean) => {
            setSelected((prev) => {
                let next;
                if (checked) {
                    if (prev.some((x) => x.id === i.id)) {
                        next = prev;
                    } else {
                        const nextSort = prev.length + 1;
                        next = [...prev, { id: i.id, type: i.type, sortOrder: nextSort }];
                    }
                } else {
                    const kept = prev.filter((x) => x.id !== i.id);
                    next = kept.map((x, idx) => ({ ...x, sortOrder: idx + 1 }));
                }

                return next;
            });

            // Add/remove from selectedDbResults if it's from database search
            const isInDbResults = dbSearchResults.some((db) => db.id === i.id);
            const isNotInOriginalIndicators = !indicators.some((orig) => orig.id === i.id);

            if (checked && isInDbResults && isNotInOriginalIndicators) {
                setSelectedDbResults((prev) => {
                    if (!prev.some((x) => x.id === i.id)) {
                        return [...prev, i];
                    }
                    return prev;
                });
            } else if (!checked) {
                setSelectedDbResults((prev) => prev.filter((x) => x.id !== i.id));
            }
        },
        [dbSearchResults, indicators],
    );

    const moveSelected = React.useCallback((id: string, dir: -1 | 1) => {
        setSelected((prev) => {
            const list = prev.slice().sort((a, b) => a.sortOrder - b.sortOrder);
            const idx = list.findIndex((x) => x.id === id);
            if (idx < 0) return prev;
            const j = idx + dir;
            if (j < 0 || j >= list.length) return prev;
            const tmp = list[idx];
            list[idx] = list[j];
            list[j] = tmp;
            return list.map((x, k) => ({ ...x, sortOrder: k + 1 }));
        });
    }, []);

    const updateDhis2DataElement = React.useCallback((indicatorId: string, value: string) => {
        setDhis2IndicatorMap((prev) => ({
            ...prev,
            [indicatorId]: {
                ...(prev[indicatorId] ?? { dataElementId: '', cocByDisagg: {} }),
                dataElementId: value,
            },
        }));
    }, []);

    const updateDhis2Coc = React.useCallback((indicatorId: string, disaggKey: string, value: string) => {
        setDhis2IndicatorMap((prev) => ({
            ...prev,
            [indicatorId]: {
                ...(prev[indicatorId] ?? { dataElementId: '', cocByDisagg: {} }),
                cocByDisagg: {
                    ...((prev[indicatorId]?.cocByDisagg ?? {}) as Record<string, string>),
                    [disaggKey]: value,
                },
            },
        }));
    }, []);

    return {
        isEdit,
        name,
        setName,
        description,
        setDescription,

        disaggEnabled,
        setDisaggEnabled,
        selectedAgeCategory,
        setSelectedAgeCategory,
        genderF,
        setGenderF,
        genderM,
        setGenderM,

        q,
        setQ,
        selected,
        setSelected,
        available,
        selectedFull,
        isSelected,
        toggleIndicator,
        moveSelected,

        pickedGenders,
        disaggMissing,
        disaggKeys,

        dhis2Enabled,
        setDhis2Enabled,
        dhis2DatasetId,
        setDhis2DatasetId,
        dhis2PeriodType,
        setDhis2PeriodType,
        dhis2OrgUnitStrategy,
        setDhis2OrgUnitStrategy,
        dhis2IndicatorMap,
        setDhis2IndicatorMap,
        updateDhis2DataElement,
        updateDhis2Coc,

        // Database search fallback state
        dbSearching,
        dbSearchError,
    };
}
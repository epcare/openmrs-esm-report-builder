import React from 'react';
import { Modal, Stack, TextInput, Select, SelectItem, Checkbox, InlineLoading, InlineNotification } from '@carbon/react';

import { getIndicator, type IndicatorDto } from '../../resources/indicator/indicators.api';
import { listAgeCategoriesWithGroups, type AgeCategoryOption } from '../../resources/agegroup/agegroups.api';
import QueryResultsPreview from '../shared/preview/query-results-preview.component';
import { buildFinalIndicatorSql, buildFinalIndicatorSqlAsync, type FinalIndicatorAuthoringV1 } from './utils/final-indicator-sql.utils';
import { compilePopulationSql, generateAgeSexDisaggregationSql, clearCompilationCache, type CompilerOptions } from './utils/population-sql.compiler';

type Props = {
    open: boolean;
    indicatorUuid: string | null;
    onClose: () => void;
};

type GenderOption = 'F' | 'M';

function safeParseJson<T = any>(input?: string | null): T | null {
    if (!input) return null;
    try {
        return JSON.parse(input) as T;
    } catch {
        return null;
    }
}

const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Modal for running/previewing indicator results with date range and age/gender disaggregation.
 * Based on the preview logic from create-final-indicator-modal.
 */
export default function IndicatorRunPreviewModal({ open, indicatorUuid, onClose }: Props) {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [indicator, setIndicator] = React.useState<IndicatorDto | null>(null);

    // Date inputs
    const [startDate, setStartDate] = React.useState('');
    const [endDate, setEndDate] = React.useState('');

    // Age/Gender inputs
    const [ageCategories, setAgeCategories] = React.useState<AgeCategoryOption[]>([]);
    const [loadingCats, setLoadingCats] = React.useState(false);
    const [catsError, setCatsError] = React.useState<string | null>(null);
    const [selectedAgeCategory, setSelectedAgeCategory] = React.useState('');
    const [genders, setGenders] = React.useState<GenderOption[]>(['F', 'M']);

    // Generated SQL
    const [sqlPreview, setSqlPreview] = React.useState('');
    const [buildingSql, setBuildingSql] = React.useState(false);

    // Load age categories when modal opens
    React.useEffect(() => {
        if (!open) {
            setAgeCategories([]);
            setCatsError(null);
            return;
        }

        const ac = new AbortController();
        setLoadingCats(true);
        setCatsError(null);

        listAgeCategoriesWithGroups(ac.signal)
            .then((items) => setAgeCategories(items ?? []))
            .catch((e: any) => setCatsError(e?.message ?? 'Failed to load age categories'))
            .finally(() => setLoadingCats(false));

        return () => ac.abort();
    }, [open]);

    // Load indicator when modal opens
    React.useEffect(() => {
        if (!open || !indicatorUuid) {
            setIndicator(null);
            setSqlPreview('');
            setError(null);
            setStartDate('');
            setEndDate('');
            setSelectedAgeCategory('');
            return;
        }

        const ac = new AbortController();
        setLoading(true);
        setError(null);

        Promise.all([
            getIndicator(indicatorUuid, ac.signal, 'full'),
        ])
            .then(([indData]) => {
                setIndicator(indData);

                // Set default dates (current month)
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                setStartDate(formatDate(firstDay));
                setEndDate(formatDate(lastDay));

                // Set default age category from config or first available
                const cfg = safeParseJson<Partial<FinalIndicatorAuthoringV1>>(indData.configJson);
                const configuredAgeCat = String(cfg?.ageGroupSetCode ?? cfg?.ageCategoryCode ?? '');

                if (configuredAgeCat) {
                    setSelectedAgeCategory(configuredAgeCat);
                } else if (ageCategories.length > 0) {
                    setSelectedAgeCategory(String(ageCategories[0].code ?? ''));
                }

                // Set genders from config or defaults
                if (cfg?.genders && Array.isArray(cfg.genders)) {
                    setGenders(cfg.genders as GenderOption[]);
                } else {
                    setGenders(['F', 'M']);
                }

                setLoading(false);
            })
            .catch((e) => {
                setError(e?.message ?? 'Failed to load indicator');
                setLoading(false);
            });

        return () => ac.abort();
    }, [open, indicatorUuid, ageCategories]);

    // Update selected age category when age categories load
    React.useEffect(() => {
        if (indicator && ageCategories.length > 0 && !selectedAgeCategory) {
            const cfg = safeParseJson<Partial<FinalIndicatorAuthoringV1>>(indicator.configJson);
            const configuredAgeCat = String(cfg?.ageGroupSetCode ?? cfg?.ageCategoryCode ?? '');

            if (configuredAgeCat) {
                setSelectedAgeCategory(configuredAgeCat);
            } else {
                setSelectedAgeCategory(String(ageCategories[0].code ?? ''));
            }
        }
    }, [indicator, ageCategories, selectedAgeCategory]);

    // compute sql preview (based on create-final-indicator-modal logic)
    React.useEffect(() => {
        if (!open || !indicator || !selectedAgeCategory) {
            setSqlPreview('');
            return;
        }

        const computeSql = async () => {
            setBuildingSql(true);

            try {
                let sql = '';

                // Handle different indicator types
                if (indicator.kind === 'FINAL') {
                    // FINAL indicator - use the same logic as create-final-indicator-modal
                    const cfg = safeParseJson<Partial<FinalIndicatorAuthoringV1>>(indicator.configJson);
                    const baseId = cfg?.baseIndicatorId;

                    if (!baseId) {
                        sql = '-- Error: No base indicator configured';
                    } else {
                        const getInd = async (uuid: string) => {
                            const ac = new AbortController();
                            try {
                                return await getIndicator(uuid, ac.signal, 'full');
                            } finally {
                                ac.abort();
                            }
                        };

                        const baseInd = await getIndicator(baseId, undefined, 'full');
                        if (!baseInd) {
                            sql = '-- Error: Failed to load base indicator';
                        } else if (baseInd.kind === 'COMPOSITE') {
                            clearCompilationCache();
                            sql = await buildFinalIndicatorSqlAsync({
                                baseIndicator: baseInd,
                                ageCategoryCode: selectedAgeCategory,
                                genders,
                                getIndicator: getInd,
                                compilerOptions: { allowRetired: true }
                            });
                        } else {
                            // BASE indicator as final
                            sql = buildFinalIndicatorSql({
                                baseIndicator: baseInd,
                                ageCategoryCode: selectedAgeCategory,
                                genders
                            });
                        }
                    }
                } else if (indicator.kind === 'COMPOSITE') {
                    // COMPOSITE indicator - compile to population SQL with disaggregation
                    clearCompilationCache();
                    const compilerResult = await compilePopulationSql(
                        indicator,
                        async (uuid) => {
                            const ac = new AbortController();
                            try {
                                return await getIndicator(uuid, ac.signal, 'full');
                            } finally {
                                ac.abort();
                            }
                        },
                        new Set(),
                        {} as CompilerOptions
                    );

                    // Apply age/gender disaggregation
                    sql = generateAgeSexDisaggregationSql({
                        populationSql: compilerResult.sql,
                        ageCategoryCode: selectedAgeCategory,
                        genders
                    });
                } else {
                    // BASE indicator - apply age/gender disaggregation
                    const compilerResult = await compilePopulationSql(
                        indicator,
                        async (uuid) => {
                            const ac = new AbortController();
                            try {
                                return await getIndicator(uuid, ac.signal, 'full');
                            } finally {
                                ac.abort();
                            }
                        },
                        new Set(),
                        {} as CompilerOptions
                    );

                    sql = generateAgeSexDisaggregationSql({
                        populationSql: compilerResult.sql,
                        ageCategoryCode: selectedAgeCategory,
                        genders
                    });
                }

                setSqlPreview(sql);
            } catch (e) {
                setSqlPreview(`-- Error building SQL: ${e instanceof Error ? e.message : String(e)}`);
            } finally {
                setBuildingSql(false);
            }
        };

        computeSql();
    }, [open, indicator, selectedAgeCategory, genders]);

    const canRun = Boolean(sqlPreview?.trim()) && Boolean(startDate) && Boolean(endDate) && !buildingSql;

    const toggleGender = (gender: GenderOption) => {
        const next = new Set(genders);
        if (next.has(gender)) {
            next.delete(gender);
        } else {
            next.add(gender);
        }
        setGenders(Array.from(next));
    };

    const indicatorKind = indicator?.kind ?? '...';

    return (
        <Modal
            open={open}
            onRequestClose={onClose}
            modalHeading={`Run Indicator: ${indicator?.name ?? 'Loading...'}`}
            modalLabel={`Indicator Preview • ${indicatorKind}`}
            primaryButtonText="Close"
            secondaryButtonText=""
            onRequestSubmit={onClose}
            size="lg"
        >
            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <InlineLoading description="Loading indicator..." />
                </div>
            ) : error ? (
                <InlineNotification kind="error" lowContrast title="Error" subtitle={error} />
            ) : catsError ? (
                <InlineNotification kind="error" lowContrast title="Age Categories" subtitle={catsError} />
            ) : indicator ? (
                <Stack gap={6}>
                    {/* Indicator Info */}
                    <div style={{ padding: '1rem', background: 'var(--cds-layer-accent, #f4f4f4)', borderRadius: '0.25rem' }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                            <strong>Code:</strong> {indicator.code || '—'} • <strong>Type:</strong> {indicatorKind}
                        </div>
                        {indicator.description ? (
                            <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.8 }}>
                                {indicator.description}
                            </div>
                        ) : null}
                    </div>

                    {/* Date Range */}
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Date Range</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <TextInput
                                id="run-preview-start"
                                labelText="Start date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate((e.target as HTMLInputElement).value)}
                            />
                            <TextInput
                                id="run-preview-end"
                                labelText="End date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate((e.target as HTMLInputElement).value)}
                            />
                        </div>
                    </div>

                    {/* Age Category */}
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Age Disaggregation</div>
                        {loadingCats ? (
                            <InlineLoading description="Loading age categories..." />
                        ) : (
                            <Select
                                id="run-preview-age-category"
                                labelText="Age Category"
                                value={selectedAgeCategory}
                                onChange={(e) => setSelectedAgeCategory(e.target.value)}
                                disabled={buildingSql}
                            >
                                {ageCategories.map((cat) => (
                                    <SelectItem key={cat.code} value={String(cat.code)} text={cat.name} />
                                ))}
                            </Select>
                        )}
                        <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>
                            Results will be disaggregated by age groups from this category.
                        </div>
                    </div>

                    {/* Gender Selection */}
                    <div>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Gender Breakdown</div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <Checkbox
                                id="run-gender-f"
                                labelText="Female"
                                checked={genders.includes('F')}
                                onChange={() => toggleGender('F')}
                                disabled={buildingSql}
                            />
                            <Checkbox
                                id="run-gender-m"
                                labelText="Male"
                                checked={genders.includes('M')}
                                onChange={() => toggleGender('M')}
                                disabled={buildingSql}
                            />
                        </div>
                        {genders.length === 0 && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.8 }}>
                                No gender filter - totals only
                            </div>
                        )}
                    </div>

                    {/* Building SQL indicator */}
                    {buildingSql && (
                        <InlineLoading description="Building query with age/gender disaggregation..." />
                    )}

                    {/* Results Preview */}
                    <QueryResultsPreview
                        title="Query Results"
                        sql={sqlPreview}
                        params={{ startDate, endDate }}
                        maxRows={500}
                        canRun={canRun}
                    />
                </Stack>
            ) : null}
        </Modal>
    );
}

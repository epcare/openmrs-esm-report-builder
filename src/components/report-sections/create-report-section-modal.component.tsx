import React from 'react';
import { Modal, Stack, InlineLoading, InlineNotification } from '@carbon/react';

import { getIndicator, type IndicatorDto } from '../../resources/indicator/indicators.api';
import { buildFinalIndicatorSql } from '../indicators/utils/final-indicator-sql.utils';

import type { ReportSectionEditorProps } from './section-types';
import type { Dhis2MappingV1, CreateSectionPayload, SectionIndicatorType } from './section-types';

import { useAgeCategories } from './hooks/useAgeCategories';
import { useSectionEditorState } from './hooks/useSectionEditorState';

import { SectionBasicsPanel } from './panels/SectionBasicsPanel';
import { DisaggregationPanel } from './panels/DisaggregationPanel';
import { IndicatorPickerPanel } from './panels/IndicatorPickerPanel';
import { Dhis2MappingPanel } from './panels/Dhis2MappingPanel';

import { normalizeCompiledSql, parseFinalAuthoring, safeTrim } from './section-utils';

type CompiledIndicatorConfig = {
    indicatorUuid: string;
    kind: SectionIndicatorType;
    code?: string;
    name?: string;
    sortOrder: number;
    disaggregation?: any;
    sql: { compiled: string; strategy: string; inputs?: any };
};

export default function CreateReportSectionModal(props: ReportSectionEditorProps) {
    const { open, onClose, onSubmit, indicators, mode = 'create', initialSection } = props;

    const { ageCategories, ageCatsLoading, ageCatsError } = useAgeCategories(open);

    const state = useSectionEditorState({
        open,
        mode,
        initialSection,
        indicators,
        ageCategories,
    });

    const [saving, setSaving] = React.useState(false);
    const [saveError, setSaveError] = React.useState<string | null>(null);

    const canSubmit =
        Boolean(state.name.trim()) &&
        state.selected.length > 0 &&
        !state.disaggMissing &&
        !saving;

    const buildDhis2Mapping = (): Dhis2MappingV1 => {
        return {
            version: 1,
            enabled: state.dhis2Enabled,
            datasetId: safeTrim(state.dhis2DatasetId) || undefined,
            periodType: safeTrim(state.dhis2PeriodType) || undefined,
            orgUnitStrategy: state.dhis2OrgUnitStrategy,
            mappingMode: 'dataElement-categoryOptionCombo',
            indicatorMappings: state.selected
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((s) => ({
                    indicatorUuid: s.id,
                    dataElementId: safeTrim(state.dhis2IndicatorMap[s.id]?.dataElementId) || undefined,
                    categoryOptionComboByDisagg:
                        state.disaggEnabled && state.disaggKeys.length ? state.dhis2IndicatorMap[s.id]?.cocByDisagg ?? {} : undefined,
                })),
        };
    };

    const submit = async () => {
        if (!canSubmit) return;

        setSaving(true);
        setSaveError(null);

        try {
            // Load full indicator definitions so SQL compilation has what it needs.
            const fulls = await Promise.all(
                state.selected
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((s) => getIndicator(s.id, undefined, 'full')),
            );

            const byId = new Map(fulls.map((x) => [x.uuid, x]));

            const sectionDisagg =
                state.disaggEnabled && state.selectedAgeCategory
                    ? {
                        version: 1,
                        ageCategoryUuid: state.selectedAgeCategory.uuid,
                        ageCategoryCode: state.selectedAgeCategory.code,
                        genders: state.pickedGenders,
                    }
                    : { version: 1, none: true };

            const indicatorConfigs: CompiledIndicatorConfig[] = state.selected
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((s) => {
                    const ind: IndicatorDto | undefined = byId.get(s.id);
                    const kind = s.type as SectionIndicatorType;

                    if (!ind) {
                        return {
                            indicatorUuid: s.id,
                            kind,
                            sortOrder: s.sortOrder,
                            sql: { compiled: '-- indicator not found', strategy: 'MISSING' },
                        };
                    }

                    if (kind === 'FINAL') {
                        const authoring = parseFinalAuthoring(ind);
                        const compiled = normalizeCompiledSql(ind.sqlTemplate ?? '');

                        return {
                            indicatorUuid: ind.uuid,
                            kind: 'FINAL',
                            code: ind.code,
                            name: ind.name,
                            sortOrder: s.sortOrder,
                            disaggregation: authoring
                                ? { ageCategoryCode: authoring.ageCategoryCode ?? authoring.ageGroupSetCode, genders: authoring.genders }
                                : undefined,
                            sql: {
                                compiled,
                                strategy: 'FINAL_TEMPLATE',
                                inputs: authoring
                                    ? {
                                        baseIndicatorId: authoring.baseIndicatorId,
                                        ageCategoryCode: authoring.ageCategoryCode ?? authoring.ageGroupSetCode,
                                        genders: authoring.genders,
                                    }
                                    : undefined,
                            },
                        };
                    }

                    const ageCode = state.selectedAgeCategory?.code ?? '';
                    let compiled = buildFinalIndicatorSql({
                        baseIndicator: ind,
                        ageCategoryCode: ageCode,
                        genders: state.pickedGenders,
                    });

                    compiled = normalizeCompiledSql(compiled);

                    return {
                        indicatorUuid: ind.uuid,
                        kind,
                        code: ind.code,
                        name: ind.name,
                        sortOrder: s.sortOrder,
                        sql: {
                            compiled,
                            strategy: kind === 'COMPOSITE' ? 'COMPOSITE+SECTION_DISAGG' : 'BASE+SECTION_DISAGG',
                            inputs: { sectionAgeCategoryCode: ageCode, sectionGenders: state.pickedGenders },
                        },
                    };
                });

            const config = {
                version: 1,
                name: state.name.trim(),
                description: state.description.trim() || undefined,
                disaggregation: sectionDisagg,
                indicators: indicatorConfigs,
                exchangeMappings: { dhis2: buildDhis2Mapping() },
                compiledAt: new Date().toISOString(),
            };

            const payload: CreateSectionPayload = {
                id: state.isEdit ? initialSection?.uuid : undefined,
                name: state.name.trim(),
                description: state.description.trim() || undefined,
                disaggregationEnabled: state.disaggEnabled,
                ageCategoryUuid: state.disaggEnabled ? state.selectedAgeCategory?.uuid ?? null : null,
                ageCategoryCode: state.disaggEnabled ? state.selectedAgeCategory?.code ?? null : null,
                genders: state.pickedGenders,
                indicators: indicatorConfigs.map((x) => ({
                    id: x.indicatorUuid,
                    type: x.kind,
                    sortOrder: x.sortOrder,
                    finalDisagg: x.disaggregation,
                })),
                configJson: JSON.stringify(config, null, 2),
            };

            onSubmit(payload);
        } catch (e: any) {
            setSaveError(e?.message ?? 'Failed to build section config');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onRequestClose={onClose}
            modalHeading={state.isEdit ? 'Edit Section' : 'Create Section'}
            primaryButtonText={state.isEdit ? 'Save changes' : 'Create Section'}
            secondaryButtonText="Cancel"
            onRequestSubmit={submit}
            primaryButtonDisabled={!canSubmit}
            size="lg"
        >
            <Stack gap={5}>
                <div style={{ opacity: 0.8 }}>Sections are groups of indicators with shared disaggregation options.</div>

                {ageCatsLoading ? <InlineLoading description="Loading age categories…" /> : null}
                {ageCatsError ? <InlineNotification kind="error" lowContrast title="Age categories" subtitle={ageCatsError} /> : null}
                {saveError ? <InlineNotification kind="error" lowContrast title="Section" subtitle={saveError} /> : null}

                <SectionBasicsPanel
                    name={state.name}
                    setName={state.setName}
                    description={state.description}
                    setDescription={state.setDescription}
                />

                <hr style={{ border: 0, borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)' }} />

                <DisaggregationPanel
                    disaggEnabled={state.disaggEnabled}
                    setDisaggEnabled={state.setDisaggEnabled}
                    ageCategories={ageCategories}
                    selectedAgeCategory={state.selectedAgeCategory}
                    setSelectedAgeCategory={state.setSelectedAgeCategory}
                    genderF={state.genderF}
                    setGenderF={state.setGenderF}
                    genderM={state.genderM}
                    setGenderM={state.setGenderM}
                    pickedGenders={state.pickedGenders}
                    disaggMissing={state.disaggMissing}
                    idPrefix={state.isEdit ? 'edit' : 'create'}
                />

                <IndicatorPickerPanel
                    q={state.q}
                    setQ={state.setQ}
                    available={state.available}
                    selectedFull={state.selectedFull}
                    selected={state.selected}
                    isSelected={state.isSelected}
                    toggleIndicator={state.toggleIndicator}
                    moveSelected={state.moveSelected}
                    idPrefix={state.isEdit ? 'edit' : 'create'}
                />

                <Dhis2MappingPanel
                    dhis2Enabled={state.dhis2Enabled}
                    setDhis2Enabled={state.setDhis2Enabled}
                    dhis2DatasetId={state.dhis2DatasetId}
                    setDhis2DatasetId={state.setDhis2DatasetId}
                    dhis2PeriodType={state.dhis2PeriodType}
                    setDhis2PeriodType={state.setDhis2PeriodType}
                    dhis2OrgUnitStrategy={state.dhis2OrgUnitStrategy}
                    setDhis2OrgUnitStrategy={state.setDhis2OrgUnitStrategy}
                    disaggEnabled={state.disaggEnabled}
                    selectedAgeCategory={state.selectedAgeCategory}
                    pickedGenders={state.pickedGenders}
                    selectedFull={state.selectedFull}
                    selected={state.selected}
                    disaggKeys={state.disaggKeys}
                    dhis2IndicatorMap={state.dhis2IndicatorMap}
                    updateDhis2DataElement={state.updateDhis2DataElement}
                    updateDhis2Coc={state.updateDhis2Coc}
                />

                {saving ? <InlineLoading description="Building section SQL…" /> : null}
            </Stack>
        </Modal>
    );
}
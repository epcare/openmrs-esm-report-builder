import type { MambaSectionDto } from '../../resources/report-section/mamba-sections.api';

export type SectionIndicatorType = 'BASE' | 'COMPOSITE' | 'FINAL';

export type SectionIndicatorRef = {
    id: string;
    type: SectionIndicatorType;
    code: string;
    name: string;
};

export type CreateSectionPayload = {
    id?: string; // section uuid when editing
    name: string;
    description?: string;

    disaggregationEnabled: boolean;
    ageCategoryUuid: string | null;
    ageCategoryCode?: string | null;
    genders: Array<'F' | 'M'>;

    indicators: Array<{ id: string; type: SectionIndicatorType; sortOrder: number; finalDisagg?: any }>;

    /**
     * JSON config that includes compiled SQL + strategy metadata.
     * This is the payload you can persist as-is on the backend.
     */
    configJson: string;
};

export type Dhis2MappingV1 = {
    version: 1;
    enabled: boolean;
    datasetId?: string;
    periodType?: string;
    orgUnitStrategy?: 'location' | 'fixed';
    mappingMode?: 'dataElement-categoryOptionCombo';
    indicatorMappings: Array<{
        indicatorUuid: string;
        dataElementId?: string;
        categoryOptionComboByDisagg?: Record<string, string>;
    }>;
};

export type ReportSectionEditorMode = 'create' | 'edit';

export type ReportSectionEditorProps = {
    open: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateSectionPayload) => void;
    indicators: SectionIndicatorRef[];

    mode?: ReportSectionEditorMode;
    initialSection?: MambaSectionDto | null;
};
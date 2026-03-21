import type { ReportDefinitionDraft } from '../definition/report-definition.types';
import type {
    DesignDimension,
    DesignGroup,
    DesignRow,
    ReportDesignDraft,
} from './report-design.types';

function makeId(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyReportDesignDraft(): ReportDesignDraft {
    return {
        version: 1,
        template: 'section-tabular',
        arrayName: 'results',
        defaultValue: 0,
        dimensions: {},
        groups: [],
    };
}

export function createDefaultDimensions(): Record<string, DesignDimension> {
    return {
        sex: {
            id: 'sex',
            label: 'Sex',
            options: [
                { id: 'M', label: 'Male' },
                { id: 'F', label: 'Female' },
            ],
        },
    };
}

export function createEmptyDesignGroup(title = 'New Group'): DesignGroup {
    return {
        id: makeId('group'),
        title,
        rows: [],
    };
}

export function createEmptyDesignRow(): DesignRow {
    return {
        id: makeId('row'),
        type: 'indicator',
        code: '',
        label: '',
        indent: 0,
        keyPattern: '{code}_{age}_{sex}',
        dims: {},
        showTotal: true,
        showDisaggregation: true,
    };
}

/**
 * First-pass bootstrap from report definition.
 * For now, this creates one group per selected section ref.
 * Since the definition draft does not yet carry full section metadata here,
 * labels default to section UUID and can be refined later.
 */
export function buildDesignFromDefinition(
    definition: ReportDefinitionDraft,
    sectionNameLookup?: Record<string, string>,
): ReportDesignDraft {
    const groups: DesignGroup[] = (definition.sections ?? []).map((sectionRef) => ({
        id: makeId('group'),
        title:
            sectionRef.titleOverride?.trim() ||
            sectionNameLookup?.[sectionRef.sectionUuid] ||
            sectionRef.sectionUuid,
        rows: [],
    }));

    return {
        version: 1,
        template: 'section-tabular',
        arrayName: 'results',
        defaultValue: 0,
        dimensions: createDefaultDimensions(),
        groups,
    };
}
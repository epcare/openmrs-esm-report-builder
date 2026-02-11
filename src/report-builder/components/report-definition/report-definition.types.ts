export type IndicatorKind = 'base' | 'final';

export type Indicator = {
    id: string;
    code: string;
    name: string;
    kind: IndicatorKind;
    description?: string;
};

export type Section = {
    id: string;
    name: string;
    description?: string;
    indicators: Indicator[];
    disaggregationEnabled: boolean;
    ageCategory: string;
};

export type ReportDefinitionModel = {
    name: string;
    description: string;
    sections: Section[];
    standaloneIndicators: Indicator[];
    indicatorLibrary: Indicator[];
};

export const ageCategoryOptions = [
    { value: 'standard_hmis', label: 'Standard HMIS' },
    { value: 'moh_105_opd_diag', label: 'MOH 105 OPD Diagnoses' },
    { value: 'moh_mch', label: 'MOH MCH' },
];

export function createMockReportDefinitionModel(): ReportDefinitionModel {
    const indicatorLibrary: Indicator[] = [
        { id: 'i-1', code: 'OPD_NEW', name: 'New OPD Visits', kind: 'base' },
        { id: 'i-2', code: 'OPD_REV', name: 'Revisits', kind: 'base' },
        { id: 'i-3', code: 'ANC_1ST', name: 'ANC First Visit', kind: 'base' },
        { id: 'i-4', code: 'MAL_CASES', name: 'Malaria Cases', kind: 'final' },
        { id: 'i-5', code: 'TOT_ADM', name: 'Total Admissions', kind: 'base' },
    ];

    return {
        name: 'OPD Summary',
        description: '',
        indicatorLibrary,
        sections: [
            {
                id: 'sec-root',
                name: 'OPD Summary',
                description: 'OPD monthly summary',
                disaggregationEnabled: true,
                ageCategory: 'standard_hmis',
                indicators: [],
            },
            {
                id: 'sec-opd',
                name: 'OPD Attendance',
                description: 'A summary of outpatient clinic attendance',
                disaggregationEnabled: true,
                ageCategory: 'standard_hmis',
                indicators: [
                    { id: 'i-1', code: 'OPD_NEW', name: 'New OPD Visits', kind: 'base' },
                    { id: 'i-2', code: 'OPD_REV', name: 'Revisits', kind: 'base' },
                ],
            },
            {
                id: 'sec-mat',
                name: 'Maternal Health',
                description: 'Indicators related to maternal health services',
                disaggregationEnabled: true,
                ageCategory: 'standard_hmis',
                indicators: [{ id: 'i-3', code: 'ANC_1ST', name: 'ANC First Visit', kind: 'base' }],
            },
        ],
        standaloneIndicators: [{ id: 'i-5', code: 'TOT_ADM', name: 'Total Admissions', kind: 'base' }],
    };
}

const ReportDefinitionTypes = {};
export default ReportDefinitionTypes;
export type IndicatorUnit = 'Patients' | 'Encounters';

export type CreateBaseIndicatorPayload = {
    code: string;
    theme: string; // e.g. DIAGNOSIS, OBSERVATIONS, MEDICATIONS, LAB
    indicatorName: string;
    description: string;

    // Concept selection (multi)
    conditionConceptUuids: string[];
    conditionConceptLabels: string[];

    pregnancyStatus: string;

    unit: IndicatorUnit;
    countBy: IndicatorUnit;
};
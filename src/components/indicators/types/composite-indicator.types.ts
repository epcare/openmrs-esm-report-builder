export type CompositeOperator = 'AND' | 'OR' | 'A_AND_NOT_B';

export type IndicatorOption = {
    id: string; // uuid
    code: string;
    name: string;
    kind: 'BASE' | 'COMPOSITE';
    unit?: 'Patients' | 'Encounters';
};

/**
 * @deprecated Use IndicatorOption instead
 */
export type BaseIndicatorOption = IndicatorOption;

export type CreateCompositeBaseIndicatorPayload = {
    code: string;
    name: string;
    description: string;

    indicatorAId: string; // uuid
    indicatorBId: string; // uuid
    operator: CompositeOperator;

    unit?: 'Patients' | 'Encounters';
    sqlTemplate?: string; // composite COUNT SQL
};
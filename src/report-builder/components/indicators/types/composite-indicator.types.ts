export type CompositeOperator = 'AND' | 'OR' | 'A_AND_NOT_B';

export type BaseIndicatorOption = {
    id: string; // uuid
    code: string;
    name: string;
    unit?: 'Patients' | 'Encounters';
};

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
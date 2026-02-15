export type ConceptMappingSummary = {
    source: string;   // e.g. "CIEL", "ICD-10-WHO", "SNOMED CT"
    code: string;     // e.g. "116128", "B54", "61462000"
    mapType?: string; // e.g. "SAME-AS"
    display: string;  // original display string e.g. "CIEL: 116128"
};

export type ConceptSummary = {
    uuid: string;
    display: string;

    conceptClass?: string; // e.g. "Diagnosis"
    datatype?: string;     // e.g. "Coded", "Numeric", "N/A"

    // “best effort” external codes for showing + decisioning
    mappings: ConceptMappingSummary[];

    // convenience fields
    cielCode?: string;     // if present
    icd10Code?: string;    // if present
};
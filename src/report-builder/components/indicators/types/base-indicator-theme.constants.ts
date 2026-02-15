export const THEME_OPTIONS = ['DIAGNOSIS', 'OBSERVATIONS', 'MEDICATIONS', 'LAB'] as const;

export const THEME_LABELS: Record<(typeof THEME_OPTIONS)[number], string> = {
    DIAGNOSIS: 'Diagnosis Data',
    OBSERVATIONS: 'Observations',
    MEDICATIONS: 'Medications',
    LAB: 'Laboratory',
};
export type AiPromptContext = {
    page?: string; // e.g. 'Indicators', 'Sections', etc.
    selectedIndicatorUuids?: string[];
    activeFilters?: Record<string, any>;
};

export type AiSuggestion = {
    title: string;
    body: string;
    rawPrompt: string;
    usedContext: boolean;
};
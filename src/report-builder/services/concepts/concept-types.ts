export type ConceptMapping = {
    display: string;
    uuid: string;
    conceptMapType?: {
        display?: string;
    };
};

export type ConceptSummary = {
    id: number;
    uuid: string;
    display: string;

    datatype?: {
        uuid: string;
        name: string;
    };

    conceptClass?: {
        uuid: string;
        name: string;
    };

    answers?: Array<{
        uuid: string;
        display: string;
    }>;

    mappings?: ConceptMapping[];
};
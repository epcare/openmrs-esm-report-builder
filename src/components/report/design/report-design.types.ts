export type DesignDimensionOption = {
    id: string;
    label: string;
};

export type DesignDimension = {
    id: string;
    label: string;
    options: DesignDimensionOption[];
};

export type DesignRowType = 'indicator' | 'label' | 'spacer';

export type DesignRow = {
    id: string;
    type: DesignRowType;
    code?: string;
    label: string;
    indent: number;
    keyPattern?: string;
    dims?: Record<string, string | undefined>;
    showTotal?: boolean;
    showDisaggregation?: boolean;
};

export type DesignGroup = {
    id: string;
    title: string;
    rows: DesignRow[];
};

export type ReportDesignDraft = {
    version: 1;
    template: 'section-tabular';
    arrayName: string;
    defaultValue: number;
    dimensions: Record<string, DesignDimension>;
    groups: DesignGroup[];
};
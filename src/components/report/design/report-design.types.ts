export type DesignDimensionOption = {
    id: string;
    label: string;
};

export type DesignDimension = {
    id: string;
    label: string;
    options: DesignDimensionOption[];
};

export type DesignRowType = 'section-label' | 'group-label' | 'indicator' | 'label' | 'spacer';

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

    // presentation hints
    span?: 'all' | 'label-only';
    emphasis?: 'section' | 'group' | 'normal' | 'summary';

    // Positional tracking for hierarchical structure
    parentId?: string;              // ID of the parent row (for items indented under group-labels)
    position?: number;             // Position within the group (0-indexed)
    children?: string[];            // IDs of child rows (explicit tracking for group-labels)
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
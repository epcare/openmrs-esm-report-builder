import {
    Report,
    ChartColumn,
    Medication,
    Calendar,
    Hospital,
    Document,
    Search,
    Information,
    Warning,
    CheckmarkFilled,
    List,
    Tag,
} from '@carbon/icons-react';

export const themeIconOptions = [
    { key: 'Report', label: 'Report', Icon: Report },
    { key: 'ChartColumn', label: 'Chart', Icon: ChartColumn },
    { key: 'Medication', label: 'Medication', Icon: Medication },
    { key: 'Calendar', label: 'Appointments', Icon: Calendar },
    { key: 'Hospital', label: 'Facility', Icon: Hospital },
    { key: 'Document', label: 'Document', Icon: Document },
    { key: 'Search', label: 'Search', Icon: Search },
    { key: 'Information', label: 'Info', Icon: Information },
    { key: 'Warning', label: 'Warning', Icon: Warning },
    { key: 'CheckmarkFilled', label: 'Check', Icon: CheckmarkFilled },
    { key: 'List', label: 'List', Icon: List },
    { key: 'Tag', label: 'Tag', Icon: Tag },
] as const;

export type ThemeIconKey = (typeof themeIconOptions)[number]['key'];

export function getThemeIcon(key?: string) {
    return themeIconOptions.find((x) => x.key === key)?.Icon;
}
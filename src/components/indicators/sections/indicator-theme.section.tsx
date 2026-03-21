import React from 'react';
import { InlineLoading, Select, SelectItem, Stack } from '@carbon/react';
import type { DataThemeDto } from '../../../resources/theme/data-theme.api';

type Props = {
    themes: DataThemeDto[];
    loading: boolean;
    error?: string | null;

    themeUuid: string;
    onThemeUuidChange: (uuid: string) => void;

    themeConfigError?: string | null;
};

export default function IndicatorThemeSection({
                                                  themes,
                                                  loading,
                                                  error,
                                                  themeUuid,
                                                  onThemeUuidChange,
                                                  themeConfigError,
                                              }: Props) {
    return (
        <Stack gap={4}>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Data Theme</div>

            {loading ? <InlineLoading description="Loading themes…" /> : null}
            {!loading && error ? <div style={{ color: 'var(--cds-text-error, #da1e28)' }}>{error}</div> : null}

            <Select
                id="indicator-theme"
                labelText="Select a theme"
                value={themeUuid}
                onChange={(e) => onThemeUuidChange((e.target as HTMLSelectElement).value)}
            >
                <SelectItem value="" text="Select…" />
                {(themes ?? []).map((t) => (
                    <SelectItem key={t.uuid} value={t.uuid} text={`${t.name}${t.code ? ` (${t.code})` : ''}`} />
                ))}
            </Select>

            {themeConfigError ? (
                <div style={{ color: 'var(--cds-text-error, #da1e28)', marginTop: '0.25rem' }}>{themeConfigError}</div>
            ) : null}
        </Stack>
    );
}
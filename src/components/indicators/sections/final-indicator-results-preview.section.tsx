import React from 'react';
import { TextInput } from '@carbon/react';

import QueryResultsPreview from '../../shared/preview/query-results-preview.component';

type Props = {
    sql: string;
    maxRows?: number;

    startDate: string;
    endDate: string;
    onChangeStartDate: (v: string) => void;
    onChangeEndDate: (v: string) => void;
};

export default function FinalIndicatorResultsPreviewSection({
                                                                sql,
                                                                maxRows = 200,
                                                                startDate,
                                                                endDate,
                                                                onChangeStartDate,
                                                                onChangeEndDate,
                                                            }: Props) {
    const canRun = Boolean(sql?.trim()) && Boolean(startDate) && Boolean(endDate);

    return (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '320px 1fr',
                    gap: '1rem',
                    alignItems: 'start',
                }}
            >
                {/* Left column: dates */}
                <div style={{ display: 'grid', gap: '1rem' }}>
                    <TextInput
                        id="final-preview-start"
                        labelText="Start date"
                        type="date"
                        value={startDate}
                        onChange={(e) => onChangeStartDate((e.target as HTMLInputElement).value)}
                    />
                    <TextInput
                        id="final-preview-end"
                        labelText="End date"
                        type="date"
                        value={endDate}
                        onChange={(e) => onChangeEndDate((e.target as HTMLInputElement).value)}
                    />
                </div>

                {/* Right column: query preview */}
                <QueryResultsPreview
                    title="Query results preview"
                    sql={sql}
                    params={{ startDate, endDate }}
                    maxRows={maxRows}
                    canRun={canRun}
                />
            </div>
        </div>
    );
}
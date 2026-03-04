import React from 'react';
import { InlineLoading, InlineNotification, TextArea } from '@carbon/react';

type Props = {
    loading: boolean;
    errA?: string | null;
    errB?: string | null;
    compositeSql: string;

    show: boolean;
};

export default function CompositeIndicatorSqlPreviewSection({ loading, errA, errB, compositeSql, show }: Props) {
    return (
        <>
            {loading ? <InlineLoading description="Loading selected indicators…" /> : null}
            {errA ? <InlineNotification kind="error" lowContrast title="Indicator A" subtitle={errA} /> : null}
            {errB ? <InlineNotification kind="error" lowContrast title="Indicator B" subtitle={errB} /> : null}

            {show && !errA && !errB ? (
                <TextArea
                    id="composite-sql-preview"
                    labelText="Composite SQL Preview"
                    value={compositeSql || '—'}
                    readOnly
                    rows={14}
                />
            ) : null}
        </>
    );
}
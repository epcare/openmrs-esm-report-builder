import React from 'react';

type Props = {
    sql: string;
};

export default function IndicatorSqlPreviewSection({ sql }: Props) {
    if (!sql) return <div style={{ opacity: 0.8 }}>SQL preview will appear once a theme is selected.</div>;

    return (
        <div>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>SQL Preview</div>
            <pre
                style={{
                    fontSize: '0.875rem',
                    background: 'var(--cds-layer-01)',
                    padding: '0.75rem',
                    borderRadius: 6,
                    overflowX: 'auto',
                }}
            >
{sql}
      </pre>
        </div>
    );
}
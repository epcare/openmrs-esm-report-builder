import React from 'react';
import { Button, Stack } from '@carbon/react';

type Props = {
    sql: string;
    onChange?: (sql: string) => void;
    onReset?: () => void;
    editable?: boolean;
};

export default function IndicatorSqlPreviewSection({
    sql,
    onChange,
    onReset,
    editable = true
}: Props) {
    if (!sql) return <div style={{ opacity: 0.8 }}>SQL preview will appear once a theme is selected.</div>;

    return (
        <div>
            <Stack gap={4}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600 }}>SQL Preview</div>
                    {editable && onReset && (
                        <Button size="sm" kind="ghost" onClick={onReset}>
                            Reset to Generated
                        </Button>
                    )}
                </div>
                {editable ? (
                    <textarea
                        value={sql}
                        onChange={(e) => onChange?.(e.target.value)}
                        style={{
                            width: '100%',
                            minHeight: '200px',
                            fontSize: '0.875rem',
                            fontFamily: 'monospace',
                            background: 'var(--cds-layer-01)',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            border: '1px solid var(--cds-border-01, #e0e0e0)',
                            resize: 'vertical',
                        }}
                        placeholder="SQL query will appear here..."
                    />
                ) : (
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
                )}
            </Stack>
        </div>
    );
}
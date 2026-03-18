import React from 'react';
import { CodeSnippet } from '@carbon/react';

type Props = {
    sql: string;
    show: boolean;
};

export default function FinalIndicatorPreviewSection({ sql, show }: Props) {
    if (!show) return null;

    return (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
            <div style={{ fontWeight: 600 }}>SQL Preview</div>
            <CodeSnippet type="multi" wrapText>
                {sql || '-- SQL will appear here once selections are made.'}
            </CodeSnippet>
        </div>
    );
}
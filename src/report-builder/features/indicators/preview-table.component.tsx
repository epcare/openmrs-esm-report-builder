import React from 'react';

export type PreviewRow = { category: string; count: number };

const PreviewTable: React.FC<{ rows: PreviewRow[] }> = ({ rows }) => {
    return (
        <div style={{ border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, padding: '0.75rem', borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)' }}>
                Preview
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                <tr style={{ background: 'var(--cds-layer, #f4f4f4)' }}>
                    <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem' }}>Category</th>
                    <th style={{ textAlign: 'right', padding: '0.6rem 0.75rem' }}>Count</th>
                </tr>
                </thead>
                <tbody>
                {rows.map((r) => (
                    <tr key={r.category}>
                        <td style={{ padding: '0.6rem 0.75rem', borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)' }}>{r.category}</td>
                        <td style={{ padding: '0.6rem 0.75rem', borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)', textAlign: 'right' }}>{r.count}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

export default PreviewTable;
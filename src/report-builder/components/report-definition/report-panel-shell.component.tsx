import React from 'react';

type Props = {
    title: React.ReactNode;
    right?: React.ReactNode;
    children: React.ReactNode;
    bottom?: React.ReactNode;
    minHeight?: number;
};

const ReportPanelShell: React.FC<Props> = ({ title, right, children, bottom, minHeight = 560 }) => {
    return (
        <div
            style={{
                background: '#fff',
                border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                borderRadius: 12,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight,
            }}
        >
            <div
                style={{
                    padding: '0.9rem 1rem',
                    borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                }}
            >
                <div style={{ fontWeight: 600 }}>{title}</div>
                {right ?? null}
            </div>

            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                {children}
            </div>

            {bottom ? (
                <div
                    style={{
                        padding: '0.9rem 1rem',
                        borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                    }}
                >
                    {bottom}
                </div>
            ) : null}
        </div>
    );
};

export default ReportPanelShell;
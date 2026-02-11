import React from 'react';

type Props = {
    level?: number;
    selected?: boolean;
    onClick?: () => void;
    leftIcon?: React.ReactNode;
    label: string;
    right?: React.ReactNode;
};

const ReportTreeRow: React.FC<Props> = ({ level = 0, selected, onClick, leftIcon, label, right }) => {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.55rem 0.6rem',
                borderRadius: 8,
                cursor: onClick ? 'pointer' : 'default',
                background: selected ? 'rgba(0,0,0,0.04)' : 'transparent',
                marginLeft: level * 14,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                {leftIcon}
                <div style={{ fontWeight: selected ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {label}
                </div>
            </div>
            {right}
        </div>
    );
};

export default ReportTreeRow;
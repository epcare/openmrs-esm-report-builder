import React from 'react';

type Props = {
    title: string;
    subtitle: string;
};

const ReportDefinitionHeader: React.FC<Props> = ({ title, subtitle }) => {
    return (
        <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{title}</div>
            <div style={{ opacity: 0.75, marginTop: 2 }}>{subtitle}</div>
        </div>
    );
};

export default ReportDefinitionHeader;
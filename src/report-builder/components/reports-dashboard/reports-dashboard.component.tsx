import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Header from '../header/header.component';
import ReportsTable, { type ReportSummary } from './reports-table.component';

import styles from './reports-dashboard.scss';

const mockReports: ReportSummary[] = [
    { id: 'hmis-105', name: 'HMIS 105 – Monthly Report', status: 'Draft', updatedAt: '2026-02-09' },
    { id: 'hmis-108', name: 'HMIS 108 – Weekly Surveillance', status: 'Published', updatedAt: '2026-02-05' },
];

const ReportsDashboard: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [search, setSearch] = React.useState('');

    const headers = [
        { key: 'name', header: t('reportName', 'Report') },
        { key: 'status', header: t('status', 'Status') },
        { key: 'updatedAt', header: t('lastUpdated', 'Last updated') },
    ];

    const filteredReports = React.useMemo(() => {
        if (!search.trim()) return mockReports;
        const q = search.toLowerCase();
        return mockReports.filter(
            (r) =>
                r.name.toLowerCase().includes(q) ||
                r.status.toLowerCase().includes(q),
        );
    }, [search]);

    return (
        <div className={styles.page}>
            <Header
                title={t('reports', 'Manage Reports')}
                subtitle={t('manageReports', 'Manage and create reports')}
            />

            <ReportsTable
                reports={filteredReports}
                headers={headers}
                searchValue={search}
                onSearchChange={(v) => setSearch(v)}
                onCreateReport={() => navigate('/new')}
                onRowClick={(id) => navigate(`/edit/${id}`)}
            />

            {filteredReports.length === 0 ? (
                <div className={styles.emptyState}>
                    {t('noReportsFound', 'No reports match your search')}
                </div>
            ) : null}
        </div>
    );
};

export default ReportsDashboard;
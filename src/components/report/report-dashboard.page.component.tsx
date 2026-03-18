import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Header from '../shared/header/header.component';
import ReportsTable, { type ReportSummary } from './dashboard/reports-table.component';
import { listMambaReports } from '../../resources/report/mambareports.api';

const ReportDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [search, setSearch] = React.useState('');
  const [reports, setReports] = React.useState<ReportSummary[]>([]);

  React.useEffect(() => {
    const ac = new AbortController();

    listMambaReports({ v: 'default', includeRetired: false }, ac.signal)
        .then((data) =>
            setReports(
                data.map((r) => ({
                  id: r.uuid,
                  name: r.name,
                  status: r.retired ? 'Retired' : 'Draft',
                  updatedAt: '',
                })),
            ),
        )
        .catch(() => setReports([]));

    return () => ac.abort();
  }, []);

  const headers = React.useMemo(
      () => [
        { key: 'name', header: t('reportName', 'Report') },
        { key: 'status', header: t('status', 'Status') },
        { key: 'updatedAt', header: t('lastUpdated', 'Last updated') },
      ],
      [t],
  );

  const filteredReports = React.useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter((r) => r.name.toLowerCase().includes(q) || r.status.toLowerCase().includes(q));
  }, [search, reports]);

  return (
      <div>
        <Header
            title={t('reports', 'Manage Reports')}
            subtitle={t('manageReports', 'Manage and create reports')}
        />

        <ReportsTable
            reports={filteredReports}
            headers={headers}
            searchValue={search}
            onSearchChange={setSearch}
            onCreateReport={() => navigate('/new')}
            onRowClick={(id) => navigate(`/edit/${id}`)}
        />

        {filteredReports.length === 0 ? (
            <div style={{ opacity: 0.7, marginTop: '1rem' }}>
              {t('noReportsFound', 'No reports match your search')}
            </div>
        ) : null}
      </div>
  );
};

export default ReportDashboardPage;
/**
 * Dashboards Index Page
 * Lists active dashboards (by code) and links into /dashboards/:code.
 * Keeps the legacy auto view discoverable: if no dashboard with code
 * "etl-dashboard" exists, an "ETL Monitors (auto)" entry is appended.
 */

import React from 'react';
import { Button, DataTable, DataTableSkeleton, InlineNotification, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Tag, Tile } from '@carbon/react';
import { ArrowRight, Dashboard as DashboardIcon } from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/shared/header/header.component';
import { listDashboards } from '../../resources/dashboard/dashboard.api';
import type { DashboardDto } from '../../types/dashboard/dashboard.types';
import styles from './dashboards.scss';

const ETL_DASHBOARD_CODE = 'etl-dashboard';

const headers = [
  { key: 'name', header: 'Name' },
  { key: 'code', header: 'Code' },
  { key: 'dashboardType', header: 'Type' },
  { key: 'description', header: 'Description' },
  { key: 'open', header: '' },
];

export function DashboardsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = React.useState<DashboardDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const ac = new AbortController();
    let isMounted = true;

    setLoading(true);
    setError(null);

    listDashboards({ activeOnly: true, v: 'default' }, ac.signal)
      .then((data) => {
        if (isMounted) setRows((data ?? []).filter((d) => d.uuid));
      })
      .catch((e: any) => {
        if (isMounted && e?.name !== 'AbortError') setError(e?.message ?? 'Failed to load dashboards');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      ac.abort();
    };
  }, []);

  const hasEtlDashboard = rows.some((d) => d.code === ETL_DASHBOARD_CODE);

  const tableRows = rows.map((d) => ({
    id: d.uuid,
    name: d.name,
    code: d.code || '—',
    dashboardType: d.dashboardType || 'CUSTOM',
    description: d.description || '—',
  }));

  return (
    <Stack gap={5}>
      <Header
        title="Dashboards"
        subtitle="Configured dashboards composing ETL monitors, reports and other widgets."
      />

      <div style={{ padding: '0 1rem 1rem', display: 'grid', gap: '1rem' }}>
        {error && <InlineNotification lowContrast kind="error" title="Error" subtitle={error} />}

        {loading ? (
          <DataTableSkeleton rowCount={3} columnCount={5} showHeader={false} showToolbar={false} />
        ) : (
          <>
            {!hasEtlDashboard && (
              <Tile className={styles['dashboards-index__auto-tile']}>
                <div className={styles['dashboards-index__auto-main']}>
                  <DashboardIcon size={20} className={styles['dashboards-index__auto-icon']} />
                  <div>
                    <strong>ETL Monitors (auto)</strong>
                    <p className={styles['dashboards-index__auto-note']}>
                      All active ETL monitors, arranged automatically — no configuration yet.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  kind="ghost"
                  renderIcon={ArrowRight}
                  onClick={() => navigate('/etl-dashboard')}
                >
                  Open
                </Button>
              </Tile>
            )}

            {tableRows.length === 0 ? (
              !hasEtlDashboard && null
            ) : (
              <DataTable rows={tableRows} headers={headers}>
                {({ rows: dtRows, headers: dtHeaders, getHeaderProps, getRowProps }) => (
                  <TableContainer>
                    <Table useZebraStyles>
                      <TableHead>
                        <TableRow>
                          {dtHeaders.map((header) => (
                            <TableHeader key={header.key} {...getHeaderProps({ header })}>
                              {header.header}
                            </TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dtRows.map((row) => {
                          const original = rows.find((d) => d.uuid === row.id);
                          return (
                            <TableRow key={row.id} {...getRowProps({ row })}>
                              <TableCell>{row.cells[0].value}</TableCell>
                              <TableCell>{row.cells[1].value}</TableCell>
                              <TableCell>
                                <Tag size="sm" type="purple">
                                  {row.cells[2].value}
                                </Tag>
                              </TableCell>
                              <TableCell>{row.cells[3].value}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  kind="ghost"
                                  renderIcon={ArrowRight}
                                  iconDescription="Open dashboard"
                                  hasIconOnly
                                  onClick={() => original?.code && navigate(`/dashboards/${original.code}`)}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </DataTable>
            )}

            {!loading && rows.length === 0 && (
              <p className={styles['dashboards-index__empty-note']}>
                No dashboards configured yet. Create one under Admin → Dashboards.
              </p>
            )}
          </>
        )}
      </div>
    </Stack>
  );
}

export default DashboardsPage;

import React from 'react';
import {
  DataTable,
  DataTableHeader,
  DataTableRow,
  DataTableSkeleton,
  InlineNotification,
  Search,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import Header from '../shared/header/header.component';
import { listAgeCategoriesWithGroups } from '../../resources/agegroup/agegroups.api';

type AgeGroupRow = {
  id: string;
  categoryName: string;
  categoryCode: string;
  label: string;
  minAgeDays: number;
  maxAgeDays: number;
  sortOrder: number;
  active: boolean;
};

const headers: DataTableHeader[] = [
  { key: 'label', header: 'Label' },
  { key: 'category', header: 'Category' },
  { key: 'range', header: 'Range (days)' },
  { key: 'sortOrder', header: 'Sort Order' },
  { key: 'status', header: 'Status' },
];

const AgeGroupsPage: React.FC = () => {
  const [q, setQ] = React.useState('');
  const [rows, setRows] = React.useState<AgeGroupRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    listAgeCategoriesWithGroups(ac.signal)
      .then((categories) => {
        const flattened = categories.flatMap((category) =>
          (category.ageGroups ?? []).map((group) => ({
            id: `${category.uuid}-${group.id}`,
            categoryName: category.name,
            categoryCode: category.code,
            label: group.label,
            minAgeDays: group.minAgeDays,
            maxAgeDays: group.maxAgeDays,
            sortOrder: group.sortOrder,
            active: group.active,
          })),
        );
        setRows(flattened);
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to load age groups'))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const filtered = rows.filter((row) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return [row.label, row.categoryName, row.categoryCode].join(' ').toLowerCase().includes(needle);
  });

    const tableRows = filtered.map((row) => ({
    id: row.id,
    label: row.label,
    category: `${row.categoryName} (${row.categoryCode})`,
    range: `${row.minAgeDays} - ${row.maxAgeDays}`,
    sortOrder: String(row.sortOrder),
    status: row.active ? 'Active' : 'Inactive',
  }));

  return (
    <Stack gap={5}>
      <Header
        title="Age Groups"
        subtitle="Inspect age group ranges, ordering and category membership across the builder."
      />

      <div style={{ padding: '0 1rem 1rem', display: 'grid', gap: '1rem' }}>
        <Search
          size="lg"
          labelText="Search"
          placeholder="Search age groups…"
          value={q}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
        />

        {error ? <InlineNotification lowContrast kind="error" title="Error" subtitle={error} /> : null}

        {loading ? (
          <DataTableSkeleton rowCount={8} columnCount={5} showHeader={false} showToolbar={false} />
        ) : (
          <DataTable rows={tableRows} headers={headers}>
            {({ rows: dtRows, headers, getHeaderProps, getRowProps }) => (
              <TableContainer>
                <Table useZebraStyles>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHeader key={header.key} {...getHeaderProps({ header })}>
                          {header.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dtRows.map((dtRow) => {
                      const source = filtered.find((x) => x.id === dtRow.id);
                      return (
                        <TableRow key={dtRow.id} {...getRowProps({ row: dtRow })}>
                          <TableCell>{source?.label}</TableCell>
                          <TableCell>{source ? `${source.categoryName} (${source.categoryCode})` : '—'}</TableCell>
                          <TableCell>{source ? `${source.minAgeDays} - ${source.maxAgeDays}` : '—'}</TableCell>
                          <TableCell>{source?.sortOrder}</TableCell>
                          <TableCell>
                            <Tag type={source?.active ? 'green' : 'gray'}>{source?.active ? 'Active' : 'Inactive'}</Tag>
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
      </div>
    </Stack>
  );
};

export default AgeGroupsPage;

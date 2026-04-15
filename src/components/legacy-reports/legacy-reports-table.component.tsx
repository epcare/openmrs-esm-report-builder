import React from 'react';
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  Tag,
  OverflowMenu,
  OverflowMenuItem,
  Button,
} from '@carbon/react';
import { Upload, Document, Edit } from '@carbon/icons-react';

export type LegacyReportRow = {
  uuid: string;
  key: string;
  name: string;
  description?: string;
  status: string;
  datasetsCount?: number;
  parametersCount?: number;
};

type Props = {
  rows: LegacyReportRow[];
  onUpload?: () => void;
  onView?: (uuid: string) => void;
  onImport?: (uuid: string) => void;
  onDelete?: (uuid: string) => void;
};

function statusTag(status: string) {
  const s = (status ?? '').toLowerCase();
  if (s.includes('legacy')) return <Tag type="blue">Legacy</Tag>;
  if (s.includes('published')) return <Tag type="green">Published</Tag>;
  return <Tag type="gray">Draft</Tag>;
}

export default function LegacyReportsTable({ rows, onUpload, onView, onImport, onDelete }: Props) {
  const headers = [
    { key: 'key', header: 'Key' },
    { key: 'name', header: 'Name' },
    { key: 'description', header: 'Description' },
    { key: 'datasetsCount', header: 'Datasets' },
    { key: 'parametersCount', header: 'Parameters' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: '' },
  ];

  const tableRows = (rows ?? []).map((r) => ({
    id: r.uuid,
    key: r.key,
    name: r.name,
    description: r.description ?? '',
    datasetsCount: r.datasetsCount ?? 0,
    parametersCount: r.parametersCount ?? 0,
    status: r.status,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Legacy Reports</h3>
        <Button size="sm" kind="primary" renderIcon={Upload} onClick={onUpload}>
          Upload Legacy Report
        </Button>
      </div>

      <TableContainer title="" description="">
        <DataTable rows={tableRows} headers={headers} isSortable>
          {({ rows: dtRows, headers: dtHeaders, getHeaderProps, getRowProps }) => (
            <Table size="lg" useZebraStyles>
              <TableHead>
                <TableRow>
                  {dtHeaders.map((h) => (
                    <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                      {h.header}
                    </TableHeader>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {dtRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={dtHeaders.length} style={{ padding: '1rem', opacity: 0.75, textAlign: 'center' }}>
                      <div>
                        <Document size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                        <div>No legacy reports found.</div>
                        <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                          Upload a legacy report JSON file to get started.
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}

                {dtRows.map((row) => {
                  const key = String(row.cells.find((c) => c.info.header === 'key')?.value ?? '');
                  const name = String(row.cells.find((c) => c.info.header === 'name')?.value ?? '');
                  const description = String(row.cells.find((c) => c.info.header === 'description')?.value ?? '');
                  const datasetsCount = String(row.cells.find((c) => c.info.header === 'datasetsCount')?.value ?? '0');
                  const parametersCount = String(row.cells.find((c) => c.info.header === 'parametersCount')?.value ?? '0');
                  const status = String(row.cells.find((c) => c.info.header === 'status')?.value ?? '');

                  return (
                    <TableRow
                      key={row.id}
                      {...getRowProps({ row })}
                      onClick={() => onView?.(row.id)}
                      style={{ cursor: onView ? 'pointer' : 'default' }}
                    >
                      <TableCell>
                        <code style={{ fontSize: '0.9em', background: 'var(--cds-field-01)', padding: '2px 6px', borderRadius: '4px' }}>
                          {key || <span style={{ opacity: 0.7 }}>—</span>}
                        </code>
                      </TableCell>

                      <TableCell style={{ fontWeight: 600 }}>{name}</TableCell>

                      <TableCell style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {description || <span style={{ opacity: 0.7 }}>—</span>}
                      </TableCell>

                      <TableCell>{datasetsCount}</TableCell>

                      <TableCell>{parametersCount}</TableCell>

                      <TableCell>{statusTag(status)}</TableCell>

                      <TableCell onClick={(e) => e.stopPropagation()} style={{ width: 56 }}>
                        <OverflowMenu size="sm" flipped>
                          <OverflowMenuItem itemText="View Details" onClick={() => onView?.(row.id)} />
                          <OverflowMenuItem itemText="Import to Builder" onClick={() => onImport?.(row.id)} />
                          <OverflowMenuItem itemText="Delete" isDelete onClick={() => onDelete?.(row.id)} />
                        </OverflowMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </DataTable>
      </TableContainer>
    </div>
  );
}

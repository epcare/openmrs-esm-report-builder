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
} from '@carbon/react';

export type IndicatorRow = {
    id: string; // uuid
    code: string;
    name: string;

    kind: 'BASE' | 'COMPOSITE' | 'FINAL' | string;

    themeName?: string;
    themeColor?: string; // hex

    status: 'Draft' | 'Published' | 'Retired' | string;
};

type Props = {
    rows: IndicatorRow[];
    onOpen?: (id: string) => void;
    onEdit?: (id: string, kind: IndicatorRow['kind']) => void; // ✅ include kind
    onRun?: (id: string) => void;
    onDelete?: (id: string) => void;
};

function statusTag(status: string) {
    const s = (status ?? '').toLowerCase();
    if (s.includes('publish')) return <Tag type="green">Published</Tag>;
    if (s.includes('retire')) return <Tag type="red">Retired</Tag>;
    return <Tag type="gray">Draft</Tag>;
}

function kindTag(kind: string) {
    const k = (kind ?? '').toUpperCase();
    if (k === 'FINAL') return <Tag type="purple">FINAL</Tag>;
    if (k === 'COMPOSITE') return <Tag type="teal">COMPOSITE</Tag>;
    return <Tag type="blue">BASE</Tag>;
}

function themePill(themeName?: string, themeColor?: string) {
    if (!themeName) return <span style={{ opacity: 0.7 }}>—</span>;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span
          aria-hidden="true"
          style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: themeColor || 'var(--cds-icon-primary)',
              display: 'inline-block',
              border: '1px solid var(--cds-border-subtle)',
          }}
      />
            <span style={{ fontWeight: 500 }}>{themeName}</span>
        </div>
    );
}

export default function IndicatorsTable({ rows, onOpen, onEdit, onRun, onDelete }: Props) {
    const headers = [
        { key: 'code', header: 'Code' },
        { key: 'name', header: 'Name' },
        { key: 'kind', header: 'Kind' },
        { key: 'theme', header: 'Theme' },
        { key: 'status', header: 'Status' },
        { key: 'actions', header: '' },
    ];

    const tableRows = (rows ?? []).map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        kind: r.kind,
        theme: r.themeName ?? '',        // matches header key
        themeColor: r.themeColor ?? '',  // extra (not a column)
        status: r.status,
    }));

    return (
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
                                    <TableCell colSpan={dtHeaders.length} style={{ padding: '1rem', opacity: 0.75 }}>
                                        No indicators found.
                                    </TableCell>
                                </TableRow>
                            ) : null}

                            {dtRows.map((row) => {
                                const code = String(row.cells.find((c) => c.info.header === 'code')?.value ?? '');
                                const name = String(row.cells.find((c) => c.info.header === 'name')?.value ?? '');
                                const kind = String(row.cells.find((c) => c.info.header === 'kind')?.value ?? '');
                                const themeName = String(row.cells.find((c) => c.info.header === 'theme')?.value ?? '');
                                const status = String(row.cells.find((c) => c.info.header === 'status')?.value ?? '');

                                // themeColor is not a header cell; keep it on the row object
                                const themeColor = String((row as any).themeColor ?? '');

                                return (
                                    <TableRow
                                        key={row.id}
                                        {...getRowProps({ row })}
                                        onClick={() => onOpen?.(row.id)}
                                        style={{ cursor: onOpen ? 'pointer' : 'default' }}
                                    >
                                        <TableCell>{code || <span style={{ opacity: 0.7 }}>—</span>}</TableCell>

                                        {/* ✅ Theme color accent on the indicator itself */}
                                        <TableCell
                                            style={{
                                                fontWeight: 600,
                                                paddingLeft: '0.75rem',
                                                borderLeft: themeColor ? `6px solid ${themeColor}` : '6px solid transparent',
                                            }}
                                        >
                                            {name}
                                        </TableCell>

                                        <TableCell>{kindTag(kind)}</TableCell>

                                        <TableCell>{themePill(themeName, themeColor)}</TableCell>

                                        <TableCell>{statusTag(status)}</TableCell>

                                        <TableCell onClick={(e) => e.stopPropagation()} style={{ width: 56 }}>
                                            <OverflowMenu size="sm" flipped>
                                                <OverflowMenuItem itemText="Edit" onClick={() => onEdit?.(row.id, kind)} />
                                                <OverflowMenuItem itemText="Run" onClick={() => onRun?.(row.id)} />
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
    );
}
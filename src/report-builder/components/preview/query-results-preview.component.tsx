import React from 'react';
import {
    Button,
    InlineLoading,
    InlineNotification,
    DataTable,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableHeader,
    TableRow,
    CodeSnippet,
    Accordion,
    AccordionItem,
    Tag,
} from '@carbon/react';
import { Play } from '@carbon/icons-react';

import { previewSql, type SqlPreviewResponse } from '../../services/preview/sql-preview.api';

type Props = {
    title?: string;

    sql: string;
    params?: Record<string, any>;
    maxRows?: number;

    /**
     * If false, user cannot run preview (e.g. missing dates)
     */
    canRun?: boolean;

    /**
     * Auto-run when inputs change (default false)
     */
    autoRun?: boolean;
};

export default function QueryResultsPreview({
                                                title = 'Results preview',
                                                sql,
                                                params,
                                                maxRows = 200,
                                                canRun = true,
                                                autoRun = false,
                                            }: Props) {
    const [loading, setLoading] = React.useState(false);
    const [err, setErr] = React.useState<string | null>(null);
    const [data, setData] = React.useState<SqlPreviewResponse | null>(null);

    const run = React.useCallback(async () => {
        if (!canRun) return;
        if (!sql?.trim()) return;

        const ac = new AbortController();
        setLoading(true);
        setErr(null);

        try {
            const resp = await previewSql({ sql, params, maxRows }, ac.signal);
            setData(resp);
        } catch (e: any) {
            setErr(e?.message ?? 'Failed to preview query');
            setData(null);
        } finally {
            setLoading(false);
        }

        return () => ac.abort();
    }, [sql, params, maxRows, canRun]);

    // optional autorun
    React.useEffect(() => {
        if (!autoRun) return;
        if (!canRun) return;
        if (!sql?.trim()) return;
        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoRun, canRun, sql, JSON.stringify(params ?? {}), maxRows]);

    const columns = data?.columns ?? [];
    const rows = data?.rows ?? [];

    const headers = React.useMemo(() => columns.map((c) => ({ key: c, header: c })), [columns]);

    const tableRows = React.useMemo(() => {
        return rows.map((r, idx) => {
            const obj: any = { id: String(idx) };
            columns.forEach((c, i) => {
                obj[c] = r[i];
            });
            return obj;
        });
    }, [rows, columns]);

    const hasSql = Boolean(sql?.trim());
    const canClickRun = Boolean(canRun && hasSql && !loading);

    return (
        <div
            style={{
                display: 'grid',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: '0.5rem',
                background: 'var(--cds-layer, #ffffff)',
                border: '1px solid var(--cds-border-subtle, #e0e0e0)',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ display: 'grid', gap: '0.25rem' }}>
                    <div style={{ fontWeight: 600 }}>{title}</div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.75 }}>
                        {canRun ? 'Ready to preview results.' : 'Select required parameters to enable preview.'}
                    </div>
                </div>

                <Button kind="secondary" size="sm" renderIcon={Play} disabled={!canClickRun} onClick={() => run()}>
                    Run preview
                </Button>
            </div>

            {/* SQL (collapsible) */}
            <Accordion align="start">
                <AccordionItem title="SQL (click to expand)">
                    <CodeSnippet type="multi" wrapText>
                        {hasSql ? sql : '-- No SQL to preview yet'}
                    </CodeSnippet>
                </AccordionItem>
            </Accordion>

            {/* Status row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                    {loading ? <InlineLoading description="Running preview…" /> : null}
                    {!loading && err ? (
                        <InlineNotification kind="error" lowContrast title="Preview error" subtitle={err} />
                    ) : null}
                </div>

                {data && !loading && !err ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Tag type="cool-gray" size="sm">
                            Rows: {data.rowCount}
                        </Tag>
                        {data.truncated ? (
                            <Tag type="red" size="sm">
                                Truncated to {maxRows}
                            </Tag>
                        ) : (
                            <Tag type="green" size="sm">
                                Not truncated
                            </Tag>
                        )}
                    </div>
                ) : null}
            </div>

            {/* Results table */}
            {data && !loading && !err ? (
                <div
                    style={{
                        border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                        borderRadius: '0.25rem',
                        overflow: 'hidden',
                        background: 'var(--cds-layer, #ffffff)',
                    }}
                >
                    <div style={{ maxHeight: '320px', overflow: 'auto' }}>
                        <DataTable rows={tableRows} headers={headers} size="sm">
                            {({ rows, headers, getHeaderProps, getRowProps }) => (
                                <TableContainer>
                                    <Table size="sm" useZebraStyles>
                                        <TableHead>
                                            <TableRow>
                                                {headers.map((h) => (
                                                    <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                                                        {h.header}
                                                    </TableHeader>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rows.map((row) => (
                                                <TableRow key={row.id} {...getRowProps({ row })}>
                                                    {row.cells.map((cell) => (
                                                        <TableCell key={cell.id}>{String(cell.value ?? '')}</TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </DataTable>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
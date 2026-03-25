import React from 'react';
import {
  Modal,
  Stack,
  Button,
  InlineLoading,
  InlineNotification,
  TableContainer,
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
} from '@carbon/react';
import { Play } from '@carbon/icons-react';

import { previewSection } from '../../resources/report-section/section-preview.api';
import type { ReportSectionDto } from '../../resources/report-section/report-sections.api';

type Props = {
  open: boolean;
  onClose: () => void;
  section: ReportSectionDto | null;
};

type PreviewResult = {
  indicatorUuid: string;
  kind?: string;
  name?: string;
  code?: string;
  columns: string[];
  rows: any[][];
  rowCount: number;
  truncated: boolean;
  error?: string | null;
};

type SectionPreviewResponse = {
  sectionUuid: string;
  results: PreviewResult[];
};

function normalizeKey(s: string) {
  return String(s ?? '').trim().toLowerCase();
}

function decodeHtmlEntities(s: string) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function isMatrixCompatible(r: PreviewResult) {
  const cols = (r.columns ?? []).map(normalizeKey);
  return cols.includes('age_group') && cols.includes('gender') && cols.includes('value');
}

/**
 * Sort age groups by "start age" in DAYS, not by first number.
 * Handles labels like:
 * - 0-28d
 * - 29d-4yrs
 * - 5-9yrs
 * - 10-19yrs
 * - 20yrs+
 */
function startAgeInDays(label: string): number {
  const s = String(label ?? '').trim().toLowerCase();

  const startPart = s.split('-')[0].replace('+', '').trim();

  const m = startPart.match(/^(\d+)\s*(d|day|days|m|mo|mos|month|months|y|yr|yrs|year|years)?$/i);
  if (!m) {
    const n = startPart.match(/\d+/);
    return n ? Number(n[0]) * 365 : Number.POSITIVE_INFINITY;
  }

  const value = Number(m[1]);
  const unit = (m[2] ?? 'y').toLowerCase();

  if (unit === 'd' || unit === 'day' || unit === 'days') return value;
  if (unit === 'm' || unit === 'mo' || unit === 'mos' || unit === 'month' || unit === 'months') return value * 30;

  return value * 365;
}

function buildMatrix(results: PreviewResult[]) {
  const matrixResults = results.filter((r) => !r.error && isMatrixCompatible(r));

  const getIdx = (r: PreviewResult, key: string) => (r.columns ?? []).findIndex((c) => normalizeKey(c) === key);

  const ageSet = new Set<string>();
  const genderSet = new Set<string>();

  for (const r of matrixResults) {
    const ai = getIdx(r, 'age_group');
    const gi = getIdx(r, 'gender');
    if (ai < 0 || gi < 0) continue;

    for (const row of r.rows ?? []) {
      const ag = row?.[ai];
      const g = row?.[gi];
      if (ag != null) ageSet.add(String(ag));
      if (g != null) genderSet.add(String(g));
    }
  }

  const genders = Array.from(genderSet);
  genders.sort((a, b) => {
    const A = a.toUpperCase();
    const B = b.toUpperCase();
    const rank = (x: string) => (x === 'F' ? 0 : x === 'M' ? 1 : 2);
    const ra = rank(A);
    const rb = rank(B);
    if (ra !== rb) return ra - rb;
    return A.localeCompare(B);
  });

  const ageGroups = Array.from(ageSet);
  ageGroups.sort((a, b) => {
    const da = startAgeInDays(a);
    const db = startAgeInDays(b);
    if (da !== db) return da - db;
    return a.localeCompare(b);
  });

  const disaggCols: Array<{ key: string; header: string; age: string; gender: string }> = [];
  for (const ag of ageGroups) {
    for (const g of genders) {
      const key = `${ag}__${g}`;
      disaggCols.push({ key, header: `${ag} ${g}`, age: ag, gender: g });
    }
  }

  const rows = results.map((r, idx) => {
    const base: any = {
      id: r.indicatorUuid || String(idx),
      indicator: decodeHtmlEntities(r.name || r.code || r.indicatorUuid),
      kind: r.kind ?? '',
      error: r.error ?? '',
    };

    for (const c of disaggCols) base[c.key] = 0;

    if (!r.error && isMatrixCompatible(r)) {
      const ai = getIdx(r, 'age_group');
      const gi = getIdx(r, 'gender');
      const vi = getIdx(r, 'value');

      for (const row of r.rows ?? []) {
        const ag = String(row?.[ai] ?? '');
        const g = String(row?.[gi] ?? '');
        const v = row?.[vi];

        const key = `${ag}__${g}`;
        if (key in base) base[key] = v ?? 0;
      }
    }

    return base;
  });

  const headers = [
    { key: 'indicator', header: 'Indicator' },
    { key: 'kind', header: 'Type' },
    ...disaggCols.map((c) => ({ key: c.key, header: c.header })),
    { key: 'error', header: 'Error' },
  ];

  return { headers, rows, hasAnyDisagg: disaggCols.length > 0 };
}

function toGenericTableModel(columns: string[], rows: any[][]) {
  const headers = columns.map((c, i) => ({ key: `${i}`, header: c }));
  const tableRows = (rows ?? []).map((r, idx) => {
    const obj: any = { id: String(idx) };
    columns.forEach((_, i) => {
      obj[`${i}`] = r?.[i];
    });
    return obj;
  });
  return { headers, tableRows };
}

export default function ReportSectionPreviewModal({ open, onClose, section }: Props) {
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');
  const [indicatorUuid, setIndicatorUuid] = React.useState<string>('');
  const [maxRows, setMaxRows] = React.useState<number>(200);

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<SectionPreviewResponse | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setStartDate('');
    setEndDate('');
    setIndicatorUuid('');
    setMaxRows(200);
    setErr(null);
    setData(null);
    setLoading(false);
  }, [open]);

  const canRun = Boolean(section?.uuid) && Boolean(startDate) && Boolean(endDate) && !loading;

  const run = async () => {
    if (!section?.uuid) return;

    if (!startDate || !endDate) {
      setErr('Start date and End date are required.');
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setErr(null);
    setData(null);

    try {
      const resp = await previewSection(
        {
          sectionUuid: section.uuid,
          indicatorUuid: indicatorUuid.trim() || undefined,
          startDate,
          endDate,
          maxRows,
          params: {},
        },
        ac.signal,
      );

      setData(resp);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to preview section');
    } finally {
      setLoading(false);
    }
  };

  const results: PreviewResult[] = data?.results ?? [];
  const matrix = buildMatrix(results);

  const nonMatrix = results.filter((r) => r.error || !isMatrixCompatible(r));

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading={section ? `Preview Section: ${section.name}` : 'Preview Section'}
      primaryButtonText="Close"
      secondaryButtonText="Cancel"
      onRequestSubmit={onClose}
      size="lg"
    >
      <Stack gap={5}>
        {!section ? (
          <InlineNotification kind="warning" lowContrast title="No section" subtitle="Select a section first." />
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <TextInput
            id="section-preview-startdate"
            labelText="Start date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate((e.target as HTMLInputElement).value)}
            disabled={!section}
          />
          <TextInput
            id="section-preview-enddate"
            labelText="End date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate((e.target as HTMLInputElement).value)}
            disabled={!section}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'end' }}>
          <TextInput
            id="section-preview-maxrows"
            labelText="Max rows"
            value={String(maxRows)}
            onChange={(e) => {
              const v = Number((e.target as HTMLInputElement).value);
              setMaxRows(Number.isFinite(v) && v > 0 ? v : 200);
            }}
            disabled={!section}
          />

          <Button kind="primary" renderIcon={Play} disabled={!canRun} onClick={run}>
            Preview Section
          </Button>
        </div>

        {loading ? <InlineLoading description="Running section preview…" /> : null}
        {err ? <InlineNotification kind="error" lowContrast title="Preview" subtitle={err} /> : null}

        {data ? (
          matrix.hasAnyDisagg ? (
            <TableContainer
              title="Section preview matrix"
              description="Indicators are rows; disaggregations are columns. Missing values show as 0."
            >
              <DataTable rows={matrix.rows} headers={matrix.headers} size="md" useZebraStyles>
                {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
                  <Table {...getTableProps()}>
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
                            <TableCell key={cell.id}>{cell.value as any}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </DataTable>
            </TableContainer>
          ) : (
            <InlineNotification
              kind="info"
              lowContrast
              title="No disaggregated results"
              subtitle="No indicator returned (age_group, gender, value) rows for this preview."
            />
          )
        ) : null}

        {data && nonMatrix.length ? (
          <Stack gap={4}>
            <div style={{ fontWeight: 600, marginTop: '0.5rem' }}>Other results</div>

            {nonMatrix.map((r, idx) => {
              if (r.error) {
                return (
                  <InlineNotification
                    key={`${r.indicatorUuid}-${idx}`}
                    kind="error"
                    lowContrast
                    title={`Indicator error: ${decodeHtmlEntities(r.name || r.code || r.indicatorUuid)}`}
                    subtitle={r.error}
                  />
                );
              }

              const { headers, tableRows } = toGenericTableModel(r.columns ?? [], r.rows ?? []);
              return (
                <TableContainer
                  key={`${r.indicatorUuid}-${idx}`}
                  title={decodeHtmlEntities(r.name || r.code || r.indicatorUuid)}
                  description={`Returned columns: ${(r.columns ?? []).join(', ')}`}
                >
                  <DataTable rows={tableRows} headers={headers} size="md" useZebraStyles>
                    {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
                      <Table {...getTableProps()}>
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
                                <TableCell key={cell.id}>{cell.value as any}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </DataTable>
                </TableContainer>
              );
            })}
          </Stack>
        ) : null}
      </Stack>
    </Modal>
  );
}
import React from 'react';
import {
  Button,
  Checkbox,
  DataTable,
  DataTableHeader,
  DataTableSkeleton,
  InlineNotification,
  Modal,
  Search,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextArea,
  TextInput,
} from '@carbon/react';
import { Add, Edit, TrashCan } from '@carbon/icons-react';
import Header from '../shared/header/header.component';
import {
  createReportLibrary,
  deleteReportLibrary,
  listReportLibraries,
  ReportLibraryDto,
  SaveReportLibraryPayload,
  updateReportLibrary,
} from '../../resources/report-library/report-library.api';
import {
  listReportCategories,
  ReportCategoryDto,
} from '../../resources/report-category/report-category.api';

type FormState = {
  name: string;
  description: string;
  code: string;
  sourceType: 'LEGACY' | 'BUILDER';
  reportType: 'AGGREGATE' | 'LINE_LIST';
  reportDefinitionUuid: string;
  reportBuilderReportUuid: string;
  category: string;
  migrated: boolean;
  metaJson: string;
};

type SourceFilter = '' | 'LEGACY' | 'BUILDER';
type TypeFilter = '' | 'AGGREGATE' | 'LINE_LIST';
type StatusFilter = '' | 'ACTIVE' | 'RETIRED';
type MigrationFilter = '' | 'MIGRATED' | 'PENDING';

const headers: DataTableHeader[] = [
  { key: 'name', header: 'Name' },
  { key: 'sourceType', header: 'Source' },
  { key: 'reportType', header: 'Type' },
  { key: 'category', header: 'Category' },
  { key: 'migration', header: 'Migration' },
  { key: 'status', header: 'Status' },
  { key: 'actions', header: 'Actions' },
];

const emptyForm: FormState = {
  name: '',
  description: '',
  code: '',
  sourceType: 'LEGACY',
  reportType: 'AGGREGATE',
  reportDefinitionUuid: '',
  reportBuilderReportUuid: '',
  category: '',
  migrated: false,
  metaJson: '{}',
};

function categoryUuidOf(value: ReportLibraryDto['category']): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.uuid ?? '';
}

function categoryDisplayOf(value: ReportLibraryDto['category']): string {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  return value.name ?? value.uuid ?? '—';
}

export default function ReportLibraryPage() {
  const [q, setQ] = React.useState('');
  const [rows, setRows] = React.useState<ReportLibraryDto[]>([]);
  const [categories, setCategories] = React.useState<ReportCategoryDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<'create' | 'edit'>('create');
  const [editing, setEditing] = React.useState<ReportLibraryDto | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);

  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>('');
  const [reportTypeFilter, setReportTypeFilter] = React.useState<TypeFilter>('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('');
  const [migrationFilter, setMigrationFilter] = React.useState<MigrationFilter>('');

  const load = React.useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    return Promise.all([listReportLibraries(undefined, signal), listReportCategories(undefined, signal)])
        .then(([library, cats]) => {
          setRows(library);
          setCategories(cats.filter((c) => !c.retired));
        })
        .catch((e: any) => setError(e?.message ?? 'Failed to load report library'))
        .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const openCreate = () => {
    setMode('create');
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row: ReportLibraryDto) => {
    setMode('edit');
    setEditing(row);
    setForm({
      name: row.name ?? '',
      description: row.description ?? '',
      code: row.code ?? '',
      sourceType: row.sourceType ?? 'LEGACY',
      reportType: row.reportType ?? 'AGGREGATE',
      reportDefinitionUuid: row.reportDefinitionUuid ?? '',
      reportBuilderReportUuid: row.reportBuilderReportUuid ?? '',
      category: categoryUuidOf(row.category),
      migrated: Boolean(row.migrated),
      metaJson: row.metaJson?.trim() || '{}',
    });
    setOpen(true);
  };

  const onSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload: SaveReportLibraryPayload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        code: form.code.trim() || undefined,
        sourceType: form.sourceType,
        reportType: form.reportType,
        reportDefinitionUuid: form.reportDefinitionUuid.trim() || undefined,
        reportBuilderReportUuid: form.reportBuilderReportUuid.trim() || undefined,
        category: form.category || undefined,
        migrated: form.migrated,
        metaJson: form.metaJson.trim() || undefined,
      };

      if (mode === 'create') {
        await createReportLibrary(payload);
      } else if (editing?.uuid) {
        await updateReportLibrary(editing.uuid, payload);
      }

      setOpen(false);
      const ac = new AbortController();
      await load(ac.signal);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save report library entry');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row: ReportLibraryDto) => {
    if (!row?.uuid) return;
    if (!window.confirm(`Retire report library entry "${row.name}"?`)) return;
    try {
      await deleteReportLibrary(row.uuid);
      const ac = new AbortController();
      await load(ac.signal);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to retire report library entry');
    }
  };

  const filteredRows = React.useMemo(() => {
    const search = q.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
          !search ||
          row.name?.toLowerCase().includes(search) ||
          row.description?.toLowerCase().includes(search) ||
          row.code?.toLowerCase().includes(search) ||
          categoryDisplayOf(row.category).toLowerCase().includes(search);

      const matchesSource = !sourceFilter || row.sourceType === sourceFilter;
      const matchesType = !reportTypeFilter || row.reportType === reportTypeFilter;
      const matchesCategory = !categoryFilter || categoryUuidOf(row.category) === categoryFilter;
      const matchesStatus =
          !statusFilter ||
          (statusFilter === 'ACTIVE' && !row.retired) ||
          (statusFilter === 'RETIRED' && !!row.retired);

      const matchesMigration =
          !migrationFilter ||
          (migrationFilter === 'MIGRATED' && !!row.migrated) ||
          (migrationFilter === 'PENDING' && !row.migrated);

      return (
          matchesSearch &&
          matchesSource &&
          matchesType &&
          matchesCategory &&
          matchesStatus &&
          matchesMigration
      );
    });
  }, [rows, q, sourceFilter, reportTypeFilter, categoryFilter, statusFilter, migrationFilter]);

  const tableRows = filteredRows.map((row) => ({
    id: row.uuid,
    name: row.name,
    sourceType: row.sourceType ?? 'LEGACY',
    reportType: row.reportType ?? 'AGGREGATE',
    category: categoryDisplayOf(row.category),
    migration: row.migrated ? 'Migrated' : 'Pending',
    status: row.retired ? 'Retired' : 'Active',
    actions: '',
  }));

  const clearFilters = () => {
    setQ('');
    setSourceFilter('');
    setReportTypeFilter('');
    setCategoryFilter('');
    setStatusFilter('');
    setMigrationFilter('');
  };

  return (
      <Stack gap={5}>
        <Header
            title="Report Library"
            subtitle="Catalog legacy and completed reports before and during migration into the report builder."
        />

        <div style={{ display: 'grid', gap: '1rem' }}>
          <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(18rem, 2fr) repeat(5, minmax(10rem, 1fr)) auto auto',
                gap: '1rem',
                alignItems: 'end',
              }}
          >
            <Search
                size="lg"
                labelText="Search"
                placeholder="Search report library…"
                value={q}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
            />

            <Select
                id="filter-source"
                labelText="Source"
                value={sourceFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setSourceFilter(e.target.value as SourceFilter)
                }
            >
              <SelectItem value="" text="All sources" />
              <SelectItem value="LEGACY" text="LEGACY" />
              <SelectItem value="BUILDER" text="BUILDER" />
            </Select>

            <Select
                id="filter-type"
                labelText="Type"
                value={reportTypeFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setReportTypeFilter(e.target.value as TypeFilter)
                }
            >
              <SelectItem value="" text="All types" />
              <SelectItem value="AGGREGATE" text="AGGREGATE" />
              <SelectItem value="LINE_LIST" text="LINE_LIST" />
            </Select>

            <Select
                id="filter-category"
                labelText="Category"
                value={categoryFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryFilter(e.target.value)}
            >
              <SelectItem value="" text="All categories" />
              {categories.map((cat) => (
                  <SelectItem key={cat.uuid} value={cat.uuid} text={cat.name} />
              ))}
            </Select>

            <Select
                id="filter-status"
                labelText="Status"
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setStatusFilter(e.target.value as StatusFilter)
                }
            >
              <SelectItem value="" text="All statuses" />
              <SelectItem value="ACTIVE" text="Active" />
              <SelectItem value="RETIRED" text="Retired" />
            </Select>

            <Select
                id="filter-migration"
                labelText="Migration"
                value={migrationFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setMigrationFilter(e.target.value as MigrationFilter)
                }
            >
              <SelectItem value="" text="All" />
              <SelectItem value="MIGRATED" text="Migrated" />
              <SelectItem value="PENDING" text="Pending" />
            </Select>

            <Button kind="tertiary" size="md" onClick={clearFilters}>
              Clear
            </Button>

            <Button size="md" renderIcon={Add} onClick={openCreate}>
              New Library Entry
            </Button>
          </div>

          {error ? <InlineNotification lowContrast kind="error" title="Error" subtitle={error} /> : null}

          {loading ? (
              <DataTableSkeleton rowCount={6} columnCount={7} showHeader={false} showToolbar={false} />
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
                            const source = filteredRows.find((x) => x.uuid === dtRow.id);
                            return (
                                <TableRow key={dtRow.id} {...getRowProps({ row: dtRow })}>
                                  <TableCell>{source?.name}</TableCell>
                                  <TableCell>
                                    <Tag type={source?.sourceType === 'BUILDER' ? 'blue' : 'purple'}>
                                      {source?.sourceType ?? 'LEGACY'}
                                    </Tag>
                                  </TableCell>
                                  <TableCell>
                                    <Tag type={source?.reportType === 'LINE_LIST' ? 'teal' : 'cyan'}>
                                      {source?.reportType ?? 'AGGREGATE'}
                                    </Tag>
                                  </TableCell>
                                  <TableCell>{categoryDisplayOf(source?.category)}</TableCell>
                                  <TableCell>
                                    <Tag type={source?.migrated ? 'green' : 'warm-gray'}>
                                      {source?.migrated ? 'Migrated' : 'Pending'}
                                    </Tag>
                                  </TableCell>
                                  <TableCell>
                                    <Tag type={source?.retired ? 'gray' : 'green'}>
                                      {source?.retired ? 'Retired' : 'Active'}
                                    </Tag>
                                  </TableCell>
                                  <TableCell>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      <Button
                                          kind="ghost"
                                          size="sm"
                                          renderIcon={Edit}
                                          onClick={() => source && openEdit(source)}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                          kind="ghost"
                                          size="sm"
                                          renderIcon={TrashCan}
                                          onClick={() => source && onDelete(source)}
                                      >
                                        Retire
                                      </Button>
                                    </div>
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

        <Modal
            open={open}
            modalHeading={mode === 'create' ? 'New Report Library Entry' : 'Edit Report Library Entry'}
            primaryButtonText={saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
            secondaryButtonText="Cancel"
            primaryButtonDisabled={saving || !form.name.trim()}
            onRequestSubmit={onSave}
            onRequestClose={() => !saving && setOpen(false)}
        >
          <Stack gap={5}>
            <TextInput
                id="rl-name"
                labelText="Name"
                value={form.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                }
            />
            <TextInput
                id="rl-code"
                labelText="Code"
                value={form.code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((p) => ({ ...p, code: e.target.value }))
                }
            />
            <TextArea
                id="rl-description"
                labelText="Description"
                value={form.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                }
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Select
                  id="rl-sourceType"
                  labelText="Source Type"
                  value={form.sourceType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setForm((p) => ({ ...p, sourceType: e.target.value as FormState['sourceType'] }))
                  }
              >
                <SelectItem value="LEGACY" text="LEGACY" />
                <SelectItem value="BUILDER" text="BUILDER" />
              </Select>

              <Select
                  id="rl-reportType"
                  labelText="Report Type"
                  value={form.reportType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setForm((p) => ({ ...p, reportType: e.target.value as FormState['reportType'] }))
                  }
              >
                <SelectItem value="AGGREGATE" text="AGGREGATE" />
                <SelectItem value="LINE_LIST" text="LINE_LIST" />
              </Select>
            </div>

            <Select
                id="rl-category"
                labelText="Category"
                value={form.category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setForm((p) => ({ ...p, category: e.target.value }))
                }
            >
              <SelectItem value="" text="None" />
              {categories.map((cat) => (
                  <SelectItem key={cat.uuid} value={cat.uuid} text={cat.name} />
              ))}
            </Select>

            <TextInput
                id="rl-rd"
                labelText="Legacy Report Definition UUID"
                value={form.reportDefinitionUuid}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((p) => ({ ...p, reportDefinitionUuid: e.target.value }))
                }
            />
            <TextInput
                id="rl-rbr"
                labelText="Builder Report UUID"
                value={form.reportBuilderReportUuid}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((p) => ({ ...p, reportBuilderReportUuid: e.target.value }))
                }
            />

            <Checkbox
                id="rl-migrated"
                labelText="Migrated"
                checked={form.migrated}
                onChange={(_, { checked }) => setForm((p) => ({ ...p, migrated: Boolean(checked) }))}
            />

            <TextArea
                id="rl-meta"
                labelText="Meta JSON"
                value={form.metaJson}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setForm((p) => ({ ...p, metaJson: e.target.value }))
                }
                rows={6}
            />
          </Stack>
        </Modal>
      </Stack>
  );
}
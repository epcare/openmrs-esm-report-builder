import React from 'react';
import {
  Button,
  DataTable,
  DataTableHeader,
  DataTableRow,
  DataTableSkeleton,
  Modal,
  Search,
  Stack,
  TextArea,
  TextInput,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  InlineNotification,
} from '@carbon/react';
import { Add, Edit, TrashCan } from '@carbon/icons-react';
import Header from '../shared/header/header.component';
import {
  createReportCategory,
  deleteReportCategory,
  listReportCategories,
  ReportCategoryDto,
  updateReportCategory,
} from '../../resources/report-category/report-category.api';

type FormState = {
  name: string;
  description: string;
};

const headers: DataTableHeader[] = [
  { key: 'name', header: 'Name' },
  { key: 'description', header: 'Description' },
  { key: 'status', header: 'Status' },
  { key: 'actions', header: 'Actions' },
];

const emptyForm: FormState = { name: '', description: '' };

const ReportCategoriesPage: React.FC = () => {
  const [q, setQ] = React.useState('');
  const [rows, setRows] = React.useState<ReportCategoryDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<'create' | 'edit'>('create');
  const [editing, setEditing] = React.useState<ReportCategoryDto | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listReportCategories(q, signal);
      setRows(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load report categories');
    } finally {
      setLoading(false);
    }
  }, [q]);

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

  const openEdit = (row: ReportCategoryDto) => {
    setMode('edit');
    setEditing(row);
    setForm({
      name: row.name ?? '',
      description: row.description ?? '',
    });
    setOpen(true);
  };

  const onSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      };
      if (mode === 'create') {
        await createReportCategory(payload);
      } else if (editing?.uuid) {
        await updateReportCategory(editing.uuid, payload);
      }
      setOpen(false);
      const ac = new AbortController();
      await load(ac.signal);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save report category');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row: ReportCategoryDto) => {
    if (!row?.uuid) return;
    const yes = window.confirm(`Retire report category \"${row.name}\"?`);
    if (!yes) return;
    try {
      await deleteReportCategory(row.uuid);
      const ac = new AbortController();
      await load(ac.signal);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to retire report category');
    }
  };

  const tableRows = rows.map((row) => ({
    id: row.uuid,
    name: row.name,
    description: row.description || '—',
    status: row.retired ? 'Retired' : 'Active',
    actions: '',
  }));

  return (
    <Stack gap={5}>
      <Header
        title="Report Categories"
        subtitle="Manage shared categories used to classify reports across the builder."
        actions={
          <Button size="sm" renderIcon={Add} onClick={openCreate}>
            New Category
          </Button>
        }
      />

      <div style={{ padding: '0 1rem 1rem', display: 'grid', gap: '1rem' }}>
        <Search
          size="lg"
          labelText="Search"
          placeholder="Search report categories…"
          value={q}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
        />

        {error ? (
          <InlineNotification lowContrast kind="error" title="Error" subtitle={error} />
        ) : null}

        {loading ? (
          <DataTableSkeleton rowCount={5} columnCount={4} showHeader={false} showToolbar={false} />
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
                      const source = rows.find((x) => x.uuid === dtRow.id);
                      return (
                        <TableRow key={dtRow.id} {...getRowProps({ row: dtRow })}>
                          <TableCell>{source?.name}</TableCell>
                          <TableCell>{source?.description || '—'}</TableCell>
                          <TableCell>
                            <Tag type={source?.retired ? 'gray' : 'green'}>{source?.retired ? 'Retired' : 'Active'}</Tag>
                          </TableCell>
                          <TableCell>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <Button
                                kind="ghost"
                                size="sm"
                                renderIcon={Edit}
                                iconDescription="Edit"
                                onClick={() => source && openEdit(source)}
                              >
                                Edit
                              </Button>
                              <Button
                                kind="ghost"
                                size="sm"
                                renderIcon={TrashCan}
                                iconDescription="Retire"
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
        modalHeading={mode === 'create' ? 'Create Report Category' : 'Edit Report Category'}
        primaryButtonText={saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
        secondaryButtonText="Cancel"
        onRequestClose={() => !saving && setOpen(false)}
        onRequestSubmit={onSave}
        primaryButtonDisabled={saving || !form.name.trim()}
      >
        <Stack gap={5}>
          <TextInput
            id="report-category-name"
            labelText="Name"
            value={form.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          <TextArea
            id="report-category-description"
            labelText="Description"
            rows={4}
            value={form.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
          />
        </Stack>
      </Modal>
    </Stack>
  );
};

export default ReportCategoriesPage;

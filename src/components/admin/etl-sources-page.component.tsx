import React from 'react';
import {
  Button,
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
  Toggle,
} from '@carbon/react';
import { Add, Edit, TrashCan } from '@carbon/icons-react';
import Header from '../shared/header/header.component';
import {
  createETLSource,
  deleteETLSource,
  ETLSourceDto,
  listETLSources,
  SaveETLSourcePayload,
  updateETLSource,
} from '../../resources/etl-source/etl-source.api';

type FormState = {
  name: string;
  code: string;
  description: string;
  tablePatterns: string;
  schemaName: string;
  sourceType: string;
  active: boolean;
};

const headers: DataTableHeader[] = [
  { key: 'name', header: 'Name' },
  { key: 'code', header: 'Code' },
  { key: 'schemaName', header: 'Schema' },
  { key: 'sourceType', header: 'Source Type' },
  { key: 'status', header: 'Status' },
  { key: 'actions', header: 'Actions' },
];

const emptyForm: FormState = {
  name: '',
  code: '',
  description: '',
  tablePatterns: '',
  schemaName: '',
  sourceType: '',
  active: true,
};

export default function ETLSourcesPage() {
  const [q, setQ] = React.useState('');
  const [rows, setRows] = React.useState<ETLSourceDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<'create' | 'edit'>('create');
  const [editing, setEditing] = React.useState<ETLSourceDto | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listETLSources(q, signal);
      setRows(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load ETL sources');
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

  const openEdit = (row: ETLSourceDto) => {
    setMode('edit');
    setEditing(row);
    setForm({
      name: row.name ?? '',
      code: row.code ?? '',
      description: row.description ?? '',
      tablePatterns: row.tablePatterns ?? '',
      schemaName: row.schemaName ?? '',
      sourceType: row.sourceType ?? '',
      active: row.active ?? true,
    });
    setOpen(true);
  };

  const onSave = async () => {
    if (!form.name.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const payload: SaveETLSourcePayload = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
        tablePatterns: form.tablePatterns.trim() || undefined,
        schemaName: form.schemaName.trim() || undefined,
        sourceType: form.sourceType.trim() || undefined,
        active: form.active,
      };

      if (mode === 'create') {
        await createETLSource(payload);
      } else if (editing?.uuid) {
        await updateETLSource(editing.uuid, payload);
      }

      setOpen(false);
      const ac = new AbortController();
      await load(ac.signal);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save ETL source');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row: ETLSourceDto) => {
    if (!row?.uuid) return;
    const yes = window.confirm(`Retire ETL source "${row.name}"?`);
    if (!yes) return;

    try {
      await deleteETLSource(row.uuid);
      const ac = new AbortController();
      await load(ac.signal);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to retire ETL source');
    }
  };

  const tableRows = rows.map((row) => ({
    id: row.uuid,
    name: row.name,
    code: row.code || '—',
    schemaName: row.schemaName || '—',
    sourceType: row.sourceType || '—',
    status: row.active === false || row.voided ? 'Inactive' : 'Active',
    actions: '',
  }));

  return (
    <Stack gap={5}>
      <Header
        title="ETL Sources"
        subtitle="Manage ETL source definitions used by the report builder."
        actions={
          <Button data-testid="etl-source-new" size="sm" renderIcon={Add} onClick={openCreate}>
            New ETL Source
          </Button>
        }
      />

      <div style={{ padding: '0 1rem 1rem', display: 'grid', gap: '1rem' }}>
        <Search
          data-testid="etl-source-search"
          size="lg"
          labelText="Search"
          placeholder="Search ETL sources…"
          value={q}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
        />

        {error ? <InlineNotification lowContrast kind="error" title="Error" subtitle={error} /> : null}

        {loading ? (
          <DataTableSkeleton rowCount={5} columnCount={6} showHeader={false} showToolbar={false} />
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
                    {dtRows.map((row) => {
                      const original = rows.find((r) => r.uuid === row.id);
                      return (
                        <TableRow key={row.id} {...getRowProps({ row })}>
                          <TableCell>{row.cells[0].value}</TableCell>
                          <TableCell>{row.cells[1].value}</TableCell>
                          <TableCell>{row.cells[2].value}</TableCell>
                          <TableCell>{row.cells[3].value}</TableCell>
                          <TableCell>
                            {(original?.active === false || original?.voided) ? (
                              <Tag type="gray">Inactive</Tag>
                            ) : (
                              <Tag type="green">Active</Tag>
                            )}
                          </TableCell>
                          <TableCell>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <Button
                                kind="ghost"
                                size="sm"
                                renderIcon={Edit}
                                iconDescription="Edit"
                                hasIconOnly
                                onClick={() => original && openEdit(original)}
                              />
                              <Button
                                kind="ghost"
                                size="sm"
                                renderIcon={TrashCan}
                                iconDescription="Retire"
                                hasIconOnly
                                onClick={() => original && onDelete(original)}
                              />
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
        modalHeading={mode === 'create' ? 'New ETL Source' : 'Edit ETL Source'}
        data-testid="etl-source-modal"
        primaryButtonText={saving ? 'Saving…' : 'Save'}
        secondaryButtonText="Cancel"
        onRequestClose={() => !saving && setOpen(false)}
        onRequestSubmit={onSave}
        primaryButtonDisabled={saving || !form.name.trim()}
      >
        <Stack gap={5}>
          <TextInput
            id="etl-source-name"
            data-testid="etl-source-name"
            labelText="Name"
            value={form.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />

          <TextInput
            id="etl-source-code"
            data-testid="etl-source-code"
            labelText="Code"
            value={form.code}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((prev) => ({ ...prev, code: e.target.value }))
            }
          />

          <TextInput
            id="etl-source-schema"
            data-testid="etl-source-schema"
            labelText="Schema Name"
            value={form.schemaName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((prev) => ({ ...prev, schemaName: e.target.value }))
            }
          />

          <TextInput
            id="etl-source-type"
            data-testid="etl-source-type"
            labelText="Source Type"
            value={form.sourceType}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((prev) => ({ ...prev, sourceType: e.target.value }))
            }
          />

          <TextArea
            id="etl-source-description"
            data-testid="etl-source-description"
            labelText="Description"
            rows={3}
            value={form.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
          />

          <TextArea
            id="etl-source-table-patterns"
            data-testid="etl-source-table-patterns"
            labelText="Table Patterns"
            helperText="Store table matching patterns as text."
            rows={4}
            value={form.tablePatterns}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setForm((prev) => ({ ...prev, tablePatterns: e.target.value }))
            }
          />

          <Toggle
            id="etl-source-active"
            labelText="Active"
            toggled={form.active}
            onToggle={(checked: boolean) => setForm((prev) => ({ ...prev, active: checked }))}
          />
        </Stack>
      </Modal>
    </Stack>
  );
}
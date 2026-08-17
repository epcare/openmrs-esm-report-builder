import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Button,
    DataTable,
    DataTableHeader,
    DataTableSkeleton,
    InlineNotification,
    Modal,
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
    TextInput,
    TextArea,
    Toggle,
    Select,
    SelectItem,
    NumberInput,
} from '@carbon/react';
import { Add, Edit, TrashCan } from '@carbon/icons-react';
import Header from '../shared/header/header.component';
import {
    createETLMonitor,
    deleteETLMonitor,
    listETLMonitors,
    updateETLMonitor,
} from '../../resources/etl-monitor/etl-monitor.api';
import type { ETLMonitorDto, SaveETLMonitorPayload, MonitorType, AuthType } from '../../types/etl-monitor/etl-monitor.types';
import { EtlMonitorBuilderModalWrapper } from './builder';

type FormState = {
    name: string;
    code: string;
    description: string;
    monitorType: MonitorType;
    category: string;
    refreshInterval: number;
    timeout: number;
    active: boolean;
    // API Endpoint Configuration
    apiUrl: string;
    apiMethod: 'GET' | 'POST';
    authType: AuthType;
    authUsername: string;
    authPassword: string;
    authHeaderName: string;
    authApiKey: string;
    authToken: string;
    // Display Configuration (simplified for initial UI)
    displayColumnsJson: string;
};

const headers: DataTableHeader[] = [
    { key: 'name', header: 'Name' },
    { key: 'code', header: 'Code' },
    { key: 'monitorType', header: 'Type' },
    { key: 'category', header: 'Category' },
    { key: 'refreshInterval', header: 'Refresh' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: 'Actions' },
];

const emptyForm: FormState = {
    name: '',
    code: '',
    description: '',
    monitorType: 'STATUS_CARD',
    category: '',
    refreshInterval: 30,
    timeout: 10,
    active: true,
    apiUrl: '',
    apiMethod: 'GET',
    authType: 'NONE',
    authUsername: '',
    authPassword: '',
    authHeaderName: '',
    authApiKey: '',
    authToken: '',
    displayColumnsJson: '',
};

const monitorTypeOptions: { value: MonitorType; label: string }[] = [
    { value: 'STATUS_CARD', label: 'Status Card' },
    { value: 'PROGRESS_BAR', label: 'Progress Bar' },
    { value: 'DATA_TABLE', label: 'Data Table' },
    { value: 'TIME_SERIES', label: 'Time Series' },
    { value: 'ERROR_LOG', label: 'Error Log' },
    { value: 'METRICS_GRID', label: 'Metrics Grid' },
];

const authTypeOptions: { value: AuthType; label: string }[] = [
    { value: 'NONE', label: 'None' },
    { value: 'BASIC', label: 'Basic Auth' },
    { value: 'API_KEY', label: 'API Key' },
    { value: 'BEARER_TOKEN', label: 'Bearer Token' },
    { value: 'OPENMRS', label: 'OpenMRS Session' },
];

export default function ETLMonitorsPage() {
    const navigate = useNavigate();
    const [q, setQ] = React.useState('');
    const [rows, setRows] = React.useState<ETLMonitorDto[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [open, setOpen] = React.useState(false);
    const [mode, setMode] = React.useState<'create' | 'edit'>('create');
    const [editing, setEditing] = React.useState<ETLMonitorDto | null>(null);
    const [form, setForm] = React.useState<FormState>(emptyForm);
    const [saving, setSaving] = React.useState(false);

    // Builder modal state (kept for legacy advanced modal)
    const [builderOpen, setBuilderOpen] = React.useState(false);

    const load = React.useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);
        try {
            const data = await listETLMonitors(q, signal);
            setRows(data);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load ETL monitors');
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

    const openEditWithBuilder = (row: ETLMonitorDto) => {
        navigate(`/admin/etl-monitors/builder?mode=edit&monitor=${row.uuid}`);
    };

    const buildConfigJson = (): string => {
        const config: {
            apiEndpoint: {
                url: string;
                method: 'GET' | 'POST';
                authType: AuthType;
                authConfig?: {
                    username?: string;
                    password?: string;
                    headerName?: string;
                    apiKey?: string;
                    token?: string;
                    useSession?: string;
                };
            };
        } = {
            apiEndpoint: {
                url: form.apiUrl,
                method: form.apiMethod,
                authType: form.authType,
            }
        };

        // Add auth config based on auth type
        if (form.authType === 'BASIC') {
            config.apiEndpoint.authConfig = {
                username: form.authUsername,
                password: form.authPassword,
            };
        } else if (form.authType === 'API_KEY') {
            config.apiEndpoint.authConfig = {
                headerName: form.authHeaderName,
                apiKey: form.authApiKey,
            };
        } else if (form.authType === 'BEARER_TOKEN') {
            config.apiEndpoint.authConfig = {
                token: form.authToken,
            };
        } else if (form.authType === 'OPENMRS') {
            config.apiEndpoint.authConfig = {
                useSession: 'true',
            };
        }

        return JSON.stringify(config, null, 2);
    };

    const onSave = async () => {
        if (!form.name.trim() || !form.apiUrl.trim()) {
            setError('Name and API URL are required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const payload: SaveETLMonitorPayload = {
                name: form.name.trim(),
                code: form.code.trim() || undefined,
                description: form.description.trim() || undefined,
                monitorType: form.monitorType,
                category: form.category.trim() || undefined,
                refreshInterval: form.refreshInterval,
                timeout: form.timeout,
                active: form.active,
                configJson: buildConfigJson(),
                displayConfigJson: form.displayColumnsJson.trim() || undefined,
            };

            if (mode === 'create') {
                await createETLMonitor(payload);
            } else if (editing?.uuid) {
                await updateETLMonitor(editing.uuid, payload);
            }

            setOpen(false);
            const ac = new AbortController();
            await load(ac.signal);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to save ETL monitor');
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async (row: ETLMonitorDto) => {
        if (!row?.uuid) return;
        const yes = window.confirm(`Retire ETL monitor "${row.name}"?`);
        if (!yes) return;

        try {
            await deleteETLMonitor(row.uuid);
            const ac = new AbortController();
            await load(ac.signal);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to retire ETL monitor');
        }
    };

    const tableRows = rows.map((row) => ({
        id: row.uuid,
        name: row.name,
        code: row.code || '—',
        monitorType: row.monitorType || '—',
        category: row.category || '—',
        refreshInterval: `${row.refreshInterval}s`,
        status: row.active === false || row.retired ? 'Inactive' : 'Active',
        actions: '',
    }));

    const renderAuthFields = () => {
        switch (form.authType) {
            case 'BASIC':
                return (
                    <Stack gap={3}>
                        <TextInput
                            id="auth-username"
                            labelText="Username"
                            value={form.authUsername}
                            onChange={(e) => setForm((prev) => ({ ...prev, authUsername: e.target.value }))}
                        />
                        <TextInput
                            id="auth-password"
                            labelText="Password"
                            type="password"
                            value={form.authPassword}
                            onChange={(e) => setForm((prev) => ({ ...prev, authPassword: e.target.value }))}
                        />
                    </Stack>
                );
            case 'API_KEY':
                return (
                    <Stack gap={3}>
                        <TextInput
                            id="auth-header-name"
                            labelText="Header Name"
                            placeholder="e.g., X-API-Key"
                            value={form.authHeaderName}
                            onChange={(e) => setForm((prev) => ({ ...prev, authHeaderName: e.target.value }))}
                        />
                        <TextInput
                            id="auth-api-key"
                            labelText="API Key"
                            type="password"
                            value={form.authApiKey}
                            onChange={(e) => setForm((prev) => ({ ...prev, authApiKey: e.target.value }))}
                        />
                    </Stack>
                );
            case 'BEARER_TOKEN':
                return (
                    <TextInput
                        id="auth-token"
                        labelText="Bearer Token"
                        type="password"
                        value={form.authToken}
                        onChange={(e) => setForm((prev) => ({ ...prev, authToken: e.target.value }))}
                    />
                );
            case 'OPENMRS':
                return (
                    <InlineNotification
                        kind="info"
                        title="Using OpenMRS Session"
                        subtitle="The monitor will use your current OpenMRS session. No additional credentials needed."
                        lowContrast
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Stack gap={5}>
            <Header
                title="ETL Monitors"
                subtitle="Configure and monitor external ETL processes. Set up API endpoints and define how to extract and display data."
                actions={
                    <Stack orientation="horizontal" gap={2}>
                        <Button size="sm" renderIcon={Add} onClick={() => navigate('/admin/etl-monitors/builder?mode=create')}>
                            New Monitor
                        </Button>
                        <Button size="sm" kind="ghost" onClick={openCreate}>
                            Advanced (JSON)
                        </Button>
                    </Stack>
                }
            />

            <div style={{ padding: '0 1rem 1rem', display: 'grid', gap: '1rem' }}>
                <Search
                    size="lg"
                    labelText="Search"
                    placeholder="Search ETL monitors…"
                    value={q}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
                />

                {error ? <InlineNotification lowContrast kind="error" title="Error" subtitle={error} /> : null}

                {loading ? (
                    <DataTableSkeleton rowCount={5} columnCount={7} showHeader={false} showToolbar={false} />
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
                                                    <TableCell>{row.cells[4].value}</TableCell>
                                                    <TableCell>
                                                        {original?.active === false || original?.retired ? (
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
                                                                onClick={() => original && openEditWithBuilder(original)}
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
                modalHeading={mode === 'create' ? 'New ETL Monitor' : 'Edit ETL Monitor'}
                primaryButtonText={saving ? 'Saving…' : 'Save'}
                secondaryButtonText="Cancel"
                onRequestClose={() => !saving && setOpen(false)}
                onRequestSubmit={onSave}
                primaryButtonDisabled={saving || !form.name.trim() || !form.apiUrl.trim()}
                size="lg"
            >
                <Stack gap={5}>
                    <TextInput
                        id="monitor-name"
                        labelText="Name"
                        placeholder="e.g., Uganda ETL Status"
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    />

                    <TextInput
                        id="monitor-code"
                        labelText="Code"
                        placeholder="e.g., uganda-etl-status"
                        value={form.code}
                        onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                    />

                    <TextArea
                        id="monitor-description"
                        labelText="Description"
                        rows={2}
                        value={form.description}
                        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    />

                    <Select
                        id="monitor-type"
                        labelText="Monitor Type"
                        value={form.monitorType}
                        onChange={(e) => setForm((prev) => ({ ...prev, monitorType: e.target.value as MonitorType }))}
                    >
                        {monitorTypeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} text={opt.label} />
                        ))}
                    </Select>

                    <TextInput
                        id="monitor-category"
                        labelText="Category"
                        placeholder="e.g., Uganda ETL"
                        value={form.category}
                        onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    />

                    <Stack orientation="horizontal" gap={5}>
                        <div>
                            <label htmlFor="refresh-interval" style={{ display: 'block', marginBottom: '0.5rem' }}>
                                Refresh Interval (seconds)
                            </label>
                            <NumberInput
                                id="refresh-interval"
                                min={5}
                                max={3600}
                                value={form.refreshInterval}
                                onChange={(event) => {
                                    const val = parseInt((event.target as HTMLInputElement).value) || 30;
                                    setForm((prev) => ({ ...prev, refreshInterval: val }));
                                }}
                            />
                        </div>
                        <div>
                            <label htmlFor="timeout" style={{ display: 'block', marginBottom: '0.5rem' }}>
                                Timeout (seconds)
                            </label>
                            <NumberInput
                                id="timeout"
                                min={1}
                                max={300}
                                value={form.timeout}
                                onChange={(event) => {
                                    const val = parseInt((event.target as HTMLInputElement).value) || 10;
                                    setForm((prev) => ({ ...prev, timeout: val }));
                                }}
                            />
                        </div>
                    </Stack>

                    <Toggle
                        id="monitor-active"
                        labelText="Active"
                        toggled={form.active}
                        onToggle={(checked) => setForm((prev) => ({ ...prev, active: checked }))}
                    />

                    {/* API Endpoint Configuration */}
                    <div style={{ padding: '1rem', background: 'var(--cds-background, #f4f4f4)', borderRadius: '0.5rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0' }}>API Endpoint Configuration</h4>
                        <Stack gap={4}>
                            <TextInput
                                id="api-url"
                                labelText="API URL"
                                placeholder="/ws/rest/v1/ugandareportsetl/etl/status"
                                value={form.apiUrl}
                                onChange={(e) => setForm((prev) => ({ ...prev, apiUrl: e.target.value }))}
                                helperText="Can be relative (starts with /) or absolute"
                            />

                            <Select
                                id="api-method"
                                labelText="HTTP Method"
                                value={form.apiMethod}
                                onChange={(e) => setForm((prev) => ({ ...prev, apiMethod: e.target.value as 'GET' | 'POST' }))}
                            >
                                <SelectItem value="GET" text="GET" />
                                <SelectItem value="POST" text="POST" />
                            </Select>

                            <Select
                                id="auth-type"
                                labelText="Authentication"
                                value={form.authType}
                                onChange={(e) => setForm((prev) => ({ ...prev, authType: e.target.value as AuthType }))}
                            >
                                {authTypeOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} text={opt.label} />
                                ))}
                            </Select>

                            {renderAuthFields()}
                        </Stack>
                    </div>

                    {/* Display Configuration */}
                    <div style={{ padding: '1rem', background: 'var(--cds-background, #f4f4f4)', borderRadius: '0.5rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0' }}>Display Configuration (JSON)</h4>
                        <TextArea
                            id="display-config"
                            labelText="Display Configuration JSON"
                            rows={6}
                            value={form.displayColumnsJson}
                            placeholder={`{
  "columns": [
    {
      "key": "status",
      "header": "Status",
      "jsonPath": "$.isRunning",
      "columnType": "STATUS_BADGE",
      "colorMap": { "true": "running", "false": "success" }
    }
  ]
}`}
                            onChange={(e) => setForm((prev) => ({ ...prev, displayColumnsJson: e.target.value }))}
                            helperText="Define how to extract and display data from the API response"
                        />
                    </div>
                </Stack>
            </Modal>

            {/* Builder Modal - Legacy for Advanced option */}
            <EtlMonitorBuilderModalWrapper
                open={builderOpen}
                mode="create"
                monitorId={editing?.uuid}
                onClose={() => setBuilderOpen(false)}
                onSave={async (payload) => {
                    try {
                        await createETLMonitor(payload);
                        setBuilderOpen(false);
                        load();
                    } catch (e: any) {
                        console.error('Failed to save monitor:', e);
                        throw e;
                    }
                }}
            />
        </Stack>
    );
}

import React from 'react';
import {
    Button,
    Search,
    Stack,
    DataTable,
    Table,
    TableHead,
    TableRow,
    TableHeader,
    TableBody,
    TableCell,
    OverflowMenu,
    OverflowMenuItem,
    Tag,
} from '@carbon/react';
import { Add, Folder } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';

import Header from '../shared/header/header.component';
import CreateSectionModal from './create-report-section-modal.component';
import type { CreateSectionPayload, SectionIndicatorRef } from './section-types';
import SectionPreviewModal from './report-section-preview-modal.component';
import styles from './sections-page.scss';

import { useLocation } from 'react-router-dom';

import { listIndicators } from '../../resources/indicator/indicators.api';
import { createSection, getSection, listSections, updateSection, type ReportSectionDto } from '../../resources/report-section/report-sections.api';

function countIndicatorsFromConfig(section: ReportSectionDto): number {
    try {
        if (!section?.configJson) return 0;
        const obj = JSON.parse(section.configJson);
        const list = Array.isArray(obj?.indicators) ? obj.indicators : [];
        return list.length;
    } catch {
        return 0;
    }
}

const SectionsPage: React.FC = () => {
    const { t } = useTranslation();

    const [q, setQ] = React.useState('');
    const [openCreate, setOpenCreate] = React.useState(false);

    const [sections, setSections] = React.useState<ReportSectionDto[]>([]);
    const [sectionsLoading, setSectionsLoading] = React.useState(false);
    const [sectionsError, setSectionsError] = React.useState<string | null>(null);

    const [allIndicators, setAllIndicators] = React.useState<SectionIndicatorRef[]>([]);
    const [indicatorsLoading, setIndicatorsLoading] = React.useState(false);
    const [indicatorsError, setIndicatorsError] = React.useState<string | null>(null);

    const [previewOpen, setPreviewOpen] = React.useState(false);
    const [previewSection, setPreviewSection] = React.useState<ReportSectionDto | null>(null);

    // NEW: edit state
    const [editOpen, setEditOpen] = React.useState(false);
    const [editSection, setEditSection] = React.useState<ReportSectionDto | null>(null);

    const filtered = React.useMemo(() => {
        const s = q.trim().toLowerCase();
        return sections
            .filter((x) => !x.retired)
            .filter((x) => !s || (x.name ?? '').toLowerCase().includes(s) || (x.code ?? '').toLowerCase().includes(s));
    }, [q, sections]);

    const headers = React.useMemo(
        () => [
            { key: 'name', header: t('name', 'Name') },
            { key: 'indicators', header: t('indicators', 'Indicators') },
            { key: 'actions', header: t('actions', 'Actions') },
        ],
        [t],
    );

    const rows = React.useMemo(
        () =>
            filtered.map((x) => ({
                id: x.uuid,
                name: x.name,
                indicators: String(countIndicatorsFromConfig(x)),
                actions: '',
            })),
        [filtered],
    );

    const refreshSections = React.useCallback(async () => {
        const ac = new AbortController();
        setSectionsLoading(true);
        setSectionsError(null);
        try {
            const data = await listSections({ v: 'default' }, ac.signal);
            setSections(data);
        } catch (e: any) {
            setSectionsError(e?.message ?? 'Failed to load sections');
        } finally {
            setSectionsLoading(false);
        }
        return () => ac.abort();
    }, []);

    React.useEffect(() => {
        refreshSections();
    }, [refreshSections]);

    React.useEffect(() => {
        const ac = new AbortController();
        setIndicatorsLoading(true);
        setIndicatorsError(null);
        listIndicators({ v: 'default', includeRetired: false }, ac.signal)
            .then((inds) => {
                setAllIndicators(
                    inds.map((i) => ({
                        id: i.uuid,
                        type: i.kind,
                        code: i.code ?? '',
                        name: i.name,
                    })),
                );
            })
            .catch((e: any) => setIndicatorsError(e?.message ?? 'Failed to load indicators'))
            .finally(() => setIndicatorsLoading(false));
        return () => ac.abort();
    }, []);

    const onSaveSection = async (payload: CreateSectionPayload) => {
        try {
            if (payload.id) {
                await updateSection(payload.id, {
                    name: payload.name,
                    description: payload.description,
                    configJson: payload.configJson,
                });
                setEditOpen(false);
                setEditSection(null);
            } else {
                await createSection({
                    name: payload.name,
                    description: payload.description,
                    code: payload.name?.trim?.() ? payload.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 60) : undefined,
                    configJson: payload.configJson,
                });
                setOpenCreate(false);
            }
            await refreshSections();
        } catch (e: any) {
            // eslint-disable-next-line no-console
            console.error('Failed to save section', e);
        }
    };

    const openPreview = async (uuid: string) => {
        try {
            const sec = await getSection(uuid, undefined, 'full');
            setPreviewSection(sec);
            setPreviewOpen(true);
        } catch (e: any) {
            // eslint-disable-next-line no-console
            console.error('Failed to load section', e);
        }
    };

    const openEdit = async (uuid: string) => {
        try {
            const sec = await getSection(uuid, undefined, 'full');
            setEditSection(sec);
            setEditOpen(true);
        } catch (e: any) {
            // eslint-disable-next-line no-console
            console.error('Failed to load section for edit', e);
        }
    };

    const location = useLocation();

    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('create') === '1') {
            setOpenCreate(true);
        }
    }, [location.search]);

    return (
        <div className={styles.page}>
            <Header
                title={t('reportSection', 'Manage Report Sections')}
                subtitle={t('sectionsSubtitle', 'Draft • Define sections and reuse them in reports')}
                status={{ label: t('draft', 'Draft'), kind: 'warning' }}
            />

            <div className={styles.sectionsPage}>
                <div className={styles.headerRow}>
                    <h3 className={styles.title}>{t('sections', 'Sections')}</h3>
                    <Button size="sm" kind="primary" renderIcon={Add} onClick={() => setOpenCreate(true)}>
                        {t('createSection', 'Create Section')}
                    </Button>
                </div>

                <div className={styles.surface}>
                    <div className={styles.toolbarRow}>
                        <Search
                            size="lg"
                            labelText={t('search', 'Search')}
                            placeholder={t('search', 'Search')}
                            value={q}
                            onChange={(e) => setQ((e.target as HTMLInputElement).value)}
                        />
                    </div>

                    {sectionsError ? <div style={{ padding: '0.75rem' }}>{sectionsError}</div> : null}
                    {indicatorsError ? <div style={{ padding: '0.75rem' }}>{indicatorsError}</div> : null}

                    <DataTable rows={rows} headers={headers} size="lg" useZebraStyles>
                        {({ rows, headers, getHeaderProps, getRowProps, getTableProps }) => (
                            <Table {...getTableProps()}>
                                <TableHead>
                                    <TableRow>
                                        <TableHeader key="_hash" style={{ width: '3rem' }} />
                                        {headers.map((h) => (
                                            <TableHeader key={h.key} {...getHeaderProps({ header: h })}>
                                                {h.header}
                                            </TableHeader>
                                        ))}
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {rows.map((row) => (
                                        <TableRow key={row.id} data-testid={`section-row-${String(filtered.find((x) => x.uuid === row.id)?.name ?? row.id).replace(/\s+/g, '-')}`} {...getRowProps({ row })}>
                                            <TableCell>
                                                <Folder size={16} />
                                            </TableCell>

                                            {row.cells.map((cell) => {
                                                if (cell.info.header === 'actions') {
                                                    return (
                                                        <TableCell key={cell.id}>
                                                            <OverflowMenu data-testid={`section-actions-${row.id}`} size="sm" ariaLabel="Actions" flipped>
                                                                <OverflowMenuItem itemText="Preview" onClick={() => openPreview(row.id)} />
                                                                <OverflowMenuItem itemText="Edit" onClick={() => openEdit(row.id)} />
                                                            </OverflowMenu>
                                                        </TableCell>
                                                    );
                                                }

                                                if (cell.info.header === 'name') {
                                                    return (
                                                        <TableCell key={cell.id}>
                                                            <div style={{ fontWeight: 600 }}>{cell.value}</div>
                                                        </TableCell>
                                                    );
                                                }

                                                if (cell.info.header === 'indicators') {
                                                    return (
                                                        <TableCell key={cell.id}>
                                                            <Tag type="gray" size="sm">
                                                                {cell.value}
                                                            </Tag>
                                                        </TableCell>
                                                    );
                                                }

                                                return <TableCell key={cell.id}>{cell.value as any}</TableCell>;
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </DataTable>
                </div>
            </div>

            {/* Create */}
            <CreateSectionModal
                open={openCreate}
                onClose={() => setOpenCreate(false)}
                onSubmit={onSaveSection}
                indicators={allIndicators}
                mode="create"
                initialSection={null}
            />

            {/* Edit */}
            <CreateSectionModal
                open={editOpen}
                onClose={() => {
                    setEditOpen(false);
                    setEditSection(null);
                }}
                onSubmit={onSaveSection}
                indicators={allIndicators}
                mode="edit"
                initialSection={editSection}
            />

            {/* Preview */}
            <SectionPreviewModal
                open={previewOpen}
                onClose={() => {
                    setPreviewOpen(false);
                    setPreviewSection(null);
                }}
                section={previewSection}
            />
        </div>
    );
};

export default SectionsPage;
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
import {Add, Folder} from '@carbon/icons-react';
import {useTranslation} from 'react-i18next';

import Header from '../header/header.component';
import CreateSectionModal, {CreateSectionPayload, SectionIndicatorRef} from './create-section-modal.component';
import styles from './sections-page.scss';

import {useLocation} from 'react-router-dom';

export type SectionRow = {
    id: string;
    name: string;
    indicatorsCount: number;
};

const mockSections: SectionRow[] = [
    {id: 'sec-1', name: 'OPD Attendance', indicatorsCount: 5},
    {id: 'sec-2', name: 'Malaria Cases', indicatorsCount: 2},
    {id: 'sec-3', name: 'HIV/AIDS Section', indicatorsCount: 3},
    {id: 'sec-4', name: 'Maternal Health Indicators', indicatorsCount: 4},
];

const mockIndicators: SectionIndicatorRef[] = [
    {id: 'i-1', type: 'base', code: 'OPD_NEW', name: 'New OPD Visits'},
    {id: 'i-2', type: 'base', code: 'OPD_REV', name: 'Revisits'},
    {id: 'i-3', type: 'base', code: 'OPD_U5', name: 'Under 5 OPD Visits'},
    {id: 'i-4', type: 'base', code: 'DISP', name: 'Dispensary Visits'},
    {id: 'i-5', type: 'final', code: 'OPD_NEW_SEX_AGE', name: 'New OPD Visits by Sex & Age'},
];

const SectionsPage: React.FC = () => {
    const {t} = useTranslation();

    const [q, setQ] = React.useState('');
    const [openCreate, setOpenCreate] = React.useState(false);

    const filtered = React.useMemo(() => {
        const s = q.trim().toLowerCase();
        return mockSections.filter((x) => !s || x.name.toLowerCase().includes(s));
    }, [q]);

    const headers = React.useMemo(
        () => [
            {key: 'name', header: t('name', 'Name')},
            {key: 'indicators', header: t('indicators', 'Indicators')},
            {key: 'actions', header: t('actions', 'Actions')},
        ],
        [t],
    );

    const rows = React.useMemo(
        () =>
            filtered.map((x) => ({
                id: x.id,
                name: x.name,
                indicators: String(x.indicatorsCount),
                actions: '',
            })),
        [filtered],
    );

    const onCreateSection = (payload: CreateSectionPayload) => {
        // eslint-disable-next-line no-console
        console.log('create section payload', payload);
        setOpenCreate(false);
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
                title={t('reportBuilder', 'Report builder')}
                subtitle={t('sectionsSubtitle', 'Draft • Define sections and reuse them in reports')}
                status={{label: t('draft', 'Draft'), kind: 'warning'}}
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

                    <DataTable rows={rows} headers={headers} size="lg" useZebraStyles>
                        {({rows, headers, getHeaderProps, getRowProps, getTableProps}) => (
                            <Table {...getTableProps()}>
                                <TableHead>
                                    <TableRow>
                                        <TableHeader key="_hash" style={{width: '3rem'}}>
                                            #
                                        </TableHeader>

                                        {headers.map((h) => (
                                            <TableHeader key={h.key} {...getHeaderProps({header: h})}>
                                                {h.header}
                                            </TableHeader>
                                        ))}
                                    </TableRow>
                                </TableHead>

                                <TableBody>
                                    {rows.map((r, idx) => (
                                        <TableRow key={r.id} {...getRowProps({row: r})}>
                                            <TableCell>
                                                <div className={styles.rowIconWrap}>
                                                    <Folder size={16}/>
                                                    <Tag size="sm" type="gray" className={styles.rowIndexTag}>
                                                        {idx + 1}
                                                    </Tag>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className={styles.nameCell}>
                                                    <div
                                                        className={styles.nameText}>{r.cells.find((c) => c.info.header === 'name')?.value as any}</div>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className={styles.countCell}>
                                                    {r.cells.find((c) => c.info.header === 'indicators')?.value as any}
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className={styles.actionsCell}>
                                                    <OverflowMenu size="sm" aria-label="section actions">
                                                        <OverflowMenuItem itemText="Edit"
                                                                          onClick={() => console.log('edit', r.id)}/>
                                                        <OverflowMenuItem itemText="Duplicate"
                                                                          onClick={() => console.log('dup', r.id)}/>
                                                        <OverflowMenuItem
                                                            hasDivider
                                                            itemText="Delete"
                                                            onClick={() => console.log('delete', r.id)}
                                                            // depending on your Carbon version, one of these works:
                                                            isDelete
                                                            // danger
                                                        />
                                                    </OverflowMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </DataTable>

                    <div className={styles.footerRow}>
                        <div className={styles.footerText}>
                            {filtered.length} {t('sections', 'sections')}
                        </div>
                    </div>
                </div>

                <CreateSectionModal open={openCreate} onClose={() => setOpenCreate(false)} onSubmit={onCreateSection}
                                    indicators={mockIndicators}/>
            </div>
        </div>
    );
};

export default SectionsPage;
import React, { Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { InlineLoading } from '@carbon/react';
import {
    SideNav,
    SideNavItems,
    SideNavLink,
    SideNavMenu,
    SideNavMenuItem,
} from '@carbon/react';
import type { CarbonIconType } from '@carbon/icons-react';
import {
    Home,
    Report,
    ChartColumn,
    Layers,
    Play,
    Settings,
    List,
    Dashboard,
    ArrowRight,
    Folder,
    DataBase,
    Task,
    TableBuilt,
    Activity,
} from '@carbon/icons-react';

import { RB } from '../../constants/privileges';
import { useReportBuilderPrivileges } from '../../hooks/use-report-builder-privileges';
import styles from './report-builder-shell.scss';

interface NavItem {
    label: string;
    path: string;
    icon?: CarbonIconType;
    required: string[];
    /** Extra paths (besides `path`) that mark this item active. */
    activePaths?: string[];
}

interface NavSection {
    /** Sections without a title render their items as top-level links. */
    title?: string;
    icon?: CarbonIconType;
    /** Extra paths that mark this whole section active (e.g. the admin landing). */
    activePaths?: string[];
    items: NavItem[];
}

const NAV: NavSection[] = [
    {
        items: [
            { label: 'Home', path: '/', icon: Home, required: [RB.REPORT_VIEW] },
            { label: 'Run Reports', path: '/run', icon: Play, required: [RB.REPORT_RUN] },
            {
                label: 'Dashboards',
                path: '/dashboards',
                icon: Dashboard,
                required: [RB.DASHBOARD_VIEW],
            },
        ],
    },
    {
        title: 'Report Design',
        icon: Folder,
        items: [
            {
                label: 'Aggregate Reports',
                path: '/reports',
                icon: Report,
                required: [RB.REPORT_VIEW],
                activePaths: ['/new', '/edit'],
            },
            { label: 'Linelist Reports', path: '/linelist', icon: List, required: [RB.REPORT_VIEW] },
            {
                label: 'Indicators',
                path: '/indicators',
                icon: ChartColumn,
                required: [RB.INDICATOR_VIEW],
            },
            { label: 'Sections', path: '/sections', icon: Layers, required: [RB.SECTION_VIEW] },
        ],
    },
    {
        title: 'Admin',
        icon: Settings,
        activePaths: ['/admin'],
        items: [
            {
                label: 'Import / Export',
                path: '/import-export',
                icon: ArrowRight,
                required: [RB.PACKAGE_IMPORT, RB.PACKAGE_EXPORT],
            },
            {
                label: 'Dashboards',
                path: '/admin/dashboards',
                required: [RB.DASHBOARD_VIEW],
            },
            {
                label: 'Report Categories',
                path: '/admin/report-categories',
                required: [RB.CATEGORY_VIEW],
            },
            {
                label: 'Report Library',
                path: '/admin/report-library',
                required: [RB.LIBRARY_VIEW],
            },
            { label: 'Data Themes', path: '/admin/themes', required: [RB.THEME_VIEW] },
            {
                label: 'Age Categories',
                path: '/admin/age-categories',
                required: [RB.AGEGROUP_VIEW],
            },
            { label: 'Age Groups', path: '/admin/age-groups', required: [RB.AGEGROUP_VIEW] },
        ],
    },
    {
        title: 'ETL',
        icon: DataBase,
        items: [
            {
                label: 'Sources',
                path: '/admin/etl-sources',
                icon: DataBase,
                required: [RB.ETLSOURCE_VIEW],
            },
            { label: 'Tasks', path: '/admin/etl-tasks', icon: Task, required: [RB.PACKAGE_IMPORT] },
            {
                label: 'Data Browser',
                path: '/admin/etl-browser',
                icon: TableBuilt,
                required: [RB.ETLSOURCE_VIEW],
            },
            {
                label: 'Monitoring',
                path: '/admin/etl-monitors',
                icon: Activity,
                required: [RB.ETLMONITOR_VIEW],
            },
        ],
    },
];

const ShellSkeleton: React.FC = () => (
    <div className={styles.shell}>
        <aside className={styles.leftNav} />
        <main className={styles.main}>
            <InlineLoading description="Loading…" />
        </main>
    </div>
);

const ReportBuilderShellInner: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { has } = useReportBuilderPrivileges();

    const isActive = (path: string, extraPaths?: string[]) =>
        location.pathname === path ||
        location.pathname.startsWith(`${path}/`) ||
        (extraPaths ?? []).some(
            (extra) => location.pathname === extra || location.pathname.startsWith(`${extra}/`),
        );

    const visibleSections = React.useMemo(
        () =>
            NAV.map((section) => ({
                ...section,
                items: section.items.filter((item) => has(...item.required)),
            })).filter((section) => section.items.length > 0),
        [has],
    );

    return (
        <div className={styles.shell}>
            <aside className={styles.leftNav}>
                <SideNav expanded isPersistent={false} aria-label="Report Builder navigation">
                    <SideNavItems>
                        {visibleSections.length === 0 && (
                            <SideNavMenuItem>
                                No accessible sections — contact your administrator
                            </SideNavMenuItem>
                        )}
                        {visibleSections.map((section) =>
                            section.title ? (
                                <SideNavMenu
                                    key={section.title}
                                    renderIcon={section.icon}
                                    title={section.title}
                                    isActive={
                                        section.items.some((item) =>
                                            isActive(item.path, item.activePaths),
                                        ) || (section.activePaths ?? []).some((path) => isActive(path))
                                    }
                                    defaultExpanded={false}
                                >
                                    {section.items.map((item) => (
                                        <SideNavMenuItem
                                            key={item.path}
                                            renderIcon={item.icon}
                                            isActive={isActive(item.path, item.activePaths)}
                                            onClick={() => navigate(item.path)}
                                        >
                                            {item.label}
                                        </SideNavMenuItem>
                                    ))}
                                </SideNavMenu>
                            ) : (
                                section.items.map((item) => (
                                    <SideNavLink
                                        key={item.path}
                                        renderIcon={item.icon}
                                        isActive={isActive(item.path, item.activePaths)}
                                        onClick={() => navigate(item.path)}
                                    >
                                        {item.label}
                                    </SideNavLink>
                                ))
                            ),
                        )}
                    </SideNavItems>
                </SideNav>
            </aside>

            <main className={styles.main}>
                <Outlet />
            </main>
        </div>
    );
};

/** Session-backed privilege gating suspends on first load — show a skeleton, not a blank page. */
const ReportBuilderShell: React.FC = () => (
    <Suspense fallback={<ShellSkeleton />}>
        <ReportBuilderShellInner />
    </Suspense>
);

export default ReportBuilderShell;

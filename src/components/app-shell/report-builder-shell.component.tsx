import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    SideNav,
    SideNavItems,
    SideNavLink,
    SideNavMenu,
    SideNavMenuItem,
} from '@carbon/react';
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
} from '@carbon/icons-react';

import styles from './report-builder-shell.scss';

const ReportBuilderShell: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) =>
        location.pathname === path || location.pathname.startsWith(`${path}/`);

    return (
        <div className={styles.shell}>
            <aside className={styles.leftNav}>
                <SideNav expanded isPersistent={false} aria-label="Report Builder navigation">
                    <SideNavItems>
                        <SideNavLink
                            renderIcon={Home}
                            isActive={location.pathname === '/'}
                            onClick={() => navigate('/')}
                        >
                            Home
                        </SideNavLink>

                        <SideNavMenu
                            renderIcon={Folder}
                            title="Report Design"
                            isActive={isActive('/reports') || isActive('/linelist') || isActive('/indicators') || isActive('/sections')}
                            defaultExpanded={true}
                        >
                            <SideNavMenuItem
                                renderIcon={Report}
                                isActive={isActive('/reports') || isActive('/new') || isActive('/edit')}
                                onClick={() => navigate('/reports')}
                            >
                                Aggregate Reports
                            </SideNavMenuItem>

                            <SideNavMenuItem
                                renderIcon={List}
                                isActive={isActive('/linelist')}
                                onClick={() => navigate('/linelist')}
                            >
                                Linelist Reports
                            </SideNavMenuItem>

                            <SideNavMenuItem
                                renderIcon={ChartColumn}
                                isActive={isActive('/indicators')}
                                onClick={() => navigate('/indicators')}
                            >
                                Indicators
                            </SideNavMenuItem>

                            <SideNavMenuItem
                                renderIcon={Layers}
                                isActive={isActive('/sections')}
                                onClick={() => navigate('/sections')}
                            >
                                Sections
                            </SideNavMenuItem>
                        </SideNavMenu>

                        <SideNavLink
                            renderIcon={Play}
                            isActive={isActive('/run')}
                            onClick={() => navigate('/run')}
                        >
                            Run Reports
                        </SideNavLink>

                        <SideNavLink
                            renderIcon={Dashboard}
                            isActive={isActive('/etl-dashboard')}
                            onClick={() => navigate('/etl-dashboard')}
                        >
                            ETL Dashboard
                        </SideNavLink>

                        <SideNavMenu
                            renderIcon={Settings}
                            title="Admin"
                            isActive={isActive('/admin') || isActive('/import-export')}
                            defaultExpanded={false}
                        >
                            <SideNavMenuItem
                                renderIcon={ArrowRight}
                                isActive={isActive('/import-export')}
                                onClick={() => navigate('/import-export')}
                            >
                                Import / Export
                            </SideNavMenuItem>

                            <SideNavMenuItem
                                isActive={isActive('/admin/report-categories')}
                                onClick={() => navigate('/admin/report-categories')}
                            >
                                Report Categories
                            </SideNavMenuItem>

                            <SideNavMenuItem
                                isActive={isActive('/admin/report-library')}
                                onClick={() => navigate('/admin/report-library')}
                            >
                                Report Library
                            </SideNavMenuItem>

                            <SideNavMenuItem
                                isActive={isActive('/admin/themes')}
                                onClick={() => navigate('/admin/themes')}
                            >
                                Data Themes
                            </SideNavMenuItem>

                            <SideNavMenuItem
                                isActive={isActive('/admin/age-categories')}
                                onClick={() => navigate('/admin/age-categories')}
                            >
                                Age Categories
                            </SideNavMenuItem>

                            <SideNavMenuItem
                                isActive={isActive('/admin/age-groups')}
                                onClick={() => navigate('/admin/age-groups')}
                            >
                                Age Groups
                            </SideNavMenuItem>

                            <SideNavMenuItem
                                isActive={isActive('/admin/etl-sources')}
                                onClick={() => navigate('/admin/etl-sources')}
                            >
                                ETL Sources
                            </SideNavMenuItem>

                            <SideNavMenuItem
                                isActive={isActive('/admin/etl-tasks')}
                                onClick={() => navigate('/admin/etl-tasks')}
                            >
                                ETL Tasks
                            </SideNavMenuItem>

                            <SideNavMenuItem
                                isActive={isActive('/admin/etl-monitors')}
                                onClick={() => navigate('/admin/etl-monitors')}
                            >
                                ETL Monitors
                            </SideNavMenuItem>
                        </SideNavMenu>
                    </SideNavItems>
                </SideNav>
            </aside>

            <main className={styles.main}>
                <Outlet />
            </main>
        </div>
    );
};

export default ReportBuilderShell;

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

                        <SideNavLink
                            renderIcon={Report}
                            isActive={isActive('/reports') || isActive('/new') || isActive('/edit')}
                            onClick={() => navigate('/reports')}
                        >
                            Reports
                        </SideNavLink>

                        <SideNavLink
                            renderIcon={ChartColumn}
                            isActive={isActive('/indicators')}
                            onClick={() => navigate('/indicators')}
                        >
                            Indicators
                        </SideNavLink>

                        <SideNavLink
                            renderIcon={Layers}
                            isActive={isActive('/sections')}
                            onClick={() => navigate('/sections')}
                        >
                            Sections
                        </SideNavLink>

                        <SideNavLink
                            renderIcon={Play}
                            isActive={isActive('/run')}
                            onClick={() => navigate('/run')}
                        >
                            Run Reports
                        </SideNavLink>

                        <SideNavMenu
                            renderIcon={Settings}
                            title="Admin"
                            isActive={isActive('/admin')}
                            defaultExpanded={false}
                        >
                            <SideNavMenuItem
                                isActive={isActive('/admin/report-categories')}
                                onClick={() => navigate('/admin/report-categories')}
                            >
                                Report Categories
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
                            <SideNavMenuItem isActive={isActive('/admin/report-library')} onClick={() => navigate('/admin/report-library')}>
                                Report Library
                            </SideNavMenuItem>
                            <SideNavMenuItem isActive={isActive('/admin/themes')} onClick={() => navigate('/admin/themes')}>
                                Data Themes
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
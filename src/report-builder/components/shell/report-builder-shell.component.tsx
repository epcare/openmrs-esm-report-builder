import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SideNav, SideNavItems, SideNavLink } from '@carbon/react';
import { Home, Report, ChartColumn, Layers, Play } from '@carbon/icons-react';

import styles from './report-builder-shell.scss';

const ReportBuilderShell: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname.endsWith(path);

    return (
        <div className={styles.shell}>
            <aside className={styles.leftNav}>
                <SideNav expanded isPersistent={false} aria-label="Report Builder navigation">
                    <SideNavItems>
                        <SideNavLink
                            renderIcon={Home}
                            isActive={isActive('/')}
                            onClick={() => navigate('/')}
                        >
                            Home
                        </SideNavLink>

                        <SideNavLink
                            renderIcon={Report}
                            isActive={isActive('/reports')}
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
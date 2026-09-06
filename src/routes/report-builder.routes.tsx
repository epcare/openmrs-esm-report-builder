import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import ReportBuilderShell from '../components/app-shell/report-builder-shell.component';
import ReportBuilderLandingPage from '../components/landing/report-builder-landing-page.component';

import ReportDashboardPage from '../components/report/report-dashboard.page.component';
import ReportEditorPage from '../components/report/report-editor.page.component';

import IndicatorsPage from '../components/indicators/indicators-page.component';
import SectionsPage from '../components/report-sections/report-sections-page.component';
import ReportVisualizerPage from '../features/report-visualizer/ReportVisualizerPage';
import DataThemesPage from '../components/data-themes/data-themes-page.component';

import AdminPage from '../components/admin/admin-page.component';
import ReportCategoriesPage from '../components/admin/report-categories-page.component';
import AgeCategoriesPage from '../components/admin/age-categories-page.component';
import AgeGroupsPage from '../components/admin/age-groups-page.component';
import ReportLibraryPage from '../components/admin/report-library-page.component';
import ETLSourcesPage from '../components/admin/etl-sources-page.component';
import ETLTasksPage from '../components/admin/etl-tasks-page.component';
import EtlBrowserPage from '../components/admin/etl-browser/etl-browser-page.component';
import ETLMonitorsPage from '../components/etl-monitor/etl-monitors-page.component';
import { EtlMonitorBuilderPage } from '../components/etl-monitor/builder';
import { DashboardsPage, DashboardRendererPage, EtlDashboardPage } from '../features/dashboards';
import DashboardsAdminPage from '../components/dashboards/dashboards-page.component';

import LinelistReportsPage from '../components/linelist/linelist-dashboard.page.component';
import LinelistBuilderWorkspace from '../components/linelist/definition/linelist-definition-editor.component';
import LinelistRunReport from '../components/linelist/linelist-run-report.page.component';

import { ImportExportPage } from '../components/import-export';

import PrivilegeRoute from '../components/security/privilege-route.component';
import { ROUTE_PRIVILEGES } from '../constants/privileges';

/** Wraps a route element with its required privileges (see ROUTE_PRIVILEGES). */
const guard = (route: keyof typeof ROUTE_PRIVILEGES, element: React.ReactNode) => (
    <PrivilegeRoute required={ROUTE_PRIVILEGES[route]}>{element}</PrivilegeRoute>
);

const ReportBuilderRoutes: React.FC = () => {
    return (
        <Routes>
            <Route element={<ReportBuilderShell />}>
                {/* Home / landing */}
                <Route path="/" element={guard('/', <ReportBuilderLandingPage />)} />

                {/* Reports */}
                <Route path="/reports" element={guard('/reports', <ReportDashboardPage />)} />

                {/* Create / edit report */}
                <Route path="/new" element={guard('/new', <ReportEditorPage />)} />
                <Route
                    path="/edit/:reportId"
                    element={guard('/edit/:reportId', <ReportEditorPage />)}
                />

                {/* Indicators / sections */}
                <Route path="/indicators" element={guard('/indicators', <IndicatorsPage />)} />
                <Route path="/sections" element={guard('/sections', <SectionsPage />)} />

                {/* Run */}
                <Route path="/run" element={guard('/run', <ReportVisualizerPage />)} />
                <Route
                    path="/run-reports"
                    element={guard('/run-reports', <ReportVisualizerPage />)}
                />

                {/* Admin */}
                <Route path="/admin" element={guard('/admin', <AdminPage />)} />
                <Route
                    path="/admin/report-categories"
                    element={guard('/admin/report-categories', <ReportCategoriesPage />)}
                />
                <Route
                    path="/admin/age-categories"
                    element={guard('/admin/age-categories', <AgeCategoriesPage />)}
                />
                <Route
                    path="/admin/age-groups"
                    element={guard('/admin/age-groups', <AgeGroupsPage />)}
                />
                <Route
                    path="/admin/report-library"
                    element={guard('/admin/report-library', <ReportLibraryPage />)}
                />
                <Route
                    path="/admin/etl-sources"
                    element={guard('/admin/etl-sources', <ETLSourcesPage />)}
                />
                <Route
                    path="/admin/etl-tasks"
                    element={guard('/admin/etl-tasks', <ETLTasksPage />)}
                />
                <Route
                    path="/admin/etl-monitors"
                    element={guard('/admin/etl-monitors', <ETLMonitorsPage />)}
                />
                <Route
                    path="/admin/etl-monitors/builder"
                    element={guard('/admin/etl-monitors/builder', <EtlMonitorBuilderPage />)}
                />
                <Route
                    path="/admin/etl-browser"
                    element={guard('/admin/etl-browser', <EtlBrowserPage />)}
                />
                <Route
                    path="/admin/dashboards"
                    element={guard('/admin/dashboards', <DashboardsAdminPage />)}
                />
                <Route path="/dashboards" element={guard('/dashboards', <DashboardsPage />)} />
                <Route
                    path="/dashboards/:code"
                    element={guard('/dashboards/:code', <DashboardRendererPage />)}
                />
                <Route
                    path="/etl-dashboard"
                    element={guard('/etl-dashboard', <EtlDashboardPage />)}
                />

                {/* Data themes now accessed under Admin */}
                <Route
                    path="/admin/themes"
                    element={guard('/admin/themes', <DataThemesPage />)}
                />

                {/* Linelist Reports */}
                <Route path="/linelist" element={guard('/linelist', <LinelistReportsPage />)} />
                <Route
                    path="/linelist/new"
                    element={guard('/linelist/new', <LinelistBuilderWorkspace />)}
                />
                <Route
                    path="/linelist/edit/:reportId"
                    element={guard('/linelist/edit/:reportId', <LinelistBuilderWorkspace />)}
                />
                <Route
                    path="/linelist/run/:reportId"
                    element={guard('/linelist/run/:reportId', <LinelistRunReport />)}
                />

                {/* Import / Export */}
                <Route
                    path="/import-export"
                    element={guard('/import-export', <ImportExportPage />)}
                />

                {/* Optional backward compatibility */}
                <Route path="/themes" element={<Navigate to="/admin/themes" replace />} />


                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
};

export default ReportBuilderRoutes;
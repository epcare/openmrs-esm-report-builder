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

import LegacyReportsPage from '../components/legacy-reports/legacy-reports-page.component';
import LegacyReportDetailPage from '../components/legacy-reports/legacy-report-detail-page.component';
import LegacyReportEditorPage from '../components/legacy-reports/legacy-report-editor-page.component';

import LinelistReportsPage from '../components/linelist/linelist-dashboard.page.component';
import LinelistBuilderWorkspace from '../components/linelist/definition/linelist-definition-editor.component';
import LinelistRunReport from '../components/linelist/linelist-run-report.page.component';

const ReportBuilderRoutes: React.FC = () => {
    return (
        <Routes>
            <Route element={<ReportBuilderShell />}>
                {/* Home / landing */}
                <Route path="/" element={<ReportBuilderLandingPage />} />

                {/* Reports */}
                <Route path="/reports" element={<ReportDashboardPage />} />

                {/* Create / edit report */}
                <Route path="/new" element={<ReportEditorPage />} />
                <Route path="/edit/:reportId" element={<ReportEditorPage />} />

                {/* Indicators / sections */}
                <Route path="/indicators" element={<IndicatorsPage />} />
                <Route path="/sections" element={<SectionsPage />} />

                {/* Run */}
                <Route path="/run" element={<ReportVisualizerPage />} />
                <Route path="/run-reports" element={<ReportVisualizerPage />} />

                {/* Admin */}
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/report-categories" element={<ReportCategoriesPage />} />
                <Route path="/admin/age-categories" element={<AgeCategoriesPage />} />
                <Route path="/admin/age-groups" element={<AgeGroupsPage />} />
                <Route path="/admin/report-library" element={<ReportLibraryPage />} />
                <Route path="/admin/etl-sources" element={<ETLSourcesPage />} />
                <Route path="/admin/etl-tasks" element={<ETLTasksPage />} />

                {/* Legacy Reports */}
                <Route path="/legacy-reports" element={<LegacyReportsPage />} />
                <Route path="/legacy-reports/:uuid" element={<LegacyReportDetailPage />} />
                <Route path="/legacy-reports/:uuid/edit" element={<LegacyReportEditorPage />} />
                <Route path="/legacy-reports/new/edit" element={<LegacyReportEditorPage />} />

                {/* Data themes now accessed under Admin */}
                <Route path="/admin/themes" element={<DataThemesPage />} />

                {/* Linelist Reports */}
                <Route path="/linelist" element={<LinelistReportsPage />} />
                <Route path="/linelist/new" element={<LinelistBuilderWorkspace />} />
                <Route path="/linelist/edit/:reportId" element={<LinelistBuilderWorkspace />} />
                <Route path="/linelist/run/:reportId" element={<LinelistRunReport />} />

                {/* Optional backward compatibility */}
                <Route path="/themes" element={<Navigate to="/admin/themes" replace />} />


                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
};

export default ReportBuilderRoutes;
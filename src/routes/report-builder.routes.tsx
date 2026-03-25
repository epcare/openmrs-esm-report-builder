import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import ReportBuilderShell from '../components/app-shell/report-builder-shell.component';
import ReportBuilderLandingPage from '../components/landing/report-builder-landing-page.component';

import ReportDashboardPage from '../components/report/report-dashboard.page.component';
import ReportEditorPage from '../components/report/report-editor.page.component';

import IndicatorsPage from '../components/indicators/indicators-page.component';
import SectionsPage from '../components/report-sections/report-sections-page.component';
import RunReportsPage from '../components/run-reports/run-reports-page.component';
import DataThemesPage from '../components/data-themes/data-themes-page.component';

import AdminPage from '../components/admin/admin-page.component';
import ReportCategoriesPage from '../components/admin/report-categories-page.component';
import AgeCategoriesPage from '../components/admin/age-categories-page.component';
import AgeGroupsPage from '../components/admin/age-groups-page.component';
import ReportLibraryPage from '../components/admin/report-library-page.component';
import ETLSourcesPage from '../components/admin/etl-sources-page.component';

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
                <Route path="/run" element={<RunReportsPage />} />


                {/* Admin */}
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/report-categories" element={<ReportCategoriesPage />} />
                <Route path="/admin/age-categories" element={<AgeCategoriesPage />} />
                <Route path="/admin/age-groups" element={<AgeGroupsPage />} />
                <Route path="/admin/report-library" element={<ReportLibraryPage />} />
                <Route path="/admin/etl-sources" element={<ETLSourcesPage />} />

                {/* Data themes now accessed under Admin */}
                <Route path="/admin/themes" element={<DataThemesPage />} />

                {/* Optional backward compatibility */}
                <Route path="/themes" element={<Navigate to="/admin/themes" replace />} />


                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
};

export default ReportBuilderRoutes;
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

                {/* Themes */}
                <Route path="/themes" element={<DataThemesPage />} />

                {/* Run */}
                <Route path="/run" element={<RunReportsPage />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
};

export default ReportBuilderRoutes;
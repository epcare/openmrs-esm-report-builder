import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import ReportBuilderShell from '../shell/report-builder-shell.component';

// Existing pages
import ReportBuilderLandingPage from '../landing/report-builder-landing-page.component';
import ReportsDashboard from '../reports-dashboard/reports-dashboard.component';
import ReportBuilder from './report-builder';
import IndicatorsPage from '../indicators/indicators-page.component';
import SectionsPage from '../sections/sections-page.component';
import RunReportsPage from '../run-reports/run-reports-page.component';

// ✅ Themes page
import DataThemesPage from '../themes/data-themes-page.component';

const ReportBuilderRoutes: React.FC = () => {
    return (
        <Routes>
            <Route element={<ReportBuilderShell />}>
                {/* Home / landing */}
                <Route path="/" element={<ReportBuilderLandingPage />} />

                {/* Reports */}
                <Route path="/reports" element={<ReportsDashboard />} />

                {/* Create / edit report */}
                <Route path="/new" element={<ReportBuilder />} />
                <Route path="/edit/:reportId" element={<ReportBuilder />} />

                {/* Indicators / sections */}
                <Route path="/indicators" element={<IndicatorsPage />} />
                <Route path="/sections" element={<SectionsPage />} />

                {/* ✅ Themes */}
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
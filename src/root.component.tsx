import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';

import ReportsDashboard from './report-builder/components/reports-dashboard/reports-dashboard.component';
import ReportBuilder from './report-builder/components/report-builder/report-builder';

import IndicatorsPage from './report-builder/components/indicators/indicators-page.component';
import SectionsPage from './report-builder/components/sections/sections-page.component';

// ✅ Import your new landing page component
import ReportBuilderLandingPage from './report-builder/components/landing/report-builder-landing-page.component';

const RootComponent: React.FC = () => {
    return (
        <BrowserRouter basename={`${window.spaBase}/report-builder`}>
            <Routes>
                {/* ✅ Landing page loads first */}
                <Route path="/" element={<ReportBuilderLandingPage />} />

                <Route path="/sections" element={<SectionsPage />} />

                {/* Indicators */}
                <Route path="/indicators" element={<IndicatorsPage />} />

                {/* Existing dashboard moved to /reports */}
                <Route path="/reports" element={<ReportsDashboard />} />

                {/* Create */}
                <Route path="/new" element={<ReportBuilder />} />

                {/* Edit */}
                <Route path="/edit/:reportId" element={<ReportBuilder />} />

                {/* Optional: fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

export default RootComponent;
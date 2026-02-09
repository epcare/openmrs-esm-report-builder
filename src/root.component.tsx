import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import ReportsDashboard from './report-builder/components/reports-dashboard/reports-dashboard.component';
import ReportBuilder from './report-builder/components/report-builder/report-builder';


const RootComponent: React.FC = () => {
    return (
        <BrowserRouter basename={`${window.spaBase}/report-builder`}>
            <Routes>
                {/* Default entry */}
                <Route path="/" element={<ReportsDashboard />} />

                {/* Create */}
                <Route path="/new" element={<ReportBuilder />} />

                {/* Edit */}
                <Route path="/edit/:reportId" element={<ReportBuilder />} />
            </Routes>
        </BrowserRouter>
    );
};

export default RootComponent;
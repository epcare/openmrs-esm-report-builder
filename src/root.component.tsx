import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';

import ReportBuilderRoutes from './routes/report-builder.routes';

const RootComponent: React.FC = () => {
    return (
        <BrowserRouter basename={`${window.spaBase}/report-builder`}>
            <Routes>
                {/* All report-builder routes live under the shell (left nav + content frame) */}
                <Route path="/*" element={<ReportBuilderRoutes />} />

                {/* Safety fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

export default RootComponent;
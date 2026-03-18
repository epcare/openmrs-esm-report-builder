
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import ReportBuilderShell from '../app-shell/report-builder-shell.component';
import ReportBuilderLandingPage from '../landing/report-builder-landing-page.component';
import ReportDashboardPage from './report-dashboard.page.component';
import ReportEditorPage from './report-editor.page.component';
import IndicatorsPage from '../indicators/indicators-page.component';
import SectionsPage from '../report-sections/report-sections-page.component';
import RunReportsPage from '../run-reports/run-reports-page.component';
import DataThemesPage from '../data-themes/data-themes-page.component';

const ReportRoutes: React.FC = () => (
  <Routes>
    <Route element={<ReportBuilderShell />}>
      <Route path="/" element={<ReportBuilderLandingPage />} />
      <Route path="/reports" element={<ReportDashboardPage />} />
      <Route path="/new" element={<ReportEditorPage />} />
      <Route path="/edit/:reportId" element={<ReportEditorPage />} />
      <Route path="/indicators" element={<IndicatorsPage />} />
      <Route path="/sections" element={<SectionsPage />} />
      <Route path="/themes" element={<DataThemesPage />} />
      <Route path="/run" element={<RunReportsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
);

export default ReportRoutes;

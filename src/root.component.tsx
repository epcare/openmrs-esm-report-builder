import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import ReportTemplateBuilder from './report-template-builder/report-template-builder.component';

const RootComponent: React.FC = () => {
  return (
    <BrowserRouter basename={`${window.spaBase}/report-template-builder`}>
      <Routes>
        <Route path="/" element={<ReportTemplateBuilder />} />
      </Routes>
    </BrowserRouter>
  );
};

export default RootComponent;

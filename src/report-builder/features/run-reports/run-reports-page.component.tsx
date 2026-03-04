import React from 'react';
import { useTranslation } from 'react-i18next';

import Header from '../../shared/components/header/header.component';

const RunReportsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <Header
        title={t('runReports', 'Run Reports')}
        subtitle={t('runReportsHint', 'Choose a report and run it for specific time periods and locations.')}
      />

      <div style={{ padding: '1rem' }}>
        {t('runReportsComingSoon', 'Coming soon: run report wizard, filters, and results viewer.')}
      </div>
    </div>
  );
};

export default RunReportsPage;

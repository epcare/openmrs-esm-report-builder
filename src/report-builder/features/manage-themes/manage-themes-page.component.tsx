import React from 'react';
import { useTranslation } from 'react-i18next';

import Header from '../../shared/components/header/header.component';

const ManageThemesPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <Header
        title={t('manageThemes', 'Manage themes')}
        subtitle={t('manageThemesSubtitle', 'Organize indicators into themes (coming soon).')}
      />
    </div>
  );
};

export default ManageThemesPage;

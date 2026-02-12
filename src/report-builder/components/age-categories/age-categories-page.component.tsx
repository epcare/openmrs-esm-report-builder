import React from 'react';
import { useTranslation } from 'react-i18next';

import Header from '../header/header.component';

const AgeCategoriesPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <Header
        title={t('ageCategories', 'Age categories')}
        subtitle={t('ageCategoriesHint', 'Define and manage age group disaggregation presets.')}
      />

      <div style={{ padding: '1rem' }}>
        <p style={{ margin: 0, opacity: 0.75 }}>
          {t('comingSoon', 'Coming soon.')}
        </p>
      </div>
    </div>
  );
};

export default AgeCategoriesPage;

import React from 'react';
import { useTranslation } from 'react-i18next';

import Header from '../header/header.component';

const SystemAdminPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <Header
        title={t('systemAdmin', 'System admin')}
        subtitle={t('systemAdminHint', 'System-level settings and maintenance actions for reporting.')}
      />
    </div>
  );
};

export default SystemAdminPage;

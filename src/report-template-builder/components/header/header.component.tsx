import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Location, UserFollow } from '@carbon/react/icons';
import { formatDate, useSession } from '@openmrs/esm-framework';
import Illustration from './illustration.component';
import styles from './header.scss';
import BuilderHeaderActions from './builder-header-actions.component';

interface HeaderProps {
  title: string;
  actions?: React.ReactNode; // ✅ add this
}

const Header: React.FC<HeaderProps> = ({ title, actions }) => {
  const { t } = useTranslation();
  const session = useSession();
  const location = session?.sessionLocation?.display;

  return (
    <div className={styles.header}>
      <div className={styles['left-justified-items']}>
        <Illustration />
        <div className={styles['page-labels']}>
          <p>{t('formBuilder', 'Form builder')}</p>
          <p className={styles['page-name']}>{title}</p>
        </div>
      </div>

      <div className={styles['right-justified-items']}>

        <div className={styles.userContainer}>
          <p>{session?.user?.person?.display}</p>
          <UserFollow size={16} className={styles.userIcon} />
        </div>

        <div className={styles['date-and-location']}>
          <Location size={16} />
          <span className={styles.value}>{location}</span>
          <span className={styles.middot}>&middot;</span>
          <Calendar size={16} />
          <span className={styles.value}>{formatDate(new Date(), { mode: 'standard' })}</span>
        </div>

        {actions ? <div className={styles.headerActions}>{actions}</div> : null}
      </div>
    </div>
  );
};

export default Header;
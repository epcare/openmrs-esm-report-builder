import React from 'react';
import { Button, Tile } from '@carbon/react';
import { Add, ChartColumn, Play, Report } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import styles from './report-builder-landing-page.scss';
import Header from '../header/header.component';

const ReportBuilderLandingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
      <div className={styles.page}>
        {/* HERO (matches screenshot layout) */}
        <Header
            title={t('welcomeReporting', 'Welcome  Report Builder')}
            subtitle={t('welcomeReportingHint', 'Manage health data reports, define indicators, and run reports with ease.')}
        />

        {/* CARDS */}
        <div className={styles.cardsGrid}>
          <Tile className={styles.card}>
            <div className={styles.cardIllustration} aria-hidden>
              <div className={styles.illCircle}>
                <Report size={56} />
              </div>
            </div>

            <h3 className={styles.cardTitle}>{t('createReports', 'Create Reports')}</h3>
            <p className={styles.cardBody}>
              {t('createReportsHint', 'Define and configure health data reports tailored to your needs.')}
            </p>

            <div className={styles.cardActions}>
              <Button
                  kind="primary"
                  size="lg"
                  renderIcon={Add}
                  className={styles.cardButton}
                  onClick={() => navigate('/new')}
              >
                {t('getStarted', 'Get started')}
              </Button>
            </div>
          </Tile>

          <Tile className={styles.card}>
            <div className={styles.cardIllustration} aria-hidden>
              <div className={styles.illCircle}>
                <ChartColumn size={56} />
              </div>
            </div>

            <h3 className={styles.cardTitle}>{t('manageIndicators', 'Manage Indicators')}</h3>
            <p className={styles.cardBody}>
              {t('manageIndicatorsHint', 'Create, edit, and organize indicators to measure key health metrics.')}
            </p>

            <div className={styles.cardActions}>
              <Button
                  kind="primary"
                  size="lg"
                  renderIcon={ChartColumn}
                  className={styles.cardButton}
                  onClick={() => navigate('/indicators')}
              >
                {t('viewIndicators', 'View indicators')}
              </Button>
            </div>
          </Tile>

          <Tile className={styles.card}>
            <div className={styles.cardIllustration} aria-hidden>
              <div className={styles.illCircle}>
                <Play size={56} />
              </div>
            </div>

            <h3 className={styles.cardTitle}>{t('runReports', 'Run Reports')}</h3>
            <p className={styles.cardBody}>
              {t('runReportsHint', 'Choose a report and run it for specific time periods and locations.')}
            </p>

            <div className={styles.cardActions}>
              <Button
                  kind="primary"
                  size="lg"
                  renderIcon={Play}
                  className={styles.cardButton}
                  onClick={() => navigate('/run')}
              >
                {t('runNow', 'Run now')}
              </Button>
            </div>
          </Tile>
        </div>
      </div>
  );
};

export default ReportBuilderLandingPage;
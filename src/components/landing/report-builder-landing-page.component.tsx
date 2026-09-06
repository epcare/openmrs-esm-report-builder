import React from 'react';
import { Button, InlineNotification, Tile } from '@carbon/react';
import { Add, ChartColumn, Play, Report, List, Folder } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import styles from './report-builder-landing-page.scss';
import Header from '../shared/header/header.component';
import { RB } from '../../constants/privileges';
import { useReportBuilderPrivileges } from '../../hooks/use-report-builder-privileges';

const ReportBuilderLandingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { has } = useReportBuilderPrivileges();

  const canCreateReports = has(RB.REPORT_ADD);
  const canViewIndicators = has(RB.INDICATOR_VIEW);
  const canViewSections = has(RB.SECTION_VIEW);
  const canRunReports = has(RB.REPORT_RUN);
  const canViewLinelist = has(RB.REPORT_VIEW);
  const noTilesVisible =
    !canCreateReports && !canViewIndicators && !canViewSections && !canRunReports && !canViewLinelist;

  return (
      <div className={styles.page}>
        {/* HERO (matches screenshot layout) */}
        <Header
            title={t('welcomeReporting', 'Welcome  Report Builder')}
            subtitle={t('welcomeReportingHint', 'Manage health data reports, define indicators, and run reports with ease.')}
        />

        {/* CARDS */}
        <div className={styles.cardsGrid}>
          {noTilesVisible && (
            <InlineNotification
              lowContrast
              kind="info"
              title={t('noAccessTitle', 'No access')}
              subtitle={t(
                'noAccessSubtitle',
                'You do not have access to any Report Builder features. Contact your administrator.',
              )}
              hideCloseButton
            />
          )}
          {canCreateReports && (
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
          )}

          {canViewIndicators && (
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
          )}

          {canViewSections && (
          <Tile className={styles.card}>
            <div className={styles.cardIllustration} aria-hidden>
              <div className={styles.illCircle}>
                <Folder size={56} />
              </div>
            </div>

            <h3 className={styles.cardTitle}>{t('manageSections', 'Manage Sections')}</h3>
            <p className={styles.cardBody}>
              {t('manageSectionsHint', 'Create and manage indicator sections for organized report disaggregation.')}
            </p>

            <div className={styles.cardActions}>
              <Button
                  kind="primary"
                  size="lg"
                  renderIcon={Folder}
                  className={styles.cardButton}
                  onClick={() => navigate('/sections')}
              >
                {t('viewSections', 'View sections')}
              </Button>
            </div>
          </Tile>
          )}

          {canRunReports && (
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
          )}

          {canViewLinelist && (
          <Tile className={styles.card}>
            <div className={styles.cardIllustration} aria-hidden>
              <div className={styles.illCircle}>
                <List size={56} />
              </div>
            </div>

            <h3 className={styles.cardTitle}>{t('linelistReports', 'Linelist Reports')}</h3>
            <p className={styles.cardBody}>
              {t('linelistReportsHint', 'Create and manage patient list reports that return individual patient records.')}
            </p>

            <div className={styles.cardActions}>
              <Button
                  kind="primary"
                  size="lg"
                  renderIcon={List}
                  className={styles.cardButton}
                  onClick={() => navigate('/linelist')}
              >
                {t('viewLinelistReports', 'View linelist reports')}
              </Button>
            </div>
          </Tile>
          )}
        </div>
      </div>
  );
};

export default ReportBuilderLandingPage;

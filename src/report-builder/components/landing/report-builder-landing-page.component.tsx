import React from 'react';
import { Document, ChartColumn, Report, Play } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';

import Header from '../header/header.component';
import styles from './report-builder-landing-page.scss';

import LandingSectionCard from './landing-section-card.component';
import LandingActionList from './landing-action-list.component';
import LandingActionItem from './landing-action-item.component';
import LandingActivityList from './landing-activity-list.component';
import LandingFooterGrid from './landing-footer-grid.component';

const ReportBuilderLandingPage: React.FC = () => {
    const { t } = useTranslation();

    const recentIndicators = [
        { name: 'Malaria Cases (Base Indicator)', when: '2 hours ago' },
        { name: 'ART Patients by Age Group (Final Indicator)', when: 'Edited 1 day ago' },
    ];

    const savedReports = ['HMIS 105', 'Monthly OPD Summary', 'ART Program Summary'];

    return (
        <div className={styles.rbLanding}>
            <Header
                title={t('reportBuilderLanding', 'Reporting & Indicators')}
                subtitle={t('manageReports', 'Build reusable indicators. Assemble reports. Run with live data.')}
            />

            <div className={styles.rbLandingContainer}>
                <div className={styles.rbLandingGrid}>
                    {/* ✅ Indicators – WIRED */}
                    <LandingSectionCard title="Indicators" tone="blue" headerIcon={<ChartColumn />}>
                        <div className={styles.rbCardSection}>
                            <ChartColumn size={28} />
                            <div>
                                <p className={styles.rbCardSectionTitle}>Indicators</p>
                                <div className={styles.rbCardSectionHint}>Build and manage indicator logic.</div>
                            </div>
                        </div>

                        <div className={styles.rbDivider} />

                        <LandingActionList>
                            <LandingActionItem icon={<Document />} label="Create Base Indicator" to="/indicators?create=base" />
                            <LandingActionItem icon={<Document />} label="Create Composite Base Indicator" to="/indicators?create=composite" />
                            <LandingActionItem icon={<Document />} label="View Base Indicators" to="/indicators" />
                        </LandingActionList>
                    </LandingSectionCard>

                    {/* ✅ Reports – now includes Sections actions */}
                    <LandingSectionCard title="Reports" tone="green" headerIcon={<Report />}>
                        <div className={styles.rbCardSection}>
                            <Report size={28} />
                            <div>
                                <p className={styles.rbCardSectionTitle}>Reports</p>
                                <div className={styles.rbCardSectionHint}>Assemble indicators into reports.</div>
                            </div>
                        </div>

                        <div className={styles.rbDivider} />

                        <LandingActionList>
                            {/* Reports */}
                            <LandingActionItem icon={<Document />} label="Create Report" to="/new" />
                            <LandingActionItem icon={<Document />} label="View Reports" to="/reports" />

                            {/* Sections (NEW) */}
                            <LandingActionItem icon={<Document />} label="Create Section" to="/sections?create=1" />
                            <LandingActionItem icon={<Document />} label="View Sections" to="/sections" />
                        </LandingActionList>
                    </LandingSectionCard>

                    {/* Run Reports (still placeholder) */}
                    <LandingSectionCard title="Run Reports" tone="gold" headerIcon={<Play />}>
                        <div className={styles.rbCardSection}>
                            <Play size={28} />
                            <div>
                                <p className={styles.rbCardSectionTitle}>Run Reports</p>
                                <div className={styles.rbCardSectionHint}>Apply time &amp; location and view results.</div>
                            </div>
                        </div>

                        <div className={styles.rbDivider} />

                        <LandingActivityList recentIndicators={recentIndicators} savedReports={savedReports} />
                    </LandingSectionCard>
                </div>

                <LandingFooterGrid
                    onNavigate={(path) => {
                        // eslint-disable-next-line no-console
                        console.log('Navigate to:', path);
                    }}
                />
            </div>
        </div>
    );
};

export default ReportBuilderLandingPage;
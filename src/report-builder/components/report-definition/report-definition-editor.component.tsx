import React from 'react';
import { useTranslation } from 'react-i18next';

import styles from '../report-builder/report-builder.scss';

const ReportDefinition: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className={styles.designWorkspace}>
            <h3 className={styles.workspaceTitle}>{t('reportDefinition', 'Report definition')}</h3>

            <p className={styles.workspaceHint}>
                {t(
                    'definitionHint',
                    'This area will become the query builder environment for composing datasets/indicators used by the report.',
                )}
            </p>

            <div className={styles.designGrid}>
                <div className={styles.designLeft}>
                    <div className={styles.panel}>
                        <h4 className={styles.panelTitle}>{t('indicatorLibrary', 'Indicator library')}</h4>
                        <p className={styles.panelHint}>
                            {t('indicatorLibraryHint', 'Browse reusable indicators, datasets, and definitions.')}
                        </p>
                    </div>

                    <div className={styles.panel}>
                        <h4 className={styles.panelTitle}>{t('queryBuilder', 'Query builder')}</h4>
                        <p className={styles.panelHint}>
                            {t('queryBuilderHint', 'Build data queries independent of age and sex disaggregation.')}
                        </p>
                    </div>
                </div>

                <div className={styles.designRight}>
                    <div className={styles.panel}>
                        <h4 className={styles.panelTitle}>{t('definitionPreview', 'Definition preview')}</h4>
                        <p className={styles.panelHint}>
                            {t('definitionPreviewHint', 'Preview the definition outputs and how they bind to report indicators.')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportDefinition;
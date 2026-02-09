import React from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@carbon/react';
import { useTranslation } from 'react-i18next';

import Header from '../header/header.component';
import ReportDesignEditor from '../report-design/report-design-editor.component';

import ReportDefinition from '../report-definition/report-definition-editor.component';

import styles from './report-builder.scss';

/**
 * ReportBuilder
 * - Houses the two major work areas:
 *   1) Report definition (query builder environment)
 *   2) Report template (the JSON template builder we have been building)
 *
 * This component is the "workspace shell".
 */
const ReportBuilder: React.FC = () => {
    const { t } = useTranslation();
    const [activeIndex, setActiveIndex] = React.useState(0);

    return (
        <div className={styles.page}>
            <Header
                title={t('reportBuilder', 'Report builder')}
                subtitle={t('buildReport', 'Define reports and generate templates')}
                status={{ label: t('draft', 'Draft'), kind: 'warning' }}
            />

            <div className={styles.content}>
                <Tabs selectedIndex={activeIndex} onChange={({ selectedIndex }) => setActiveIndex(selectedIndex)}>
                    <TabList aria-label={t('reportBuilderTabs', 'Report builder tabs')}>
                        <Tab>{t('reportDefinition', 'Report Definition')}</Tab>
                        <Tab>{t('reportTemplate', 'Report Design')}</Tab>
                    </TabList>

                    <TabPanels>
                        <TabPanel>
                            <ReportDefinition />
                        </TabPanel>

                        <TabPanel>
                            <ReportDesignEditor />
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </div>
        </div>
    );
};

export default ReportBuilder;
import React from 'react';
import { ChevronRight, Document, Report } from '@carbon/icons-react';
import styles from './report-builder-landing-page.scss';

type RecentIndicator = { name: string; when: string };

type LandingActivityListProps = {
    recentIndicators: RecentIndicator[];
    savedReports: string[];
};

const cx = (...parts: Array<string | undefined | false>) => parts.filter(Boolean).join(' ');

const LandingActivityList: React.FC<LandingActivityListProps> = ({ recentIndicators, savedReports }) => {
    return (
        <div>
            <div className={styles.rbListSectionTitle}>Recent Activity</div>

            <div className={styles.rbListSubTitle}>Recently Edited Indicators</div>
            {recentIndicators.map((x) => (
                <div key={x.name} className={styles.rbListItem}>
                    <div className={styles.rbListLeft}>
                        <Document />
                        <div>
                            <div className={styles.rbListName}>{x.name}</div>
                            <div className={styles.rbListMeta}>{x.when}</div>
                        </div>
                    </div>
                    <ChevronRight />
                </div>
            ))}

            <div className={cx(styles.rbListSubTitle, styles.rbMt12)}>Saved Reports</div>
            {savedReports.map((r) => (
                <div key={r} className={styles.rbListItem}>
                    <div className={styles.rbListLeft}>
                        <Report />
                        <div className={styles.rbListName}>{r}</div>
                    </div>
                    <ChevronRight />
                </div>
            ))}
        </div>
    );
};

export default LandingActivityList;
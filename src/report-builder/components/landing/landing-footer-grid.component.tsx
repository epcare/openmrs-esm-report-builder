import React from 'react';
import { Button, Tag } from '@carbon/react';
import { Play, Time, Save, ChartColumn } from '@carbon/icons-react';

import styles from './report-builder-landing-page.scss';
import LandingSectionCard from './landing-section-card.component';
import LandingActionList from './landing-action-list.component';
import LandingActionItem from './landing-action-item.component';

type LandingFooterGridProps = {
    onNavigate: (path: string) => void;
};

const cx = (...parts: Array<string | undefined | false>) => parts.filter(Boolean).join(' ');

const LandingFooterGrid: React.FC<LandingFooterGridProps> = ({ onNavigate }) => {
    return (
        <div className={cx(styles.rbLandingGrid, styles.rbLandingGridBottom)}>
            <LandingSectionCard title="Indicators" tone="blue" headerIcon={<ChartColumn />}>
                <div className={styles.rbFooterActions}>
                    <Button size="sm" kind="secondary" renderIcon={Save} onClick={() => onNavigate('/indicators/save')}>
                        Save Indicator
                    </Button>
                    <Tag type="blue">Result: 124</Tag>
                </div>
            </LandingSectionCard>

            <LandingSectionCard title="Saved Reports" tone="gold" headerIcon={<Save />}>
                <LandingActionList>
                    <LandingActionItem icon={<Time />} label="Run a report" onClick={() => onNavigate('/run')} />
                    <LandingActionItem icon={<Time />} label="View recent runs" onClick={() => onNavigate('/runs')} />
                    <div className={styles.rbActionsRight}>
                        <Button size="sm" kind="primary" renderIcon={Play} onClick={() => onNavigate('/run')}>
                            Run a report
                        </Button>
                    </div>
                </LandingActionList>
            </LandingSectionCard>

            <div />
        </div>
    );
};

export default LandingFooterGrid;
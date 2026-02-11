import React from 'react';
import styles from './report-builder-landing-page.scss';

type LandingActionListProps = {
    children: React.ReactNode;
};

const LandingActionList: React.FC<LandingActionListProps> = ({ children }) => {
    return <div className={styles.rbActions}>{children}</div>;
};

export default LandingActionList;
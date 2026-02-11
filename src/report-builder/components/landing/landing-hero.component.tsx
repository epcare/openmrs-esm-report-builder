import React from 'react';
import styles from './report-builder-landing-page.scss';

type LandingHeroProps = {
    title: string;
    subtitle: string;
};

const LandingHero: React.FC<LandingHeroProps> = ({ title, subtitle }) => {
    return (
        <div className={styles.rbLandingHero}>
            <h2 className={styles.rbLandingTitle}>{title}</h2>
            <div className={styles.rbLandingSubtitle}>{subtitle}</div>
        </div>
    );
};

export default LandingHero;
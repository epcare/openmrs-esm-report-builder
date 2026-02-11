import React from 'react';
import styles from './report-builder-landing-page.scss';

export type CardTone = 'blue' | 'green' | 'gold';

const cx = (...parts: Array<string | undefined | false>) => parts.filter(Boolean).join(' ');

type LandingSectionCardProps = {
    title: string;
    tone: CardTone;
    headerIcon: React.ReactNode;
    children: React.ReactNode;
};

const toneClass: Record<CardTone, string> = {
    blue: styles.rbCardHeaderBlue,
    green: styles.rbCardHeaderGreen,
    gold: styles.rbCardHeaderGold,
};

const LandingSectionCard: React.FC<LandingSectionCardProps> = ({ title, tone, headerIcon, children }) => {
    return (
        <div className={styles.rbCard}>
            <div className={cx(styles.rbCardHeader, toneClass[tone])}>
                {headerIcon}
                <span>{title}</span>
            </div>
            <div className={styles.rbCardBody}>{children}</div>
        </div>
    );
};

export default LandingSectionCard;
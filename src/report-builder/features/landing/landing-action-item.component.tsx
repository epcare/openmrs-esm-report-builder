import React from 'react';
import { ChevronRight } from '@carbon/icons-react';
import { Link } from 'react-router-dom';

import styles from './report-builder-landing-page.scss';

type LandingActionItemBase = {
    icon: React.ReactNode;
    label: string;
};

type LandingActionItemLink = LandingActionItemBase & {
    to: string;
    onClick?: never;
};

type LandingActionItemButton = LandingActionItemBase & {
    onClick: () => void;
    to?: never;
};

export type LandingActionItemProps = LandingActionItemLink | LandingActionItemButton;

const LandingActionItem: React.FC<LandingActionItemProps> = (props) => {
    const content = (
        <>
            <div className={styles.rbActionLeft}>
                {props.icon}
                <span className={styles.rbActionLabel}>{props.label}</span>
            </div>
            <ChevronRight />
        </>
    );

    if ('to' in props) {
        return (
            <Link className={styles.rbAction} to={props.to}>
                {content}
            </Link>
        );
    }

    return (
        <button className={styles.rbAction} type="button" onClick={props.onClick}>
            {content}
        </button>
    );
};

export default LandingActionItem;
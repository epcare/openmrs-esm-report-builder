import React from 'react';
import {
    Button,
    InlineLoading,
    InlineNotification,
    Tile,
} from '@carbon/react';
import { Renew as Refresh, WarningFilled } from '@carbon/icons-react';
import styles from './etl-monitor-card-shell.scss';

/**
 * Card Shell Component - Reusable wrapper for ETL monitor cards
 * Provides consistent header, loading/error states, and refresh action
 */
interface ETLMonitorCardShellProps {
    title: string;
    children: React.ReactNode;
    loading?: boolean;
    error?: string;
    onRefresh?: () => void;
    refreshDisabled?: boolean;
    extraActions?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

export default function ETLMonitorCardShell({
    title,
    children,
    loading = false,
    error,
    onRefresh,
    refreshDisabled = false,
    extraActions,
    size = 'md',
}: ETLMonitorCardShellProps) {
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    const handleRefresh = async () => {
        if (!onRefresh || isRefreshing || refreshDisabled) return;
        setIsRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <Tile className={`${styles['etl-monitor-card-shell']} ${styles[`etl-monitor-card-shell--${size}`]}`}>
            {/* Card Header */}
            <div className={styles['etl-monitor-card-shell__header']}>
                <h4 className={styles['etl-monitor-card-shell__title']}>{title}</h4>
                <div className={styles['etl-monitor-card-shell__actions']}>
                    {extraActions}
                    {onRefresh && (
                        <Button
                            kind="ghost"
                            size="sm"
                            renderIcon={Refresh}
                            iconDescription="Refresh"
                            hasIconOnly
                            onClick={handleRefresh}
                            disabled={refreshDisabled || isRefreshing || loading}
                        />
                    )}
                </div>
            </div>

            {/* Card Content */}
            <div className={styles['etl-monitor-card-shell__content']}>
                {/* Loading State */}
                {loading && (
                    <div className={styles['etl-monitor-card-shell__loading']}>
                        <InlineLoading description="Loading..." />
                    </div>
                )}

                {/* Error State */}
                {!loading && error && (
                    <div className={styles['etl-monitor-card-shell__error']}>
                        <InlineNotification
                            lowContrast
                            kind="error"
                            title="Error"
                            subtitle={error}
                            hideCloseButton
                        />
                        {onRefresh && (
                            <Button
                                size="sm"
                                kind="secondary"
                                renderIcon={Refresh}
                                onClick={handleRefresh}
                                style={{ marginTop: '1rem' }}
                            >
                                Retry
                            </Button>
                        )}
                    </div>
                )}

                {/* Normal Content */}
                {!loading && !error && children}
            </div>
        </Tile>
    );
}

/**
 * Loading Skeleton for card content
 */
export function CardSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const skeletonLines = size === 'sm' ? 2 : size === 'md' ? 3 : 4;

    return (
        <div className={styles['etl-monitor-card-shell__skeleton']}>
            {Array.from({ length: skeletonLines }).map((_, i) => (
                <div key={i} className={styles['etl-monitor-card-shell__skeleton-line']} />
            ))}
        </div>
    );
}

/**
 * Empty State for card content
 */
export function CardEmptyState({
    icon,
    message,
    description,
}: {
    icon?: React.ReactNode;
    message: string;
    description?: string;
}) {
    return (
        <div className={styles['etl-monitor-card-shell__empty']}>
            {icon || <WarningFilled size={32} />}
            <p className={styles['etl-monitor-card-shell__empty-message']}>{message}</p>
            {description && (
                <p className={styles['etl-monitor-card-shell__empty-description']}>{description}</p>
            )}
        </div>
    );
}

/**
 * Relationships tab — honest empty state: the report builder API does not
 * expose foreign-key metadata for ETL tables.
 */

import React from 'react';
import { Information } from '@carbon/react/icons';
import styles from './etl-browser.component.scss';

export default function RelationshipsTab() {
    return (
        <div className={styles.emptyState}>
            <Information size={28} />
            <h5>Relationships aren&apos;t available yet</h5>
            <p>
                The report builder API doesn&apos;t expose foreign-key metadata for ETL tables. Column-level hints
                (e.g. columns ending in <code>_id</code>) may still be visible in the Columns tab.
            </p>
        </div>
    );
}

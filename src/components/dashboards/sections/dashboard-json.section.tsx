/**
 * Dashboard JSON Section
 * Raw configJson editor: a draft textarea with Apply/Reset, validated by
 * the shared config schema helpers before it replaces the structured form
 * state.
 */

import React from 'react';
import { Button, Stack, TextArea } from '@carbon/react';
import type { DashboardConfigV1 } from '../../../types/dashboard/dashboard.types';
import { parseDashboardConfigJson } from '../dashboard-config.schema';
import styles from '../dashboards-admin.scss';

interface DashboardJsonSectionProps {
    config: DashboardConfigV1;
    onChange: (config: DashboardConfigV1) => void;
    onErrors: (errors: string[]) => void;
}

export default function DashboardJsonSection({ config, onChange, onErrors }: DashboardJsonSectionProps) {
    const [draft, setDraft] = React.useState(() => JSON.stringify(config, null, 2));
    const [dirty, setDirty] = React.useState(false);
    const [localErrors, setLocalErrors] = React.useState<string[]>([]);

    const apply = () => {
        const parsed = parseDashboardConfigJson(draft);
        setLocalErrors(parsed.errors);
        onErrors(parsed.errors);
        if (parsed.errors.length === 0 && parsed.config) {
            onChange(parsed.config);
            setDraft(JSON.stringify(parsed.config, null, 2));
            setDirty(false);
        }
    };

    const reset = () => {
        setDraft(JSON.stringify(config, null, 2));
        setLocalErrors([]);
        setDirty(false);
    };

    return (
        <fieldset>
            <legend>Configuration JSON</legend>
            <Stack gap={3}>
                <span className={styles['dashboard-editor__hint']}>
                    Advanced: edit the raw dashboard configuration. Apply validates and syncs the editors above.
                </span>
                <TextArea
                    id="dashboard-json-draft"
                    labelText="configJson"
                    hideLabel
                    rows={12}
                    className={styles['dashboard-json-editor__draft']}
                    value={dirty ? draft : JSON.stringify(config, null, 2)}
                    onChange={(e) => {
                        setDraft(e.target.value);
                        setDirty(true);
                    }}
                />
                {localErrors.length > 0 && (
                    <ul className={styles['dashboard-form-modal__errors']}>
                        {localErrors.map((error, i) => (
                            <li key={i}>{error}</li>
                        ))}
                    </ul>
                )}
                <div className={styles['dashboard-editor__row-actions']}>
                    <Button kind="ghost" size="sm" onClick={reset} disabled={!dirty}>
                        Reset
                    </Button>
                    <Button kind="primary" size="sm" onClick={apply} disabled={!dirty}>
                        Apply
                    </Button>
                </div>
            </Stack>
        </fieldset>
    );
}

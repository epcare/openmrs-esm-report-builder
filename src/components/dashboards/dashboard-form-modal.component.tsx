/**
 * Dashboard Form Modal
 * Create/edit modal for ReportBuilderDashboard. Owns the basics + the
 * structured DashboardConfigV1 (sections / widgets / auto-include / raw
 * JSON tab) and serialises it into configJson on save.
 */

import React from 'react';
import { Button, ComposedModal, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import type { DashboardConfigV1, DashboardDto, DashboardType } from '../../types/dashboard/dashboard.types';
import { parseDashboardConfig } from '../../features/dashboards/utils/dashboard-config.util';
import { createEmptyConfig, validateDashboardConfig, CODE_PATTERN } from './dashboard-config.schema';
import DashboardBasicsSection from './sections/dashboard-basics.section';
import DashboardSectionsEditorSection from './sections/dashboard-sections-editor.section';
import DashboardWidgetsEditorSection from './sections/dashboard-widgets-editor.section';
import DashboardAutoIncludeSection from './sections/dashboard-autoinclude.section';
import DashboardJsonSection from './sections/dashboard-json.section';
import styles from './dashboards-admin.scss';

export interface DashboardFormState {
    name: string;
    code: string;
    description: string;
    dashboardType: DashboardType;
    active: boolean;
    sortOrder: number;
    config: DashboardConfigV1;
}

function stateFromDashboard(dashboard: DashboardDto | null): DashboardFormState {
    if (!dashboard) {
        return {
            name: '',
            code: '',
            description: '',
            dashboardType: 'CUSTOM',
            active: true,
            sortOrder: 0,
            config: createEmptyConfig(),
        };
    }

    const parsed = parseDashboardConfig(dashboard.configJson);
    return {
        name: dashboard.name ?? '',
        code: dashboard.code ?? '',
        description: dashboard.description ?? '',
        dashboardType: dashboard.dashboardType ?? 'CUSTOM',
        active: dashboard.active !== false,
        sortOrder: dashboard.sortOrder ?? 0,
        config: parsed.config ?? createEmptyConfig(),
    };
}

interface DashboardFormModalProps {
    open: boolean;
    mode: 'create' | 'edit';
    initial: DashboardDto | null;
    onClose: () => void;
    onSave: (payload: Omit<DashboardDto, 'uuid' | 'retired' | 'dateCreated' | 'dateChanged'>) => Promise<void>;
}

export default function DashboardFormModal({ open, mode, initial, onClose, onSave }: DashboardFormModalProps) {
    const [form, setForm] = React.useState<DashboardFormState>(() => stateFromDashboard(initial));
    const [errors, setErrors] = React.useState<string[]>([]);
    const [saving, setSaving] = React.useState(false);

    // Re-seed the form each time the modal opens for a different dashboard
    React.useEffect(() => {
        if (open) {
            setForm(stateFromDashboard(initial));
            setErrors([]);
            setSaving(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initial?.uuid]);

    const patch = (updates: Partial<DashboardFormState>) => setForm((prev) => ({ ...prev, ...updates }));
    const patchConfig = (config: DashboardConfigV1) => setForm((prev) => ({ ...prev, config }));

    const validate = (): string[] => {
        const found: string[] = [];
        if (!form.name.trim()) found.push('Name is required');
        if (form.code.trim() && !CODE_PATTERN.test(form.code.trim())) {
            found.push('Code must be lowercase letters, numbers and dashes');
        }
        found.push(...validateDashboardConfig(form.config));
        return found;
    };

    const handleSave = async () => {
        const validation = validate();
        if (validation.length > 0) {
            setErrors(validation);
            return;
        }

        setSaving(true);
        setErrors([]);
        try {
            await onSave({
                name: form.name.trim(),
                code: form.code.trim() || undefined,
                description: form.description.trim() || undefined,
                dashboardType: form.dashboardType,
                active: form.active,
                sortOrder: form.sortOrder,
                configJson: JSON.stringify(form.config),
            });
        } catch (e: any) {
            setErrors([e?.message ?? 'Failed to save dashboard']);
        } finally {
            setSaving(false);
        }
    };

    return (
        <ComposedModal open={open} onClose={() => !saving && onClose()} size="lg">
            <ModalHeader
                title={mode === 'create' ? 'New Dashboard' : 'Edit Dashboard'}
                label="Dashboards"
            />
            <ModalBody hasForm>
                <div className={styles['dashboard-form-modal__body']}>
                    {errors.length > 0 && (
                        <ul className={styles['dashboard-form-modal__errors']}>
                            {errors.map((error, i) => (
                                <li key={i}>{error}</li>
                            ))}
                        </ul>
                    )}

                    <DashboardBasicsSection form={form} onChange={patch} />
                    <DashboardSectionsEditorSection config={form.config} onChange={patchConfig} />
                    <DashboardWidgetsEditorSection config={form.config} onChange={patchConfig} />
                    <DashboardAutoIncludeSection config={form.config} onChange={patchConfig} />
                    <DashboardJsonSection config={form.config} onChange={patchConfig} onErrors={setErrors} />
                </div>
            </ModalBody>
            <ModalFooter onRequestClose={() => !saving && onClose()}>
                <Button kind="secondary" onClick={() => !saving && onClose()}>
                    Cancel
                </Button>
                <Button kind="primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Dashboard'}
                </Button>
            </ModalFooter>
        </ComposedModal>
    );
}

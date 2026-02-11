import React from 'react';
import { Button, CopyButton, Stack, TextArea, TextInput } from '@carbon/react';
import { useTranslation } from 'react-i18next';

import styles from './report-builder.scss';

export type ReportDetailModel = {
    name: string;
    description: string;
    uuid: string;
};

type Props = {
    value?: ReportDetailModel;
    onChange?: (next: ReportDetailModel) => void;

    onCancel?: () => void;
    onSaveDraft?: () => void;
    isSaving?: boolean;
};

const buildDefaultModel = (): ReportDetailModel => ({
    name: 'OPD Summary',
    description: 'A summary of outpatient department attendance...',
    uuid: crypto.randomUUID(),
});

const ReportDetail: React.FC<Props> = ({ value, onChange, onCancel, onSaveDraft, isSaving }) => {
    const { t } = useTranslation();

    const [local, setLocal] = React.useState<ReportDetailModel>(() => value ?? buildDefaultModel());

    // keep local in sync if parent supplies value later
    React.useEffect(() => {
        if (value) setLocal(value);
    }, [value]);

    const set = (patch: Partial<ReportDetailModel>) => {
        const next = { ...local, ...patch };
        setLocal(next);
        onChange?.(next);
    };

    return (
        <div className={styles.designWorkspace}>
            <h3 className={styles.workspaceTitle}>{t('reportDetails', 'Report Details')}</h3>
            <p className={styles.workspaceHint}>
                {t('reportDetailsHint', 'Provide minimum report information such as name and description.')}
            </p>

            <div className={styles.panel}>
                <Stack gap={6} style={{ marginTop: '0.75rem', maxWidth: '64rem' }}>
                    <TextInput
                        id="rb-report-name"
                        labelText={
                            <>
                                {t('name', 'Name')} <span style={{ color: 'var(--cds-support-error, #da1e28)' }}>*</span>
                            </>
                        }
                        value={local.name}
                        onChange={(e) => set({ name: (e.target as HTMLInputElement).value })}
                    />

                    <TextArea
                        id="rb-report-description"
                        labelText={t('description', 'Description')}
                        value={local.description}
                        onChange={(e) => set({ description: (e.target as HTMLTextAreaElement).value })}
                        rows={4}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                        <TextInput id="rb-report-uuid" labelText={t('uuid', 'UUID')} value={local.uuid} readOnly />

                        <CopyButton
                            iconDescription={t('copyUuid', 'Copy UUID')}
                            feedback={t('copied', 'Copied')}
                            feedbackTimeout={1500}
                            onClick={() => {
                                if (local.uuid) void navigator.clipboard?.writeText(local.uuid);
                            }}
                        />
                    </div>
                </Stack>

                {/* Footer actions like the screenshot */}
                <div
                    style={{
                        marginTop: '1.25rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.75rem',
                    }}
                >
                    <Button kind="secondary" onClick={onCancel}>
                        {t('cancel', 'Cancel')}
                    </Button>

                    <Button
                        kind="primary"
                        onClick={onSaveDraft}
                        disabled={!local.name.trim() || isSaving}
                    >
                        {t('saveDraft', 'Save Draft')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ReportDetail;
import React from 'react';
import {Button, ButtonSet} from '@carbon/react';
import {Download, Save, View} from '@carbon/icons-react';
import {useTranslation} from 'react-i18next';

type Props = {
    onSave?: () => void;
    onPreview?: () => void;
    onExport?: () => void;
    saving?: boolean;
    disabled?: boolean;
};

export default function BuilderHeaderActions({
                                                 onSave,
                                                 onPreview,
                                                 onExport,
                                                 saving = false,
                                                 disabled = false,
                                             }: Props) {
    const {t} = useTranslation();

    return (
        <ButtonSet>
            <Button kind="secondary" size="md" renderIcon={Save} onClick={onSave} disabled={disabled || saving}>
                {saving ? t('saving', 'Saving…') : t('save', 'Save')}
            </Button>

            <Button kind="secondary" size="md" renderIcon={View} onClick={onPreview} disabled={disabled}>
                {t('preview', 'Preview')}
            </Button>

            <Button kind="primary" size="md" renderIcon={Download} onClick={onExport} disabled={disabled}>
                {t('export', 'Export')}
            </Button>
        </ButtonSet>
    );
}
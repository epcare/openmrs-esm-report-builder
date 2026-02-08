import React from 'react';
import { Button } from '@carbon/react';
import { Download, Save, View } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';
import styles from '../../report-template-builder.scss';

type Props = {
  onSave?: () => void;
  onPreview?: () => void;
  onExport?: () => void;

  saving?: boolean;
  disabled?: boolean;
};

export default function BuilderHeaderActions({ onSave, onPreview, onExport, saving = false, disabled = false }: Props) {
  const { t } = useTranslation();

  return (
    <div className={styles.headerActions}>
    <br/>
      <Button kind="secondary" size="sm" renderIcon={Save} onClick={onSave} disabled={disabled || saving}>
        {saving ? t('saving', 'Saving…') : t('save', 'Save')}
      </Button>

      <Button kind="secondary" size="sm" renderIcon={View} onClick={onPreview} disabled={disabled}>
        {t('preview', 'Preview')}
      </Button>

      <Button kind="primary" size="sm" renderIcon={Download} onClick={onExport} disabled={disabled}>
        {t('export', 'Export')}
      </Button>
    </div>
  );
}

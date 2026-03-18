import React from 'react';
import { Tile, Toggle } from '@carbon/react';
import { useTranslation } from 'react-i18next';

import styles from './mapping-preview-panel.scss';

type Props = {
  title?: string;

  // Controlled toggle state
  zerosMode: boolean;
  onToggleZerosMode: (value: boolean) => void;

  // Row label (selected indicator)
  rowLabel?: string;

  // Column headers (disaggregation preview)
  headers?: string[];

  // Sample values (same length as headers)
  sampleValues?: number[];

  // Optional: allow parent to pass className for sizing
  className?: string;
};

export default function MappingPreviewPanel({
  title,
  zerosMode,
  onToggleZerosMode,
  rowLabel,
  headers = ['Age <5 | Male', 'Age <5 | Female', '5-14 | Male', '5-14 | Female'],
  sampleValues = [120, 80, 75, 60],
  className,
}: Props) {
  const { t } = useTranslation();

  const safeValues = headers.map((_, i) => sampleValues[i] ?? 0);

  return (
    <Tile className={`${styles.tile} ${className ?? ''}`}>
      <div className={styles.tileHeaderRow}>
        <h3 className={styles.tileTitle}>{title ?? t('mappingPreview', 'Mapping Preview')}</h3>

        <div className={styles.previewControls}>
          <Toggle
            id="zerosMode"
            labelText=""
            hideLabel
            labelA={t('sampleValues', 'Sample Values')}
            labelB={t('zerosMode', 'Zeros Mode')}
            toggled={zerosMode}
            onToggle={onToggleZerosMode}
            size="sm"
          />
        </div>
      </div>

      <div className={styles.previewTableWrap}>
        <table className={styles.previewTable}>
          <thead>
            <tr>
              <th />
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            <tr>
              <td className={styles.previewRowLabel}>{rowLabel ?? 'EP01A. Malaria Cases'}</td>
              {safeValues.map((v, i) => (
                <td key={i}>{zerosMode ? 0 : v}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Tile>
  );
}

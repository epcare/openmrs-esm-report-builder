import React from 'react';
import styles from '../../report-builder.scss';

type BuilderShellProps = {
  header: React.ReactNode;
  left: React.ReactNode;
  rightTop: React.ReactNode;
  rightBottom: React.ReactNode;
};

export function BuilderShell({ header, left, rightTop, rightBottom }: BuilderShellProps) {
  return (
    <div className={styles.builderShell}>
      <div className={styles.headerRow}>{header}</div>

      <div className={styles.mainGrid}>
        <aside className={styles.leftPane}>{left}</aside>

        <section className={styles.rightPane}>
          <div className={styles.rightTop}>{rightTop}</div>
          <div className={styles.rightBottom}>{rightBottom}</div>
        </section>
      </div>
    </div>
  );
}
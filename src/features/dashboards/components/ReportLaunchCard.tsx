/**
 * Report Launch Card
 * REPORT widget rendering: report name/description/category + an
 * "Open in Run Reports" action. Not a live render — a launch point.
 */

import React from 'react';
import { Button, Tag, Tile } from '@carbon/react';
import { ArrowRight, Document } from '@carbon/icons-react';
import { useNavigate } from 'react-router-dom';
import type { ReportDto } from '../../../resources/report/reports.api';
import styles from '../dashboards.scss';

interface ReportLaunchCardProps {
  title: string;
  report?: ReportDto;
}

export function ReportLaunchCard({ title, report }: ReportLaunchCardProps) {
  const navigate = useNavigate();

  return (
    <Tile className={styles['report-launch-card']}>
      <div className={styles['report-launch-card__header']}>
        <span className={styles['report-launch-card__icon']}>
          <Document size={20} />
        </span>
        <h4 className={styles['report-launch-card__title']}>{title}</h4>
      </div>
      {report?.description && (
        <p className={styles['report-launch-card__description']}>{report.description}</p>
      )}
      <div className={styles['report-launch-card__footer']}>
        <div className={styles['report-launch-card__tags']}>
          {report?.reportType && <Tag size="sm" type="blue">{report.reportType}</Tag>}
          {report?.code && <Tag size="sm" type="gray">{report.code}</Tag>}
        </div>
        <Button
          size="sm"
          kind="primary"
          renderIcon={ArrowRight}
          onClick={() => navigate('/run')}
        >
          Open in Run Reports
        </Button>
      </div>
    </Tile>
  );
}

export default ReportLaunchCard;

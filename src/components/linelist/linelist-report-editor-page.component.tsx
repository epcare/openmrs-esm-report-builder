/**
 * Linelist Report Editor Page
 *
 * Page component for creating and editing linelist reports.
 * Wraps the LinelistReportBuilderModal in a page layout.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button, InlineNotification } from '@carbon/react';
import { ArrowLeft } from '@carbon/react/icons';
import { useNavigate, useParams } from 'react-router-dom';

import LinelistReportBuilderModal from './linelist-report-builder-modal.component';
import {
  getLinelistReport,
} from '../../resources/linelist/linelist-reports.api';
import type { LinelistReportDto } from '../../types/linelist-types';

import styles from './linelist-report-editor-page.scss';

type Props = {};

const LinelistReportEditorPage: React.FC<Props> = () => {
  const navigate = useNavigate();
  const { reportId } = useParams();

  const [modalOpen, setModalOpen] = useState(true);
  const [initialReport, setInitialReport] = useState<LinelistReportDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  /**
   * Load report for editing
   */
  useEffect(() => {
    if (reportId && reportId !== 'new') {
      setLoading(true);
      setError(null);

      getLinelistReport(reportId)
        .then((report) => {
          setInitialReport(report);
          setMode('edit');
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load report');
        })
        .finally(() => setLoading(false));
    } else {
      setMode('create');
      setInitialReport(null);
      setLoading(false);
    }
  }, [reportId]);

  /**
   * Handle close
   */
  const handleClose = useCallback(() => {
    setModalOpen(false);
    navigate('/linelist');
  }, [navigate]);

  /**
   * Handle save
   */
  const handleSaved = useCallback(() => {
    setModalOpen(false);
    navigate('/linelist');
  }, [navigate]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading report...</div>
      </div>
    );
  }

  if (error && !initialReport) {
    return (
      <div className={styles.page}>
        <InlineNotification kind="error" title="Error" subtitle={error} />
        <Button kind="secondary" renderIcon={ArrowLeft} onClick={() => navigate('/linelist')}>
          Back to Linelist Reports
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button kind="ghost" renderIcon={ArrowLeft} onClick={() => navigate('/linelist')}>
          Back to Linelist Reports
        </Button>
        <h1 className={styles.title}>
          {mode === 'create' ? 'Create Linelist Report' : 'Edit Linelist Report'}
        </h1>
      </div>

      <LinelistReportBuilderModal
        open={modalOpen}
        mode={mode}
        initialReport={initialReport}
        onClose={handleClose}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default LinelistReportEditorPage;

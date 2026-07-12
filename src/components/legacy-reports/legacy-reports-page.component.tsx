import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  TextInput,
  Tile,
  InlineLoading,
  InlineNotification,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
} from '@carbon/react';
import { Information, Add } from '@carbon/icons-react';

import Header from '../shared/header/header.component';
import LegacyReportsTable, { type LegacyReportRow } from './legacy-reports-table.component';
import { listLegacyReports } from '../../resources/legacy-reports/legacy-reports.api';
import LegacyReportUploadModal from './legacy-report-upload-modal.component';

const LegacyReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [search, setSearch] = React.useState('');
  const [reports, setReports] = React.useState<LegacyReportRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = React.useState(false);

  // Load reports on mount
  React.useEffect(() => {
    const ac = new AbortController();

    setLoading(true);
    setError(null);

    listLegacyReports({}, ac.signal)
      .then((data) => {
        const mappedData = data.map((r) => ({
          uuid: r.uuid,
          key: r.key,
          name: r.name,
          description: r.description,
          status: r.status,
          datasetsCount: r.datasets?.length ?? 0,
          parametersCount: r.parameters?.length ?? 0,
        }));
        setReports(mappedData);

        // Show welcome modal if no reports exist
        if (mappedData.length === 0) {
          setShowWelcomeModal(true);
        }
      })
      .catch((err) => {
        setError(err?.message ?? 'Failed to load legacy reports');
        setReports([]);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => ac.abort();
  }, []);

  const filteredReports = React.useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.key.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)),
    );
  }, [search, reports]);

  const handleUploadClick = () => {
    setShowUploadModal(true);
    setShowWelcomeModal(false);
  };

  const handleUploadComplete = (newReport: LegacyReportRow) => {
    setReports((prev) => [...prev, newReport]);
    setShowUploadModal(false);
  };

  const handleViewReport = (uuid: string) => {
    navigate(`/legacy-reports/${uuid}`);
  };

  const handleImportReport = (uuid: string) => {
    // For now, just navigate to the report detail page
    // In the future, this would trigger the import process
    navigate(`/legacy-reports/${uuid}/import`);
  };

  const handleEditReport = (uuid: string) => {
    navigate(`/legacy-reports/${uuid}/edit`);
  };

  const handleCreateNew = () => {
    navigate('/legacy-reports/new/edit');
  };

  const handleDeleteReport = (uuid: string) => {
    if (confirm('Are you sure you want to delete this legacy report?')) {
      setReports((prev) => prev.filter((r) => r.uuid !== uuid));
    }
  };

  if (loading) {
    return (
      <div>
        <Header
          title={t('legacyReports', 'Legacy Reports')}
          subtitle={t('legacyReportsSubtitle', 'Manage and import legacy reports into the report builder')}
        />
        <InlineLoading description="Loading legacy reports..." />
      </div>
    );
  }

  return (
    <div>
      <Header
        title={t('legacyReports', 'Legacy Reports')}
        subtitle={t('legacyReportsSubtitle', 'Manage and import legacy reports into the report builder')}
      />

      {error ? (
        <InlineNotification kind="error" title="Error" subtitle={error} style={{ marginBottom: '1rem' }} />
      ) : null}

      <Tile style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <Information size={20} style={{ marginTop: '2px' }} />
          <div>
            <strong>What are legacy reports?</strong>
            <p style={{ margin: '0.5rem 0', opacity: 0.85 }}>
              Legacy reports are existing report configurations that can be imported into the new report builder.
              Upload JSON configuration files to import and modernize your existing reports.
            </p>
          </div>
        </div>
      </Tile>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <TextInput
          id="search-reports"
          labelText=""
          placeholder="Search reports by name, key, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <Button kind="primary" renderIcon={Add} onClick={handleCreateNew}>
          Create New Report
        </Button>
      </div>

      <LegacyReportsTable
        rows={filteredReports}
        onUpload={handleUploadClick}
        onView={handleViewReport}
        onEdit={handleEditReport}
        onImport={handleImportReport}
        onDelete={handleDeleteReport}
      />

      <LegacyReportUploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onComplete={handleUploadComplete}
      />

      {/* Welcome Modal */}
      <Modal
        open={showWelcomeModal}
        onRequestClose={() => setShowWelcomeModal(false)}
        modalHeading="Welcome to Legacy Reports"
        passiveModal
        size="sm"
      >
        <ModalBody>
          <p>
            You haven't uploaded any legacy reports yet. Legacy reports are existing report configurations that can
            be imported into the new report builder.
          </p>
          <p>
            Upload your JSON configuration files to get started with importing and modernizing your existing reports.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button kind="primary" onClick={handleUploadClick}>
            Upload Your First Legacy Report
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default LegacyReportsPage;

import React from 'react';
import {
  Modal,
  ModalBody,
  ModalFooter,
  Button,
  FileUploader,
  FileUploaderDropContainer,
  FileUploaderItem,
  ProgressBar,
  InlineLoading,
  InlineNotification,
  Tag,
  StructuredListBody,
  StructuredListRow,
  StructuredListCell,
  Tile,
  Accordion,
  AccordionItem,
} from '@carbon/react';
import { Information, Checkmark, Warning } from '@carbon/icons-react';

import { uploadLegacyReport, importLegacyReport, type UploadLegacyReportResponse } from '../../resources/legacy-reports/legacy-reports.api';
import type { LegacyReportRow } from './legacy-reports-table.component';

type Props = {
  open: boolean;
  onClose: () => void;
  onComplete: (report: LegacyReportRow) => void;
};

type UploadState = {
  file: File | null;
  uploading: boolean;
  uploadResult: UploadLegacyReportResponse | null;
  importResult: any | null;
  error: string | null;
  showDetails: boolean;
};

function LegacyReportUploadModal({ open, onClose, onComplete }: Props) {
  const [state, setState] = React.useState<UploadState>({
    file: null,
    uploading: false,
    uploadResult: null,
    importResult: null,
    error: null,
    showDetails: false,
  });

  const [uploadProgress, setUploadProgress] = React.useState(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.json')) {
      setState((prev) => ({ ...prev, file, error: null, uploadResult: null }));
    } else {
      setState((prev) => ({
        ...prev,
        file: null,
        error: 'Please select a valid JSON file',
      }));
    }
  };

  const handleUpload = async () => {
    if (!state.file) return;

    setState((prev) => ({ ...prev, uploading: true, error: null, uploadResult: null, importResult: null }));
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await uploadLegacyReport(state.file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setState((prev) => ({ ...prev, uploadResult: result, uploading: false }));

      if (!result.success) {
        setState((prev) => ({ ...prev, error: result.error || 'Upload failed' }));
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        uploading: false,
        error: error?.message || 'Failed to upload file',
      }));
    }
  };

  const handleImport = async () => {
    if (!state.uploadResult?.tempFilePath) return;

    setState((prev) => ({ ...prev, uploading: true, error: null }));

    try {
      const result = await importLegacyReport(
        state.uploadResult.tempFilePath,
        state.uploadResult.reportName || 'Unknown Report',
      );

      setState((prev) => ({ ...prev, importResult: result, uploading: false }));

      if (result.success) {
        // Create a new report row to add to the table
        const newReport: LegacyReportRow = {
          uuid: result.reportDefinitionUuid || crypto.randomUUID(),
          key: state.uploadResult.reportKey || 'unknown',
          name: result.reportName || state.uploadResult.reportName || 'Unknown Report',
          description: state.uploadResult.description,
          status: 'Imported',
          datasetsCount: state.uploadResult.datasets?.length || 0,
          parametersCount: state.uploadResult.parameters?.length || 0,
        };

        onComplete(newReport);
        handleClose();
      } else {
        setState((prev) => ({ ...prev, error: result.error || 'Import failed' }));
      }
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        uploading: false,
        error: error?.message || 'Failed to import report',
      }));
    }
  };

  const handleClose = () => {
    setState({
      file: null,
      uploading: false,
      uploadResult: null,
      importResult: null,
      error: null,
      showDetails: false,
    });
    setUploadProgress(0);
    onClose();
  };

  const canUpload = Boolean(state.file && !state.uploading && !state.uploadResult);
  const canImport = Boolean(state.uploadResult?.success && !state.uploading && !state.importResult?.success);
  const showSuccess = state.importResult?.success;

  return (
    <Modal open={open} onRequestClose={handleClose} modalHeading="Upload Legacy Report" size="lg">
      <ModalBody>
        {state.error ? (
          <InlineNotification kind="error" title="Error" subtitle={state.error} style={{ marginBottom: '1rem' }} />
        ) : null}

        {showSuccess ? (
          <InlineNotification
            kind="success"
            title="Success"
            subtitle="Legacy report imported successfully into the report builder"
            style={{ marginBottom: '1rem' }}
          />
        ) : null}

        {!state.uploadResult && !state.importResult?.success && (
          <div style={{ marginBottom: '1rem' }}>
            <FileUploader
              labelDescription="Select a JSON file containing legacy report configuration"
              labelTitle="Upload JSON configuration"
              buttonLabel="Add file"
              filenameStatus="edit"
              accept={['.json']}
              multiple={false}
              onChange={handleFileChange}
              disabled={state.uploading}
            />
          </div>
        )}

        {state.uploading && (
          <div style={{ marginBottom: '1rem' }}>
            <ProgressBar label="Uploading and validating..." value={uploadProgress} />
          </div>
        )}

        {state.uploadResult?.success && !state.importResult?.success && (
          <div>
            <Tile style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Checkmark size={20} style={{ color: 'var(--cds-support-success)' }} />
                <strong>File validated successfully</strong>
              </div>
              <p style={{ margin: '0.5rem 0', opacity: 0.85 }}>
                The JSON file has been parsed and validated. Review the report details below before importing.
              </p>
            </Tile>

            <StructuredListBody>
              <StructuredListRow>
                <StructuredListCell>Report Key</StructuredListCell>
                <StructuredListCell>
                  <code>{state.uploadResult.reportKey}</code>
                </StructuredListCell>
              </StructuredListRow>

              <StructuredListRow>
                <StructuredListCell>Report Name</StructuredListCell>
                <StructuredListCell>
                  <strong>{state.uploadResult.reportName}</strong>
                </StructuredListCell>
              </StructuredListRow>

              <StructuredListRow>
                <StructuredListCell>Description</StructuredListCell>
                <StructuredListCell>{state.uploadResult.description || '—'}</StructuredListCell>
              </StructuredListRow>

              <StructuredListRow>
                <StructuredListCell>Status</StructuredListCell>
                <StructuredListCell>
                  <Tag type="blue">{state.uploadResult.status}</Tag>
                </StructuredListCell>
              </StructuredListRow>

              <StructuredListRow>
                <StructuredListCell>Parameters</StructuredListCell>
                <StructuredListCell>{state.uploadResult.parameters?.length || 0} defined</StructuredListCell>
              </StructuredListRow>

              <StructuredListRow>
                <StructuredListCell>Datasets</StructuredListCell>
                <StructuredListCell>{state.uploadResult.datasets?.length || 0} defined</StructuredListCell>
              </StructuredListRow>

              <StructuredListRow>
                <StructuredListCell>Designs</StructuredListCell>
                <StructuredListCell>{state.uploadResult.designs?.length || 0} defined</StructuredListCell>
              </StructuredListRow>
            </StructuredListBody>

            <div style={{ marginTop: '1rem' }}>
              <Accordion>
                <AccordionItem title="View JSON Configuration">
                  <pre
                    style={{
                      background: 'var(--cds-field-01)',
                      padding: '1rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      maxHeight: '300px',
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(state.uploadResult.jsonTemplateConfig, null, 2)}
                  </pre>
                </AccordionItem>
              </Accordion>
            </div>

            {state.uploadResult.errors && state.uploadResult.errors.length > 0 && (
              <Tile style={{ marginTop: '1rem', background: 'var(--cds-background-warning)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Warning size={20} />
                  <strong>Warnings</strong>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  {state.uploadResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Tile>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button kind="secondary" onClick={handleClose} disabled={state.uploading}>
          {showSuccess ? 'Close' : 'Cancel'}
        </Button>

        {!showSuccess && (
          <>
            {canImport ? (
              <Button kind="primary" onClick={handleImport} disabled={state.uploading}>
                Import to Report Builder
              </Button>
            ) : (
              <Button kind="primary" onClick={handleUpload} disabled={!canUpload}>
                Validate File
              </Button>
            )}
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}

export default LegacyReportUploadModal;

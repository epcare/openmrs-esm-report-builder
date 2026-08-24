import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ButtonSet,
  InlineNotification,
  Modal,
  ModalBody,
  ModalFooter,
  ProgressBar,
  Tag,
  TextInput,
  Toggle,
} from '@carbon/react';
import { Checkmark, Error as ErrorIcon, Package as PackageIcon, Information } from '@carbon/react/icons';

import { importPackage, type ImportRequest, type ImportResult } from '../../resources/report-import-export/import-export-api';

import styles from './import-export.styles.scss';

interface ImportPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedPath?: string | null;
}

type ProgressStep = {
  key: string;
  label: string;
  status: 'pending' | 'in-progress' | 'complete' | 'error';
};

const IMPORT_PROGRESS_STEPS: ProgressStep[] = [
  { key: 'validate', label: 'Validating package...', status: 'pending' },
  { key: 'categories', label: 'Report Categories...', status: 'pending' },
  { key: 'ageCategories', label: 'Age Categories...', status: 'pending' },
  { key: 'ageGroups', label: 'Age Groups...', status: 'pending' },
  { key: 'themes', label: 'Data Themes...', status: 'pending' },
  { key: 'indicators', label: 'Indicators...', status: 'pending' },
  { key: 'sections', label: 'Sections...', status: 'pending' },
  { key: 'library', label: 'Report Library...', status: 'pending' },
  { key: 'reports', label: 'Built Reports...', status: 'pending' },
  { key: 'complete', label: 'Complete!', status: 'pending' },
];

const ImportPackageModal: React.FC<ImportPackageModalProps> = ({ isOpen, onClose, onSuccess, preselectedPath }) => {
  const { t } = useTranslation();

  // Import state
  const [isImporting, setIsImporting] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [progressSteps, setProgressSteps] = React.useState<ProgressStep[]>(IMPORT_PROGRESS_STEPS);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Form state
  const [useCustomPath, setUseCustomPath] = React.useState(false);
  const [customPath, setCustomPath] = React.useState('');
  const [pathError, setPathError] = React.useState<string | null>(null);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setIsImporting(false);
    setCurrentStep(0);
    setProgressSteps(IMPORT_PROGRESS_STEPS);
    setImportResult(null);
    setError(null);
    setUseCustomPath(false);
    setCustomPath('');
    setPathError(null);
  };

  const validateCustomPath = (path: string): string | null => {
    if (!path || path.trim() === '') {
      return 'Custom path cannot be empty when enabled';
    }
    return null;
  };

  const startImport = async () => {
    // Validate custom path if enabled
    if (useCustomPath) {
      const validationError = validateCustomPath(customPath);
      if (validationError) {
        setPathError(validationError);
        return;
      }
    }

    setIsImporting(true);
    setError(null);
    setPathError(null);

    try {
      // Simulate progress steps
      for (let i = 0; i < progressSteps.length - 1; i++) {
        await updateProgressStep(i, 'in-progress');
        await sleep(400);
        await updateProgressStep(i, 'complete');
      }

      // Call the actual import API
      const request: ImportRequest = useCustomPath
        ? { sourceDirectory: customPath.trim() }
        : {}; // Empty = backend uses default location

      const result = await importPackage(request);
      await updateProgressStep(progressSteps.length - 1, 'complete');
      setImportResult(result);

      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.errorMessage || 'Initialization failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during initialization.');
      setProgressSteps((steps) =>
        steps.map((step, i) => (i === currentStep ? { ...step, status: 'error' } : step)),
      );
    } finally {
      setIsImporting(false);
    }
  };

  const updateProgressStep = async (index: number, status: ProgressStep['status']) => {
    if (index >= 0 && index < progressSteps.length) {
      setCurrentStep(index + 1);
      setProgressSteps((steps) =>
        steps.map((step, i) => (i === index ? { ...step, status } : step)),
      );
    }
    await sleep(100);
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const getProgressPercentage = () => {
    return Math.round((currentStep / progressSteps.length) * 100);
  };

  const isValid = !useCustomPath || (useCustomPath && !pathError && customPath.trim() !== '');

  return (
    <Modal
      open={isOpen}
      onRequestClose={onClose}
      modalHeading="Initialize Report Builder"
      modalLabel="Report Builder"
      primaryButtonDisabled={!isValid || isImporting}
      onRequestSubmit={startImport}
      size="md"
    >
      <ModalBody>
        {!isImporting && !importResult && (
          <div className={styles.formContainer}>
            {/* Info Box */}
            <div className={styles.infoBox}>
              <Information size={20} className={styles.infoIcon} />
              <div>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 500 }}>
                  Quick Initialization
                </p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--cds-text-02)' }}>
                  Loads all reporting artifacts from the default OpenMRS configuration directory.
                </p>
              </div>
            </div>

            {/* What will be loaded */}
            <div className={styles.loadedItemsBox}>
              <h5 style={{ fontSize: '0.875rem', fontWeight: 500, margin: '0 0 0.75rem 0' }}>
                What will be loaded:
              </h5>
              <div className={styles.itemsGrid}>
                <span className={styles.itemTag}>Report Categories</span>
                <span className={styles.itemTag}>Age Categories & Groups</span>
                <span className={styles.itemTag}>Data Themes</span>
                <span className={styles.itemTag}>Indicators</span>
                <span className={styles.itemTag}>Sections</span>
                <span className={styles.itemTag}>Report Library</span>
                <span className={styles.itemTag}>Compiled Reports</span>
                <span className={styles.itemTag}>ETL Sources & Tasks</span>
              </div>
            </div>

            {/* Advanced Options */}
            <div className={styles.advancedSection}>
              <Toggle
                id="use-custom-path-toggle"
                labelText="Use custom directory path"
                toggled={useCustomPath}
                onChange={(event: any) => {
                  setUseCustomPath(event.target.checked);
                  setPathError(null);
                }}
                labelA="Default"
                labelB="Custom"
              />
            </div>

            {useCustomPath && (
              <div className={styles.customPathSection}>
                <TextInput
                  id="custom-path-input"
                  labelText="Custom directory path"
                  placeholder="/path/to/distribution/package"
                  value={customPath}
                  onChange={(event) => {
                    setCustomPath(event.target.value);
                    if (pathError) {
                      setPathError(validateCustomPath(event.target.value));
                    }
                  }}
                  invalid={!!pathError}
                  invalidText={pathError || ''}
                />
                <p className={styles.hintText}>
                  Enter the full path to the directory containing the exported report package.
                </p>
              </div>
            )}

            {error && (
              <InlineNotification
                kind="error"
                title="Error"
                subtitle={error}
                hideCloseButton
                lowContrast
                style={{ marginTop: '1rem' }}
              />
            )}
          </div>
        )}

        {/* Progress View */}
        {isImporting && (
          <div className={styles.progressContainer}>
            <div className={styles.progressInfo}>
              <h4>Initializing Report Builder...</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--cds-text-02)' }}>
                Loading and configuring reporting artifacts from {useCustomPath ? 'custom directory' : 'default location'}.
              </p>
            </div>

            <ProgressBar
              value={getProgressPercentage()}
              label={progressSteps[currentStep]?.label || 'Initializing...'}
              className={styles.progressBar}
            />

            <div className={styles.progressSteps} style={{ maxHeight: '200px' }}>
              {progressSteps.map((step) => (
                <div key={step.key} className={styles.progressStep}>
                  <span className={styles.stepIcon}>
                    {step.status === 'complete' && <Checkmark size={16} className={styles.success} />}
                    {step.status === 'error' && <ErrorIcon size={16} className={styles.error} />}
                    {step.status === 'in-progress' && <PackageIcon size={16} className={styles.inProgress} />}
                  </span>
                  <span
                    className={`${styles.stepLabel} ${
                      step.status === 'complete' ? styles.complete :
                      step.status === 'error' ? styles.error :
                      step.status === 'in-progress' ? styles.inProgress : ''
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success View */}
        {importResult && importResult.success && (
          <div className={styles.successContainer}>
            <div className={styles.successHeader}>
              <Checkmark size={32} className={styles.successIcon} />
              <h4>Initialization completed</h4>
            </div>

            <div className={styles.resultInfo}>
              <p className={styles.summary}>{importResult.summary}</p>
              <div className={styles.statsRow}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{importResult.successCount}</span>
                  <span className={styles.statLabel}>Processed</span>
                </div>
                {importResult.errorCount !== undefined && importResult.errorCount > 0 && (
                  <div className={styles.stat}>
                    <span className={styles.statValue} style={{ color: '#da1e28' }}>
                      {importResult.errorCount}
                    </span>
                    <span className={styles.statLabel}>Errors</span>
                  </div>
                )}
              </div>
            </div>

            {importResult.successes && importResult.successes.length > 0 && (
              <div className={styles.importDetails}>
                <h5>Successfully Loaded:</h5>
                <div className={styles.itemList}>
                  {importResult.successes.slice(0, 10).map((item, index) => (
                    <div key={index} className={styles.item}>
                      <Tag type="green">{item.type}</Tag>
                      <span>{item.filename}</span>
                    </div>
                  ))}
                  {importResult.successes.length > 10 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-02)', padding: '0.25rem 0' }}>
                      ... and {importResult.successes.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {importResult.errors && importResult.errors.length > 0 && (
              <div className={styles.importDetails}>
                <h5 style={{ color: '#da1e28' }}>Errors:</h5>
                <div className={styles.itemList}>
                  {importResult.errors.map((item, index) => (
                    <div key={index} className={`${styles.item} ${styles.errorItem}`}>
                      <Tag type="red">{item.type}</Tag>
                      <span>{item.filename}</span>
                      {item.error && <span className={styles.errorMessage}>: {item.error}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <ButtonSet>
          {!isImporting && !importResult && (
            <>
              <Button kind="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={!isValid} onClick={startImport}>
                Initialize
              </Button>
            </>
          )}
          {(isImporting || importResult) && (
            <Button kind="primary" onClick={onClose}>
              {importResult?.success ? 'Done' : 'Close'}
            </Button>
          )}
        </ButtonSet>
      </ModalFooter>
    </Modal>
  );
};

export default ImportPackageModal;

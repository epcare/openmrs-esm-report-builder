/**
 * ETL Monitor Builder Modal
 * Main wizard modal for creating and editing ETL monitors
 */

import React from 'react';
import {
  Modal,
  Button,
  Stack,
  InlineNotification,
  Grid,
  Column,
} from '@carbon/react';
import { ArrowRight, ArrowLeft, Save } from '@carbon/icons-react';
import { useBuilderContext, useStepNavigation, BuilderProvider } from './etl-monitor-builder-context';
import { getAllValidationErrors } from './builder-state-machine';
import './etl-monitor-builder-modal.scss';

import {
  GeneralStep,
  DataSourceStep,
  DesignStep,
  FieldsStep,
  PreviewStep,
} from './steps';

/**
 * Builder Live Preview Component
 * Shows real-time preview of the monitor configuration
 */
interface BuilderLivePreviewProps {
  state: any;
}

function BuilderLivePreview({ state }: BuilderLivePreviewProps) {
  const [MonitorRenderer, setMonitorRenderer] = React.useState<any>(null);

  React.useEffect(() => {
    import('../renderers/MonitorRenderer').then((module) => {
      setMonitorRenderer(() => module.MonitorRenderer);
    });
  }, []);

  // Generate display config from current state
  const displayConfig = React.useMemo(() => {
    if (!state.componentType || !state.fields || state.fields.length === 0) {
      return null;
    }

    return {
      schemaVersion: 2,
      component: state.componentType,
      data: {
        rootPath: '$',
      },
      fields: state.fields,
      layout: state.layout,
      emptyState: state.emptyState,
      componentConfig: state.componentConfig,
      presentation: {
        title: state.general.name || 'Preview Monitor',
        description: state.general.description,
      },
    };
  }, [state]);

  // Generate sample data for preview
  const sampleData = React.useMemo(() => {
    const sample: any = {};
    state.fields?.forEach((field: any) => {
      const fieldName = field.path.startsWith('$.') ? field.path.slice(2) : field.key;

      switch (field.type) {
        case 'STATUS':
          sample[fieldName] = 'UP';
          break;
        case 'PERCENTAGE':
          sample[fieldName] = 67;
          break;
        case 'TIMESTAMP':
          sample[fieldName] = Date.now();
          break;
        case 'DURATION':
          sample[fieldName] = 5432;
          break;
        case 'BOOLEAN':
          sample[fieldName] = true;
          break;
        case 'NUMBER':
        case 'INTEGER':
        case 'DECIMAL':
          sample[fieldName] = 100;
          break;
        default:
          sample[fieldName] = `Sample ${field.label}`;
      }
    });

    return sample;
  }, [state.fields]);

  // Use test data if available, otherwise use sample data
  const previewData = state.testResult?.data || state.detectedSchema?.rawSample || sampleData;

  if (!displayConfig) {
    return (
      <div className="builder-preview-placeholder">
        <p style={{ color: 'var(--cds-text-secondary, #666)' }}>
          {state.componentType
            ? 'Configure fields to see the live preview'
            : 'Select a component type to see the preview'}
        </p>
      </div>
    );
  }

  if (!MonitorRenderer) {
    return (
      <div className="builder-preview-placeholder">
        <p style={{ color: 'var(--cds-text-secondary, #666)' }}>
          Loading preview renderer...
        </p>
      </div>
    );
  }

  return (
    <div className="builder-preview-renderer">
      <MonitorRenderer
        config={displayConfig}
        data={previewData}
        loading={false}
        error={null}
      />
    </div>
  );
}

/**
 * Builder Modal Props
 */
interface BuilderModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  monitorId?: string;
  onClose: () => void;
  onSave: (config: any) => Promise<void>;
}

/**
 * Main Builder Modal Component
 */
export function EtlMonitorBuilderModal({
  open,
  mode,
  onClose,
  onSave,
}: BuilderModalProps) {
  const { state } = useBuilderContext();
  const {
    currentStep,
    goToNextStep,
    goToPreviousStep,
    canGoNext,
    canGoPrevious,
  } = useStepNavigation();

  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const errors = getAllValidationErrors(state);
  const hasParseError = !!state.parseError;

  const handleSave = async () => {
    if (errors.length > 0) {
      setSaveError('Please fix validation errors before saving');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Generate the save payload
      const payload = {
        name: state.general.name.trim(),
        code: state.general.code.trim() || undefined,
        description: state.general.description.trim() || undefined,
        monitorType: state.componentType,
        category: state.general.category.trim() || undefined,
        refreshInterval: state.general.refreshInterval,
        timeout: state.general.timeout,
        active: state.general.active,
        configJson: JSON.stringify({
          apiEndpoint: {
            url: state.endpoint.url,
            method: state.endpoint.method,
            auth: {
              type: state.endpoint.auth.type,
              useSession: state.endpoint.auth.useSession,
              username: state.endpoint.auth.username,
              password: state.endpoint.auth.password,
              headerName: state.endpoint.auth.headerName,
              apiKey: state.endpoint.auth.apiKey,
              token: state.endpoint.auth.token,
            },
          },
        }),
        displayConfigJson: JSON.stringify({
          schemaVersion: 2,
          component: state.componentType,
          fields: state.fields,
          layout: state.layout,
          emptyState: state.emptyState,
          componentConfig: state.componentConfig,
        }),
      };

      await onSave(payload);
      onClose();
    } catch (error: any) {
      setSaveError(error?.message || 'Failed to save monitor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      goToNextStep();
    }
  };

  const handlePrevious = () => {
    if (canGoPrevious) {
      goToPreviousStep();
    }
  };

  const handleClose = () => {
    if (state.isDirty) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirm) return;
    }
    onClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'general':
        return <GeneralStep />;
      case 'data-source':
        return <DataSourceStep />;
      case 'design':
        return <DesignStep />;
      case 'fields':
        return <FieldsStep />;
      case 'preview':
        return <PreviewStep />;
      default:
        return <GeneralStep />;
    }
  };

  const steps = [
    { id: 'general', label: 'General' },
    { id: 'data-source', label: 'Data Source' },
    { id: 'design', label: 'Design' },
    { id: 'fields', label: 'Fields' },
    { id: 'preview', label: 'Preview' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <Modal
      open={open}
      onRequestClose={handleClose}
      modalHeading={mode === 'create' ? 'New ETL Monitor' : 'Edit ETL Monitor'}
      primaryButtonText={isSaving ? 'Saving…' : 'Save'}
      secondaryButtonText="Cancel"
      onSecondarySubmit={handleClose}
      onRequestSubmit={handleSave}
      primaryButtonDisabled={isSaving || errors.length > 0}
      size="lg"
      className="etl-monitor-builder-modal"
    >
      <div className="etl-monitor-builder-modal__content">
        <Grid className="etl-monitor-builder-modal__grid">
          {/* Left Sidebar - Step Navigation */}
          <Column sm={4} md={2} lg={3} className="etl-monitor-builder-modal__sidebar">
            <nav className="builder-steps-nav">
              <ul className="builder-steps-list">
                {steps.map((step, index) => {
                  const isCompleted = index < currentStepIndex;
                  const isCurrent = step.id === currentStep;
                  const isAccessible = index <= currentStepIndex;

                  return (
                    <li
                      key={step.id}
                      className={[
                        'builder-step-item',
                        isCurrent && 'builder-step-item--current',
                        isCompleted && 'builder-step-item--completed',
                        !isAccessible && 'builder-step-item--disabled',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <button
                        type="button"
                        disabled={!isAccessible}
                        onClick={() => {/* Navigation handled by prev/next */}}
                        className="builder-step-button"
                      >
                        <span className="builder-step-number">
                          {isCompleted ? '✓' : index + 1}
                        </span>
                        <span className="builder-step-label">{step.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </Column>

          {/* Main Content Area */}
          <Column sm={12} md={14} lg={13} className="etl-monitor-builder-modal__main">
            <div className="builder-step-content">
              {/* Error Notification */}
              {saveError && (
                <InlineNotification
                  kind="error"
                  title="Error"
                  subtitle={saveError}
                  onClose={() => setSaveError(null)}
                  style={{ marginBottom: '1rem' }}
                />
              )}

              {/* Parse Error Warning */}
              {hasParseError && mode === 'edit' && (
                <InlineNotification
                  kind="warning"
                  title="Configuration Parsing Issue"
                  subtitle={`Some monitor configuration fields could not be parsed: ${state.parseError}. You may need to reconfigure these fields.`}
                  style={{ marginBottom: '1rem' }}
                  lowContrast
                  hideCloseButton
                />
              )}

              {/* Validation Errors */}
              {errors.length > 0 && currentStep === 'preview' && (
                <InlineNotification
                  kind="error"
                  title="Validation Errors"
                  subtitle={errors.join(', ')}
                  style={{ marginBottom: '1rem' }}
                  lowContrast
                />
              )}

              {/* Step Content */}
              {renderStep()}
            </div>

            {/* Navigation Footer */}
            <div className="builder-step-footer">
              <Stack orientation="horizontal" gap={4}>
                {canGoPrevious && (
                  <Button
                    kind="secondary"
                    renderIcon={ArrowLeft}
                    onClick={handlePrevious}
                  >
                    Previous
                  </Button>
                )}

                {canGoNext && (
                  <Button
                    kind="primary"
                    renderIcon={ArrowRight}
                    onClick={handleNext}
                  >
                    Next
                  </Button>
                )}

                {!canGoNext && currentStep === 'preview' && (
                  <Button
                    kind="primary"
                    renderIcon={Save}
                    onClick={handleSave}
                    disabled={isSaving || errors.length > 0}
                  >
                    {isSaving ? 'Saving…' : 'Save Monitor'}
                  </Button>
                )}
              </Stack>
            </div>
          </Column>

          {/* Right Panel - Live Preview */}
          <Column sm={4} md={6} lg={8} className="etl-monitor-builder-modal__preview">
            <div className="builder-preview-panel">
              <div className="builder-preview-header">
                <h4>Live Preview</h4>
                <span className="builder-preview-badge">
                  {state.componentType || 'Select a component'}
                </span>
              </div>
              <div className="builder-preview-content">
                <BuilderLivePreview state={state} />
              </div>
            </div>
          </Column>
        </Grid>
      </div>
    </Modal>
  );
}

/**
 * Wrapper component with provider
 */
interface BuilderModalWrapperProps {
  open: boolean;
  mode: 'create' | 'edit';
  monitorId?: string;
  onClose: () => void;
  onSave: (config: any) => Promise<void>;
}

export function EtlMonitorBuilderModalWrapper({
  open,
  mode,
  monitorId,
  onClose,
  onSave,
}: BuilderModalWrapperProps) {
  if (!open) return null;

  return (
    <BuilderProvider mode={mode} monitorId={monitorId}>
      <EtlMonitorBuilderModal
        open={open}
        mode={mode}
        monitorId={monitorId}
        onClose={onClose}
        onSave={onSave}
      />
    </BuilderProvider>
  );
}

export default EtlMonitorBuilderModalWrapper;

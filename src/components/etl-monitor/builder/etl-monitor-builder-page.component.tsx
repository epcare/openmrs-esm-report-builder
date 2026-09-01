/**
 * ETL Monitor Builder Page
 * Full-page wizard for creating and editing ETL monitors
 * Matches the reference design with teal accents and clean layout
 */

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, InlineNotification, Tag, Select, SelectItem } from '@carbon/react';
import { ArrowLeft, ArrowRight, Save, CheckmarkFilled, Information, Help as HelpIcon } from '@carbon/icons-react';
import { useBuilderContext, useStepNavigation, BuilderProvider } from './etl-monitor-builder-context';
import { getAllValidationErrors } from './builder-state-machine';
import styles from './etl-monitor-builder-page.scss';
import type { DisplayDensity } from '../../../types/etl-monitor/etl-monitor-v2.types';
import { MonitorPreviewRenderer } from './monitor-preview';
import { GeneratedConfigPanel } from './generated-config-panel.component';

import {
  GeneralStep,
  DataSourceStep,
  DesignStep,
  FieldsStep,
  PreviewStep,
} from './steps';

/**
 * Builder Page Component
 */
export function EtlMonitorBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get('mode') as 'create' | 'edit') || 'create';
  const monitorId = searchParams.get('monitor');

  const handleClose = () => {
    navigate('/admin/etl-monitors');
  };

  return (
    <BuilderProvider mode={mode} monitorId={monitorId ?? undefined}>
      <BuilderContent onClose={handleClose} mode={mode} />
    </BuilderProvider>
  );
}

/**
 * Builder Content Component
 */
interface BuilderContentProps {
  onClose: () => void;
  mode: 'create' | 'edit';
}

function BuilderContent({ onClose, mode }: BuilderContentProps) {
  const { state, saveMonitor, updateState } = useBuilderContext();
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
      await saveMonitor();
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

  // Memoize steps array to prevent recreation on every render
  const steps = React.useMemo(() => [
    { id: 'general', label: 'Basic information', sublabel: 'Name & details' },
    { id: 'data-source', label: 'Data Source', sublabel: 'Endpoint & test' },
    { id: 'design', label: 'Design', sublabel: 'Choose layout' },
    { id: 'fields', label: 'Fields', sublabel: 'Map data' },
    { id: 'preview', label: 'Preview', sublabel: 'Review & save' },
  ], []);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const getStepStatus = (index: number) => {
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'current';
    return 'upcoming';
  };

  // Get monitor name for breadcrumb display
  const monitorName = state.general.name || 'New Monitor';
  const monitorCategory = state.general.categoryLabel || state.general.category || 'ETL Monitor';

  return (
    <div className={styles['etl-monitor-builder-page']}>
      {/* Header */}
      <header className={styles['builder-header']}>
        <div className={styles['builder-header__breadcrumb']}>
          <span className={styles['builder-header__category']}>{monitorCategory}</span>
          <span className={styles['builder-header__separator']}>/</span>
          <span className={styles['builder-header__name']}>{monitorName}</span>
        </div>
        <div className={styles['builder-header__title']}>
          {mode === 'create' ? 'New ETL Monitor' : 'Edit ETL Monitor'}
        </div>
        <div className={styles['builder-header__actions']}>
          {canGoPrevious && (
            <Button kind="ghost" size="sm" renderIcon={ArrowLeft} onClick={handlePrevious}>
              Back
            </Button>
          )}
          {canGoNext && (
            <Button kind="primary" size="sm" renderIcon={ArrowRight} onClick={handleNext}>
              Continue
            </Button>
          )}
          {!canGoNext && currentStep === 'preview' && (
            <Button
              kind="primary"
              size="sm"
              renderIcon={Save}
              onClick={handleSave}
              disabled={isSaving || errors.length > 0}
            >
              {isSaving ? 'Saving…' : 'Save Monitor'}
            </Button>
          )}
        </div>
      </header>

      {/* Page Content */}
      <div className={styles['builder-content']}>
        <div className={styles['builder-grid']}>
          {/* Left Sidebar - Step Navigation */}
          <div className={styles['builder-sidebar']}>
            <nav className={styles['builder-steps-nav']} aria-label="Wizard steps">
              <ul className={styles['builder-steps-list']}>
                {steps.map((step, index) => {
                  const status = getStepStatus(index);

                  return (
                    <li key={step.id} className={`${styles['builder-step-item']} ${styles[`builder-step-item--${status}`]}`}>
                      <button
                        type="button"
                        className={styles['builder-step-button']}
                        aria-current={status === 'current' ? 'step' : undefined}
                      >
                        <span className={styles['builder-step-number']}>
                          {status === 'completed' ? <CheckmarkFilled size={16} /> : index + 1}
                        </span>
                        <div className={styles['builder-step-content']}>
                          <span className={styles['builder-step-label']}>{step.label}</span>
                          {step.sublabel && (
                            <span className={styles['builder-step-sublabel']}>{step.sublabel}</span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Help Section */}
            <div className={styles['builder-help-section']}>
              <HelpIcon size={16} className={styles['builder-help-icon']} />
              <div className={styles['builder-help-content']}>
                <span className={styles['builder-help-label']}>Need help?</span>
                <a
                  href="#"
                  className={styles['builder-help-link']}
                  onClick={(e) => {
                    e.preventDefault();
                    // Could open a help modal or navigate to documentation
                  }}
                >
                  Learn how to create ETL monitors
                </a>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className={styles['builder-main']}>
            {saveError && (
              <InlineNotification
                kind="error"
                title="Error"
                subtitle={saveError}
                onClose={() => setSaveError(null)}
                style={{ marginBottom: '1rem' }}
              />
            )}

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

            {errors.length > 0 && currentStep === 'preview' && (
              <InlineNotification
                kind="error"
                title="Validation Errors"
                subtitle={errors.join(', ')}
                style={{ marginBottom: '1rem' }}
                lowContrast
              />
            )}

            <div className={styles['builder-step-content']}>
              {renderStep()}
            </div>
          </div>

          {/* Right Panel - Live Preview (Generated Configuration on the Preview step) */}
          <div className={styles['builder-preview']}>
            {currentStep === 'preview' ? (
              <GeneratedConfigPanel />
            ) : (
            <div className={styles['builder-preview-panel']}>
              <div className={styles['builder-preview-header']}>
                <h4>Live Preview</h4>
                <p className={styles['builder-preview-description']}>
                  See how your monitor will appear in real-time
                </p>
              </div>

              <div className={styles['builder-preview-content']}>
                {state.componentType && state.fields.length > 0 ? (
                  <>
                    {/* Render actual monitor component */}
                    <MonitorPreviewRenderer state={state} />

                    {/* Selected Design Settings */}
                    {state.componentType && (
                      <div className={styles['builder-preview-settings']}>
                        <div className={styles['builder-preview-settings-header']}>
                          <h5>Selected Design Settings</h5>
                        </div>
                        <div className={styles['builder-preview-settings-content']}>
                          <div className={styles['builder-preview-setting']}>
                            <label>Component</label>
                            <Tag type="purple">{state.componentType}</Tag>
                          </div>
                          <div className={styles['builder-preview-setting']}>
                            <label>Density</label>
                            <Select
                              id="density-select"
                              size="sm"
                              inline
                              value={state.density || 'compact'}
                              onChange={(e) => {
                                updateState({ density: (e.target as HTMLSelectElement).value as DisplayDensity });
                              }}
                            >
                              <SelectItem value="compact" text="Compact" />
                              <SelectItem value="default" text="Default" />
                              <SelectItem value="spacious" text="Spacious" />
                            </Select>
                          </div>
                          <div className={styles['builder-preview-setting']}>
                            <label>Section</label>
                            <Select
                              id="section-select"
                              size="sm"
                              inline
                              value={state.layout?.section || 'overview'}
                              onChange={(e) => {
                                updateState({
                                  layout: {
                                    section: (e.target as HTMLSelectElement).value,
                                    span: state.layout?.span ?? { sm: 4, md: 4, lg: 4 },
                                    priority: state.layout?.priority ?? 1,
                                  },
                                });
                              }}
                            >
                              <SelectItem value="overview" text="Overview" />
                              <SelectItem value="execution" text="Execution" />
                              <SelectItem value="history" text="History" />
                              <SelectItem value="errors" text="Errors" />
                              <SelectItem value="configuration" text="Configuration" />
                            </Select>
                          </div>
                        </div>
                        <div className={styles['builder-preview-settings-note']}>
                          <Information size={12} />
                          <span>You can change the design or settings later. Your data and mappings will be preserved.</span>
                        </div>
                      </div>
                    )}

                    {/* Generated Configuration JSON */}
                    <div className={styles['builder-preview-config']}>
                      <div className={styles['builder-preview-config-header']}>
                        <h5>Generated Configuration (JSON)</h5>
                      </div>
                      <pre className={styles['builder-preview-json']}>
                        {JSON.stringify(
                          {
                            schemaVersion: 2,
                            component: state.componentType,
                            fields: state.fields.map((f) => ({
                              key: f.key,
                              label: f.label,
                              path: f.path,
                              type: f.type,
                            })),
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className={styles['builder-preview-empty']}>
                    <p>Configure your data source and select a design to see the live preview</p>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EtlMonitorBuilderPage;

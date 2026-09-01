/**
 * Preview & Publish Step Component
 * Step 5 of the ETL Monitor Builder
 *
 * Reference design: docs/image-series-monitor/preview.png (target: stage5)
 * - Widget preview card with chrome
 * - Configuration summary (icon + label + value grid)
 * - Validation checklist
 * - Save action
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, InlineNotification } from '@carbon/react';
import {
  Globe,
  Renew,
  Save,
  Security,
  View,
  Timer,
  Folder,
  Copy,
  Checkmark,
  CheckmarkFilled,
  Error as ErrorIcon,
} from '@carbon/icons-react';
import { useBuilderContext } from '../etl-monitor-builder-context';
import {
  stateToSavePayload,
  validatePreviewStep,
  getAllValidationErrors,
} from '../builder-state-machine';
import { MonitorPreviewRenderer } from '../monitor-preview';
import { MonitorWidgetCard } from '../../renderers/monitor-widget-card.component';
import { getDesignConfig } from '../design-registry';
import styles from './preview-step.scss';

const AUTH_LABELS: Record<string, string> = {
  NONE: 'None',
  OPENMRS: 'OpenMRS Session',
  BASIC: 'Basic Auth',
  API_KEY: 'API Key',
  BEARER_TOKEN: 'Bearer Token',
};

/**
 * Preview & Publish Step Component
 */
export default function PreviewStep() {
  const { state, saveMonitor } = useBuilderContext();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const savePayload = useMemo(() => stateToSavePayload(state), [state]);

  // Selected design's card identity (accent tile + label, per the
  // Visualization Cards sheet) reflected above the live widget
  const design = getDesignConfig(state.componentType);

  const allErrors = useMemo(() => getAllValidationErrors(state), [state]);
  const previewValidation = useMemo(() => validatePreviewStep(state), [state]);
  const isReady = allErrors.length === 0 && previewValidation.valid;

  // Status mapping checklist item
  const statusFields = state.fields.filter((f: any) => f.type === 'STATUS');
  const statusMapped = statusFields.every((f: any) => (f.statusMappings?.length ?? 0) > 0);

  // Configuration summary items
  const summaryItems = [
    { icon: <Globe />, label: 'Data source', value: `${state.endpoint.method} ${state.endpoint.url || '—'}` },
    { icon: <Security />, label: 'Authentication', value: AUTH_LABELS[state.endpoint.auth?.type] || state.endpoint.auth?.type || 'None' },
    { icon: <View />, label: 'Component', value: design?.label || state.componentType || '—' },
    { icon: <Timer />, label: 'Timeout', value: `${state.general.timeout} sec` },
    { icon: <Renew />, label: 'Refresh', value: `${state.general.refreshInterval} sec` },
    { icon: <Folder />, label: 'Category', value: state.general.category || '—' },
  ];

  // Validation checklist
  const checklist = [
    {
      pass: state.testResult ? state.testResult.success : state.mode === 'edit' && !!state.endpoint.url,
      label: state.testResult ? 'Endpoint tested' : state.mode === 'edit' ? 'Endpoint configured' : 'Endpoint tested',
      sub: state.testResult
        ? state.testResult.success
          ? 'Successfully connected and returned data'
          : `Test failed: ${state.testResult.error || 'unknown error'}`
        : state.mode === 'edit'
          ? 'Endpoint configured and saved previously'
          : 'Run the endpoint test in the Data Source step',
    },
    {
      pass: state.fields.length > 0,
      label: 'Fields mapped',
      sub:
        state.fields.length > 0
          ? `${state.fields.length} field${state.fields.length === 1 ? '' : 's'} mapped to response paths`
          : 'Map at least one response field',
    },
    {
      pass: statusFields.length === 0 || statusMapped,
      label: 'Status mapping complete',
      sub:
        statusFields.length === 0
          ? 'No status fields configured'
          : statusMapped
            ? 'Status and thresholds configured'
            : 'Add status mappings to all STATUS fields',
    },
    {
      pass: previewValidation.valid,
      label: 'Preview ready',
      sub: previewValidation.valid
        ? 'Monitor preview generated successfully'
        : 'Fix configuration errors to generate the preview',
    },
  ];

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveMonitor();
      navigate('/admin/etl-monitors');
    } catch (error: any) {
      setSaveError(error?.message || 'Failed to save monitor');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(savePayload.displayConfigJson || '');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  return (
    <div className={styles['preview-step']}>
      <div className={styles['preview-step__header']}>
        <h2>Preview &amp; publish</h2>
        <p className={styles['preview-step__description']}>Review the monitor before saving it to the dashboard.</p>
      </div>

      {saveError && (
        <InlineNotification
          kind="error"
          lowContrast
          title="Save Failed"
          subtitle={saveError}
          onCloseButtonClick={() => setSaveError(null)}
          style={{ marginBottom: '1rem' }}
        />
      )}

      {/* Widget preview: the selected design's card identity + the exact
          components and styling the dashboard renders */}
      <MonitorWidgetCard
        loading={false}
        onRefresh={() => setPreviewKey((k) => k + 1)}
        actions={[{ label: copied ? 'Copied!' : 'Copy configuration JSON', onClick: handleCopyJson }]}
      >
        {design && (
          <div className={styles['preview-design-head']}>
            <span
              className={styles['preview-design-head__icon']}
              style={{ backgroundColor: `${design.accent}1A`, color: design.accent }}
            >
              {design.icon}
            </span>
            <div className={styles['preview-design-head__text']}>
              <h3 className={styles['preview-design-head__title']}>{design.label}</h3>
              <p className={styles['preview-design-head__desc']}>{design.description}</p>
            </div>
          </div>
        )}
        <div key={previewKey}>
          <MonitorPreviewRenderer state={state} />
        </div>
      </MonitorWidgetCard>

      {/* Configuration summary + validation checklist */}
      <div className={styles['preview-section']}>
        <h4>Configuration summary</h4>
        <div className={styles['preview-summary']}>
          {summaryItems.map((item) => (
            <div key={item.label} className={styles['preview-summary__item']}>
              <span className={styles['preview-summary__icon']}>{item.icon}</span>
              <div className={styles['preview-summary__text']}>
                <div className={styles['preview-summary__label']}>{item.label}</div>
                <div className={styles['preview-summary__value']}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles['preview-section__divider']} />

        <h4>Validation checklist</h4>
        <div className={styles['preview-checklist']}>
          {checklist.map((item) => (
            <div key={item.label} className={styles['preview-checklist__item']}>
              <span className={[styles['preview-checklist__icon'], item.pass ? styles['preview-checklist__icon--pass'] : styles['preview-checklist__icon--fail']].join(' ')}>
                {item.pass ? <CheckmarkFilled /> : <ErrorIcon />}
              </span>
              <div>
                <div className={styles['preview-checklist__label']}>{item.label}</div>
                <div className={styles['preview-checklist__sub']}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Copy JSON + Save */}
      <div className={styles['preview-save']}>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={copied ? Checkmark : Copy}
          onClick={handleCopyJson}
        >
          {copied ? 'Copied!' : 'Copy JSON'}
        </Button>
        <Button
          kind="primary"
          renderIcon={Save}
          onClick={handleSave}
          disabled={saving || !isReady}
          title={isReady ? undefined : allErrors.join(', ') || 'Configuration incomplete'}
        >
          {saving ? 'Saving…' : 'Save Monitor'}
        </Button>
      </div>
    </div>
  );
}

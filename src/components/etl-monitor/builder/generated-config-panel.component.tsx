/**
 * Generated Configuration Panel
 * Right-hand panel content on the Preview step: Visual / JSON tabs with a
 * copyable, syntax-highlighted config and a publish-readiness banner.
 * Reference design: docs/image-series-monitor/stage5.png
 */

import React, { useMemo, useState } from 'react';
import { Button } from '@carbon/react';
import { Checkmark, CheckmarkFilled, Copy, Error as ErrorIcon } from '@carbon/icons-react';
import { useBuilderContext } from './etl-monitor-builder-context';
import {
  generateConfigFromState,
  getAllValidationErrors,
  validatePreviewStep,
} from './builder-state-machine';
import { MonitorPreviewRenderer } from './monitor-preview';
import styles from './generated-config-panel.scss';

const TOKEN_RE = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

/**
 * Minimal JSON syntax highlighter
 */
function highlightJson(json: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(json))) {
    if (match.index > last) {
      nodes.push(json.slice(last, match.index));
    }
    if (match[1] !== undefined) {
      nodes.push(
        <span key={key++} className={match[2] ? styles['json-key'] : styles['json-string']}>
          {match[1]}
        </span>
      );
      if (match[2]) {
        nodes.push(match[2]);
      }
    } else if (match[3] !== undefined) {
      nodes.push(
        <span key={key++} className={styles['json-boolean']}>
          {match[3]}
        </span>
      );
    } else if (match[4] !== undefined) {
      nodes.push(
        <span key={key++} className={styles['json-number']}>
          {match[4]}
        </span>
      );
    }
    last = TOKEN_RE.lastIndex;
  }
  if (last < json.length) {
    nodes.push(json.slice(last));
  }
  return nodes;
}

/**
 * Generated Configuration Panel Component
 */
export function GeneratedConfigPanel() {
  const { state } = useBuilderContext();
  const [tab, setTab] = useState<'visual' | 'json'>('json');
  const [copied, setCopied] = useState(false);

  const config = useMemo(() => generateConfigFromState(state), [state]);
  const json = useMemo(() => JSON.stringify(config, null, 2), [config]);
  const highlighted = useMemo(() => highlightJson(json), [json]);

  const errors = useMemo(() => getAllValidationErrors(state), [state]);
  const previewValidation = useMemo(() => validatePreviewStep(state), [state]);
  const isReady = errors.length === 0 && previewValidation.valid;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — ignore
    }
  };

  return (
    <div className={styles['generated-config-panel']}>
      <div className={styles['generated-config-panel__header']}>
        <h4>Generated Configuration</h4>
      </div>

      <div className={styles['generated-config-panel__tabs']} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'visual'}
          className={[
            styles['generated-config-panel__tab'],
            tab === 'visual' && styles['generated-config-panel__tab--active'],
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => setTab('visual')}
        >
          Visual
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'json'}
          className={[
            styles['generated-config-panel__tab'],
            tab === 'json' && styles['generated-config-panel__tab--active'],
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => setTab('json')}
        >
          JSON
        </button>
      </div>

      <div className={styles['generated-config-panel__content']}>
        {tab === 'visual' ? (
          <MonitorPreviewRenderer state={state} />
        ) : (
          <div className={styles['generated-config-panel__json-wrap']}>
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              renderIcon={copied ? Checkmark : Copy}
              iconDescription={copied ? 'Copied!' : 'Copy JSON'}
              className={styles['generated-config-panel__copy']}
              onClick={handleCopy}
            />
            <pre className={styles['generated-config-panel__json']}>{highlighted}</pre>
          </div>
        )}
      </div>

      <div
        className={[
          styles['generated-config-panel__banner'],
          isReady
            ? styles['generated-config-panel__banner--ready']
            : styles['generated-config-panel__banner--blocked'],
        ]
          .join(' ')}
      >
        {isReady ? <CheckmarkFilled size={18} /> : <ErrorIcon size={18} />}
        <span>
          {isReady
            ? 'Ready to publish — this monitor will appear immediately on the dashboard after saving.'
            : `Configuration incomplete — fix ${errors.length} error${errors.length === 1 ? '' : 's'} before saving.`}
        </span>
      </div>
    </div>
  );
}

export default GeneratedConfigPanel;

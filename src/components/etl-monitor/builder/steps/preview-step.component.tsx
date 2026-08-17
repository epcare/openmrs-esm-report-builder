/**
 * Preview & Review Step Component
 * Step 5 of the ETL Monitor Builder
 *
 * Review configuration summary, live preview, and generated JSON
 */

import React, { useState, useMemo } from 'react';
import {
  Stack,
  InlineNotification,
  Button,
  Tabs,
  Tab,
  StructuredListWrapper,
  StructuredListBody,
  StructuredListRow,
  StructuredListCell,
  Tag,
  CodeSnippet,
  Toggle,
} from '@carbon/react';
import { CheckmarkFilled, WarningFilled, Information, Code as CodeIcon } from '@carbon/icons-react';
import { useBuilderContext } from '../etl-monitor-builder-context';
import { validatePreviewStep, generateConfigFromState, stateToSavePayload } from '../builder-state-machine';
import type { DisplayConfigV2 } from '../../../../types/etl-monitor/etl-monitor-v2.types';
import './preview-step.scss';

/**
 * Configuration summary section
 */
interface ConfigSummaryProps {
  state: any;
}

function ConfigSummary({ state }: ConfigSummaryProps) {
  const { general, endpoint, componentType, fields, layout, validation } = state;

  const isValid = validation.isValid;

  return (
    <div className="config-summary">
      {/* Validation Status */}
      <div className="config-summary__status">
        {isValid ? (
          <InlineNotification
            kind="success"
            title="Configuration Valid"
            subtitle="Your monitor configuration is complete and ready to save."
            lowContrast
            hideCloseButton
          />
        ) : (
          <InlineNotification
            kind="error"
            title="Configuration Incomplete"
            subtitle="Please fix the errors before saving."
            lowContrast
            hideCloseButton
          />
        )}
      </div>

      {/* General Information */}
      <div className="config-summary__section">
        <h4>General Information</h4>
        <StructuredListWrapper>
          <StructuredListBody>
            <StructuredListRow>
              <StructuredListCell>Name</StructuredListCell>
              <StructuredListCell>{general.name || <em>Not set</em>}</StructuredListCell>
            </StructuredListRow>
            <StructuredListRow>
              <StructuredListCell>Code</StructuredListCell>
              <StructuredListCell>{general.code || <em>Not set</em>}</StructuredListCell>
            </StructuredListRow>
            <StructuredListRow>
              <StructuredListCell>Category</StructuredListCell>
              <StructuredListCell>{general.category || general.categoryLabel || <em>Not set</em>}</StructuredListCell>
            </StructuredListRow>
            <StructuredListRow>
              <StructuredListCell>Refresh Interval</StructuredListCell>
              <StructuredListCell>{general.refreshInterval} seconds</StructuredListCell>
            </StructuredListRow>
            <StructuredListRow>
              <StructuredListCell>Timeout</StructuredListCell>
              <StructuredListCell>{general.timeout} seconds</StructuredListCell>
            </StructuredListRow>
            <StructuredListRow>
              <StructuredListCell>Active</StructuredListCell>
              <StructuredListCell>
                {general.active ? (
                  <Tag type="green">Active</Tag>
                ) : (
                  <Tag type="gray">Inactive</Tag>
                )}
              </StructuredListCell>
            </StructuredListRow>
          </StructuredListBody>
        </StructuredListWrapper>
      </div>

      {/* Data Source */}
      <div className="config-summary__section">
        <h4>Data Source</h4>
        <StructuredListWrapper>
          <StructuredListBody>
            <StructuredListRow>
              <StructuredListCell>URL</StructuredListCell>
              <StructuredListCell>
                <CodeSnippet type="inline" light>
                  {endpoint.method} {endpoint.url || <em>Not set</em>}
                </CodeSnippet>
              </StructuredListCell>
            </StructuredListRow>
            <StructuredListRow>
              <StructuredListCell>Authentication</StructuredListCell>
              <StructuredListCell>
                <Tag type="blue">{endpoint.auth?.type || 'NONE'}</Tag>
              </StructuredListCell>
            </StructuredListRow>
          </StructuredListBody>
        </StructuredListWrapper>
      </div>

      {/* Component Type */}
      <div className="config-summary__section">
        <h4>Display Component</h4>
        <StructuredListWrapper>
          <StructuredListBody>
            <StructuredListRow>
              <StructuredListCell>Component Type</StructuredListCell>
              <StructuredListCell>
                <Tag type="purple">{componentType || <em>Not selected</em>}</Tag>
              </StructuredListCell>
            </StructuredListRow>
            <StructuredListRow>
              <StructuredListCell>Layout</StructuredListCell>
              <StructuredListCell>
                {layout ? (
                  <span>
                    Section: <Tag>{layout.section}</Tag>, Priority: {layout.priority}
                  </span>
                ) : (
                  <em>Default layout</em>
                )}
              </StructuredListCell>
            </StructuredListRow>
          </StructuredListBody>
        </StructuredListWrapper>
      </div>

      {/* Fields Summary */}
      <div className="config-summary__section">
        <h4>Fields ({fields.length})</h4>
        {fields.length === 0 ? (
          <p className="config-summary__empty">No fields configured</p>
        ) : (
          <StructuredListWrapper>
            <StructuredListBody>
              {fields.map((field: any, index: number) => (
                <StructuredListRow key={index}>
                  <StructuredListCell style={{ width: '40%' }}>
                    <strong>{field.label}</strong>
                    {field.primary && (
                      <Tag type="blue" size="sm" style={{ marginLeft: '0.5rem' }}>
                        Primary
                      </Tag>
                    )}
                  </StructuredListCell>
                  <StructuredListCell>
                    <span style={{ fontSize: '0.75rem' }}>
                      <CodeSnippet type="inline" light>
                        {field.path}
                      </CodeSnippet>
                    </span>
                  </StructuredListCell>
                  <StructuredListCell>
                    <Tag type="gray" size="sm">
                      {field.type}
                    </Tag>
                  </StructuredListCell>
                </StructuredListRow>
              ))}
            </StructuredListBody>
          </StructuredListWrapper>
        )}
      </div>
    </div>
  );
}

/**
 * Live Preview section
 */
interface LivePreviewProps {
  config: DisplayConfigV2;
  testData: any;
}

function LivePreview({ config, testData }: LivePreviewProps) {
  const [previewData, setPreviewData] = useState(testData);

  // Import MonitorRenderer dynamically to avoid circular dependencies
  const [MonitorRenderer, setMonitorRenderer] = React.useState<any>(null);

  React.useEffect(() => {
    import('../../renderers/MonitorRenderer').then((module) => {
      setMonitorRenderer(() => module.MonitorRenderer);
    });
  }, []);

  // Sync previewData when testData changes
  React.useEffect(() => {
    if (testData) {
      setPreviewData(testData);
    }
  }, [testData]);

  // Create sample data if no test data available (memoized)
  const sampleData = React.useMemo(() => {
    const sample: any = {};
    const now = Date.now();
    config.fields?.forEach((field, index) => {
      const path = field.path;
      const fieldName = path.startsWith('$.') ? path.slice(2) : field.key;

      switch (field.type) {
        case 'STATUS':
          // Use lowercase to match typical statusMap keys (renderer handles case-insensitive lookup)
          sample[fieldName] = 'up';
          break;
        case 'PERCENTAGE':
          sample[fieldName] = 67;
          break;
        case 'TIMESTAMP':
          // Use a timestamp 2 minutes ago for realistic preview
          sample[fieldName] = now - (2 * 60 * 1000);
          break;
        case 'DURATION':
          sample[fieldName] = 5432;
          break;
        case 'BOOLEAN':
          sample[fieldName] = true;
          break;
        case 'NUMBER':
        case 'INTEGER':
          sample[fieldName] = 100 + index;
          break;
        default:
          sample[fieldName] = `Sample ${field.label}`;
      }
    });

    return sample;
  }, [config.fields]);

  const dataToPreview = previewData || sampleData;

  return (
    <div className="live-preview">
      <div className="live-preview__header">
        <h4>Live Preview</h4>
        <Button kind="ghost" size="sm" onClick={() => setPreviewData(testData)}>
          Refresh Preview
        </Button>
      </div>

      <div className="live-preview__content">
        {MonitorRenderer ? (
          <MonitorRenderer
            config={config}
            data={dataToPreview}
            loading={false}
            error={null}
          />
        ) : (
          <div className="live-preview__placeholder">
            <div className="live-preview__component-type">
              <Tag type="purple">{config.component}</Tag>
            </div>

            <div className="live-preview__fields">
              {config.fields?.slice(0, 5).map((field, index) => (
                <div key={index} className="live-preview__field">
                  <span className="live-preview__field-label">{field.label}:</span>
                  <span className="live-preview__field-value">
                    {field.type === 'STATUS' ? (
                      <Tag type="green">Sample</Tag>
                    ) : field.type === 'PERCENTAGE' ? (
                      '67%'
                    ) : field.type === 'TIMESTAMP' ? (
                      '2024-01-15 10:30 AM'
                    ) : field.type === 'DURATION' ? (
                      '2m 34s'
                    ) : (
                      'Sample value'
                    )}
                  </span>
                </div>
              ))}
            </div>

            <p className="live-preview__note">
              <Information size={16} />
              Loading renderer...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Generated JSON section
 */
interface GeneratedJsonProps {
  config: DisplayConfigV2;
  payload: any;
}

function GeneratedJson({ payload }: GeneratedJsonProps) {
  const [showApiConfig, setShowApiConfig] = useState(true);

  return (
    <div className="generated-json">
      <div className="generated-json__header">
        <h4>Generated Configuration</h4>
        <Stack orientation="horizontal" gap={2}>
          <Toggle
            id="show-api-config"
            labelText="API Config"
            labelA="Hide"
            labelB="Show"
            toggled={showApiConfig}
            onToggle={setShowApiConfig}
          />
        </Stack>
      </div>

      <div className="generated-json__content">
        {/* Display Configuration */}
        <div className="generated-json__section">
          <div className="generated-json__section-header">
            <h5>display_config_json</h5>
            <Button kind="ghost" size="sm" renderIcon={CodeIcon}>
              Copy
            </Button>
          </div>
          <CodeSnippet type="multi" light>
            {JSON.stringify(JSON.parse(payload.displayConfigJson || '{}'), null, 2)}
          </CodeSnippet>
        </div>

        {/* API Configuration */}
        {showApiConfig && (
          <div className="generated-json__section">
            <div className="generated-json__section-header">
              <h5>config_json</h5>
              <Button kind="ghost" size="sm" renderIcon={CodeIcon}>
                Copy
              </Button>
            </div>
            <CodeSnippet type="multi" light>
              {JSON.stringify(JSON.parse(payload.configJson || '{}'), null, 2)}
            </CodeSnippet>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Preview & Review Step Component
 */
export default function PreviewStep() {
  const { state } = useBuilderContext();

  const [activeTab, setActiveTab] = useState<'summary' | 'preview' | 'json'>('summary');

  // Generate configuration and save payload (memoized to prevent re-renders)
  const displayConfig = useMemo(() => generateConfigFromState(state), [state]);
  const savePayload = useMemo(() => stateToSavePayload(state), [state]);

  // Validate
  const validation = useMemo(() => validatePreviewStep(state), [state]);
  const isValid = validation.valid;
  const errors = validation.errors;

  // Sample test data for preview (memoized to prevent re-renders)
  // Using stable dependencies without optional chaining
  const testData = useMemo(() => {
    const data = state.testResult?.data || state.detectedSchema?.rawSample || null;
    return data;
  }, [state.testResult, state.detectedSchema]);

  return (
    <div className="preview-step">
      <div className="preview-step__header">
        <h2>Preview & Review</h2>
        <p className="preview-step__description">
          Review your configuration, see the live preview, and verify the generated JSON before saving.
        </p>
      </div>

      {/* Validation Status */}
      {errors.length > 0 && (
        <InlineNotification
          kind="error"
          title="Configuration Errors"
          subtitle={errors.length > 0 ? `${errors.length} error(s) - see details above` : ''}
          lowContrast
          style={{ marginBottom: '1rem' }}
        />
      )}

      {isValid && (
        <InlineNotification
          kind="success"
          title="Ready to Save"
          subtitle="Your configuration is complete and ready to be saved."
          lowContrast
          style={{ marginBottom: '1rem' }}
          hideCloseButton
        />
      )}

      {/* Tabs */}
      <Tabs
        selectedIndex={['summary', 'preview', 'json'].indexOf(activeTab)}
        onChange={({ selectedIndex }) => {
          setActiveTab(['summary', 'preview', 'json'][selectedIndex] as any);
        }}
      >
        <Tab id="tab-summary">Configuration Summary</Tab>
        <Tab id="tab-preview">Live Preview</Tab>
        <Tab id="tab-json">Generated JSON</Tab>
      </Tabs>

      {/* Tab Content */}
      <div className="preview-step__content">
        {activeTab === 'summary' && <ConfigSummary state={state} />}
        {activeTab === 'preview' && <LivePreview config={displayConfig} testData={testData} />}
        {activeTab === 'json' && <GeneratedJson config={displayConfig} payload={savePayload} />}
      </div>

      {/* Save Readiness */}
      <div className="preview-step__footer">
        <div className="preview-step__footer-content">
          {isValid ? (
            <div className="preview-step__ready">
              <CheckmarkFilled size={20} />
              <span>
                <strong>Ready to save!</strong> Click the Save Monitor button to create your ETL monitor.
              </span>
            </div>
          ) : (
            <div className="preview-step__not-ready">
              <WarningFilled size={20} />
              <span>
                <strong>Configuration incomplete.</strong> Please fix the errors before saving.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

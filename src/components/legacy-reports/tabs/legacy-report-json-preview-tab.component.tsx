import React from 'react';
import {
  Tile,
  Button,
  Stack,
  CodeSnippet,
  InlineNotification,
  StructuredListBody,
  StructuredListRow,
  StructuredListCell,
  Tag,
  Grid,
  Column,
} from '@carbon/react';
import { Download, Copy, Checkmark } from '@carbon/icons-react';
import type { LegacyReportConfig } from '../legacy-report-editor-page.component';

type Props = {
  report: LegacyReportConfig;
  onChange: (report: LegacyReportConfig) => void;
};

const LegacyReportJsonPreviewTab: React.FC<Props> = ({ report }) => {
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleCopyToClipboard = () => {
    try {
      const json = JSON.stringify(report, null, 2);
      navigator.clipboard.writeText(json);
      setCopied(true);
      setError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
      console.error('Copy failed:', err);
    }
  };

  const handleDownloadJson = () => {
    try {
      const json = JSON.stringify(report, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.name.replace(/\s+/g, '_') || 'legacy_report'}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err) {
      setError('Failed to download JSON file');
      console.error('Download failed:', err);
    }
  };

  const validateReport = () => {
    const validationErrors = [];

    if (!report.name?.trim()) {
      validationErrors.push('Report name is required');
    }

    if (!report.parameters || report.parameters.length === 0) {
      validationErrors.push('At least one parameter is required');
    }

    if (!report.advancedFeatures?.indicatorDataSet?.indicators?.length) {
      validationErrors.push('At least one indicator is required');
    }

    // Validate indicators
    report.advancedFeatures?.indicatorDataSet?.indicators?.forEach((ind, index) => {
      if (!ind.key?.trim()) {
        validationErrors.push(`Indicator at index ${index} is missing a key`);
      }

      if (ind.type === 'BASE' && !ind.sqlQuery?.trim()) {
        validationErrors.push(`Indicator "${ind.key}" is missing SQL query`);
      }

      if (ind.type === 'COMPOSITE' && !ind.formula?.trim()) {
        validationErrors.push(`Indicator "${ind.key}" is missing formula`);
      }

      if (ind.type === 'TEMPORAL' && !ind.baseIndicator?.trim()) {
        validationErrors.push(`Indicator "${ind.key}" is missing base indicator reference`);
      }
    });

    // Validate datasets
    report.dataSetDefinitions?.forEach((ds, index) => {
      if (!ds.name?.trim()) {
        validationErrors.push(`Dataset at index ${index} is missing a name`);
      }

      if (ds.type === 'SQL_DATA_SET' && !ds.config?.sql?.trim()) {
        validationErrors.push(`Dataset "${ds.name}" is missing SQL query`);
      }
    });

    return validationErrors;
  };

  const validationErrors = validateReport();
  const isValid = validationErrors.length === 0;

  const getReportStats = () => {
    const indicators = report.advancedFeatures?.indicatorDataSet?.indicators || [];
    const dimensions = report.advancedFeatures?.indicatorDataSet?.dimensionDefinitions || [];
    const datasets = report.dataSetDefinitions || [];

    return {
      baseIndicators: indicators.filter((ind) => ind.type === 'BASE').length,
      compositeIndicators: indicators.filter((ind) => ind.type === 'COMPOSITE').length,
      temporalIndicators: indicators.filter((ind) => ind.type === 'TEMPORAL').length,
      totalIndicators: indicators.length,
      dimensions: dimensions.length,
      datasets: datasets.length,
      parameters: report.parameters?.length || 0,
    };
  };

  const stats = getReportStats();

  return (
    <Stack gap={6}>
      {/* Statistics and Validation */}
      <Grid narrow>
        <Column lg={8}>
          <Tile>
            <h4 style={{ marginTop: 0 }}>Report Statistics</h4>
            <StructuredListBody>
              <StructuredListRow>
                <StructuredListCell>Parameters</StructuredListCell>
                <StructuredListCell>{stats.parameters}</StructuredListCell>
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell>Total Indicators</StructuredListCell>
                <StructuredListCell>{stats.totalIndicators}</StructuredListCell>
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell>Base Indicators</StructuredListCell>
                <StructuredListCell>
                  <Tag type="blue">{stats.baseIndicators}</Tag>
                </StructuredListCell>
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell>Composite Indicators</StructuredListCell>
                <StructuredListCell>
                  <Tag type="green">{stats.compositeIndicators}</Tag>
                </StructuredListCell>
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell>Temporal Indicators</StructuredListCell>
                <StructuredListCell>
                  <Tag type="purple">{stats.temporalIndicators}</Tag>
                </StructuredListCell>
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell>Dimensions</StructuredListCell>
                <StructuredListCell>{stats.dimensions}</StructuredListCell>
              </StructuredListRow>
              <StructuredListRow>
                <StructuredListCell>Datasets</StructuredListCell>
                <StructuredListCell>{stats.datasets}</StructuredListCell>
              </StructuredListRow>
            </StructuredListBody>
          </Tile>
        </Column>

        <Column lg={8}>
          <Tile style={{ background: isValid ? 'var(--cds-background-success)' : 'var(--cds-background-warning)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {isValid ? (
                <Checkmark size={20} style={{ color: 'var(--cds-support-success)' }} />
              ) : (
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              )}
              <strong style={{ fontSize: '1rem' }}>
                {isValid ? 'Valid Configuration' : 'Validation Issues'}
              </strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.85 }}>
              {isValid
                ? 'This report configuration appears to be complete and well-formed.'
                : `Found ${validationErrors.length} issue${validationErrors.length !== 1 ? 's' : ''} that should be reviewed.`}
            </p>
          </Tile>

          {error && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={error}
              style={{ marginTop: '1rem' }}
              onCloseButtonClick={() => setError(null)}
            />
          )}

          {!isValid && validationErrors.length > 0 && (
            <Tile style={{ marginTop: '1rem', background: 'var(--cds-field-01)', padding: '1rem' }}>
              <h6 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Validation Issues:</h6>
              <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                {validationErrors.map((err, index) => (
                  <li key={index} style={{ marginBottom: '0.25rem' }}>{err}</li>
                ))}
              </ul>
            </Tile>
          )}
        </Column>
      </Grid>

      {/* Export Actions */}
      <Tile>
        <h4 style={{ marginTop: 0 }}>Export Configuration</h4>
        <p style={{ opacity: 0.7, marginBottom: '1rem' }}>
          Download or copy the complete JSON configuration for this report
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            kind="secondary"
            renderIcon={copied ? Checkmark : Copy}
            onClick={handleCopyToClipboard}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
          <Button
            kind="primary"
            renderIcon={Download}
            onClick={handleDownloadJson}
          >
            Download JSON
          </Button>
        </div>
      </Tile>

      {/* JSON Preview */}
      <Tile>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0 }}>Complete JSON Configuration</h4>
          <Tag type="gray">{JSON.stringify(report, null, 2).length} characters</Tag>
        </div>

        <div style={{ maxHeight: '600px', overflow: 'auto' }}>
          <CodeSnippet type="multi">
            {JSON.stringify(report, null, 2)}
          </CodeSnippet>
        </div>
      </Tile>

      {/* Usage Information */}
      <Tile style={{ background: 'var(--cds-background-information)' }}>
        <h5 style={{ marginTop: 0 }}>Using This Configuration</h5>
        <p style={{ opacity: 0.85, margin: '0.5rem 0' }}>
          This JSON configuration represents the complete definition of your legacy report. You can:
        </p>
        <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem', opacity: 0.85 }}>
          <li><strong>Save it:</strong> Store this configuration in your configuration repository</li>
          <li><strong>Version it:</strong> Track changes to report definitions over time</li>
          <li><strong>Share it:</strong> Distribute report configurations across facilities</li>
          <li><strong>Import it:</strong> Upload this JSON to create reports in other systems</li>
          <li><strong>Test it:</strong> Use the configuration to validate report behavior</li>
        </ul>
      </Tile>
    </Stack>
  );
};

export default LegacyReportJsonPreviewTab;

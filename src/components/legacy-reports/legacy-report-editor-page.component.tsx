import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  InlineLoading,
  InlineNotification,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Tag,
} from '@carbon/react';
import { ArrowLeft, Save, View } from '@carbon/icons-react';

import Header from '../shared/header/header.component';
import { getLegacyReport } from '../../resources/legacy-reports/legacy-reports.api';

// Import tab components
import LegacyReportOverviewTab from './tabs/legacy-report-overview-tab.component';
import LegacyReportParametersTab from './tabs/legacy-report-parameters-tab.component';
import LegacyReportIndicatorsTab from './tabs/legacy-report-indicators-tab.component';
import LegacyReportDimensionsTab from './tabs/legacy-report-dimensions-tab.component';
import LegacyReportDatasetsTab from './tabs/legacy-report-datasets-tab.component';
import LegacyReportJsonPreviewTab from './tabs/legacy-report-json-preview-tab.component';

// Types
export type LegacyReportConfig = {
  uuid?: string;
  name: string;
  description?: string;
  version?: string;
  parameters: Array<{
    name: string;
    label: string;
    type: string;
  }>;
  advancedFeatures: {
    indicatorDataSet: {
      enabled: boolean;
      indicators: Array<{
        key: string;
        type: 'BASE' | 'COMPOSITE' | 'TEMPORAL';
        sqlQuery?: string;
        formula?: string;
        baseIndicator?: string;
        timePeriods?: string[];
        disaggregation: string[];
      }>;
      dimensionDefinitions: Array<{
        name: string;
        type: 'AGE_GROUPS' | 'CONCEPT';
        groups: Array<{
          key: string;
          label: string;
          minAge?: number;
          maxAge?: number;
          ageUnit?: string;
          conceptUuid?: string;
        }>;
      }>;
    };
  };
  dataSetDefinitions: Array<{
    name: string;
    type: string;
    config: {
      sql: string;
    };
  }>;
  category?: string;
  subcategory?: string;
  reportType?: string;
  reportYear?: string;
  reportScope?: string;
};

const LegacyReportEditorPage: React.FC = () => {
  const { t } = useTranslation();
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();

  const [report, setReport] = React.useState<LegacyReportConfig | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Track if there are unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  React.useEffect(() => {
    const ac = new AbortController();

    if (uuid && uuid !== 'new') {
      setLoading(true);
      setError(null);

      getLegacyReport(uuid, ac.signal)
        .then((data) => {
          // Convert the API response to our editor config format
          const apiData = data as any; // Cast to any to handle API response
          const config: LegacyReportConfig = {
            uuid: apiData.uuid,
            name: apiData.name,
            description: apiData.description,
            version: apiData.version,
            parameters: (apiData.parameters || []).map((param: any) => ({
              name: param.name,
              label: param.label || param.name,
              type: param.type || 'STRING',
            })),
            advancedFeatures: apiData.advancedFeatures || {
              indicatorDataSet: {
                enabled: true,
                indicators: [],
                dimensionDefinitions: [],
              },
            },
            dataSetDefinitions: apiData.dataSetDefinitions || [],
            category: apiData.category,
            subcategory: apiData.subcategory,
            reportType: apiData.reportType,
            reportYear: apiData.reportYear,
            reportScope: apiData.reportScope,
          };
          setReport(config);
        })
        .catch((err) => {
          setError(err?.message ?? 'Failed to load report');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Initialize new report structure
      setReport({
        name: '',
        description: '',
        version: '0.1.0-generic',
        parameters: [
          { name: 'startDate', label: 'Start Date', type: 'DATE' },
          { name: 'endDate', label: 'End Date', type: 'DATE' },
          { name: 'location', label: 'Location', type: 'LOCATION' },
        ],
        advancedFeatures: {
          indicatorDataSet: {
            enabled: true,
            indicators: [],
            dimensionDefinitions: [],
          },
        },
        dataSetDefinitions: [],
        category: 'FACILITY_REPORTS',
        subcategory: 'PATIENT_REGISTERS',
        reportType: 'LINELIST',
        reportYear: 'YEAR_2024',
        reportScope: 'FACILITY_BASED',
      });
      setLoading(false);
    }

    return () => ac.abort();
  }, [uuid]);

  const handleReportChange = (updatedReport: LegacyReportConfig) => {
    setReport(updatedReport);
    setHasUnsavedChanges(true);
    setSuccess(false);
  };

  const handleSave = async () => {
    if (!report) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // TODO: Implement save API call
      // For now, just simulate saving
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccess(true);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate('/legacy-reports');
      }
    } else {
      navigate('/legacy-reports');
    }
  };

  if (loading) {
    return (
      <div>
        <Header
          title={t('legacyReportEditor', 'Legacy Report Editor')}
          subtitle={t('legacyReportEditorSubtitle', 'Edit and configure legacy report definitions')}
        />
        <InlineLoading description="Loading report configuration..." />
      </div>
    );
  }

  if (error && !report) {
    return (
      <div>
        <Header
          title={t('legacyReportEditor', 'Legacy Report Editor')}
          subtitle={t('legacyReportEditorSubtitle', 'Edit and configure legacy report definitions')}
        />
        <InlineNotification kind="error" title="Error" subtitle={error} />
      </div>
    );
  }

  if (!report) return null;

  return (
    <div>
      <Header
        title={
          uuid === 'new'
            ? t('createLegacyReport', 'Create Legacy Report')
            : t('editLegacyReport', 'Edit Legacy Report')
        }
        subtitle={report.name || 'Untitled Report'}
      />

      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Button kind="ghost" renderIcon={ArrowLeft} onClick={handleBack}>
            Back to Reports
          </Button>

          {hasUnsavedChanges && (
            <Tag type="red" size="md">
              Unsaved Changes
            </Tag>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button kind="secondary" renderIcon={View} onClick={() => navigate(`/legacy-reports/${report.uuid}`)}>
            Preview Report
          </Button>
          <Button kind="primary" renderIcon={Save} onClick={handleSave} disabled={saving || !hasUnsavedChanges}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          style={{ marginBottom: '1rem' }}
          onCloseButtonClick={() => setError(null)}
        />
      )}

      {success && (
        <InlineNotification
          kind="success"
          title="Success"
          subtitle="Report saved successfully"
          style={{ marginBottom: '1rem' }}
          onCloseButtonClick={() => setSuccess(false)}
        />
      )}

      <Tabs>
        <TabList aria-label="Legacy report editor tabs">
          <Tab>Overview</Tab>
          <Tab>Parameters</Tab>
          <Tab>Indicators</Tab>
          <Tab>Dimensions</Tab>
          <Tab>Datasets</Tab>
          <Tab>JSON Preview</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <LegacyReportOverviewTab report={report} onChange={handleReportChange} />
          </TabPanel>

          <TabPanel>
            <LegacyReportParametersTab report={report} onChange={handleReportChange} />
          </TabPanel>

          <TabPanel>
            <LegacyReportIndicatorsTab report={report} onChange={handleReportChange} />
          </TabPanel>

          <TabPanel>
            <LegacyReportDimensionsTab report={report} onChange={handleReportChange} />
          </TabPanel>

          <TabPanel>
            <LegacyReportDatasetsTab report={report} onChange={handleReportChange} />
          </TabPanel>

          <TabPanel>
            <LegacyReportJsonPreviewTab report={report} onChange={handleReportChange} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default LegacyReportEditorPage;

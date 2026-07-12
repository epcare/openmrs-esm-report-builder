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
  Tile,
  StructuredListBody,
  StructuredListRow,
  StructuredListCell,
  Tag,
  Accordion,
  AccordionItem,
  CodeSnippet,
} from '@carbon/react';
import { ArrowLeft, Upload, Download, Edit } from '@carbon/icons-react';

import Header from '../shared/header/header.component';
import { getLegacyReport } from '../../resources/legacy-reports/legacy-reports.api';

const LegacyReportDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();

  const [report, setReport] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const ac = new AbortController();

    if (uuid) {
      setLoading(true);
      setError(null);

      getLegacyReport(uuid, ac.signal)
        .then((data) => {
          setReport(data);
        })
        .catch((err) => {
          setError(err?.message ?? 'Failed to load report details');
        })
        .finally(() => {
          setLoading(false);
        });
    }

    return () => ac.abort();
  }, [uuid]);

  const handleImport = () => {
    navigate(`/legacy-reports/${uuid}/import`);
  };

  const handleEdit = () => {
    navigate(`/legacy-reports/${uuid}/edit`);
  };

  if (loading) {
    return (
      <div>
        <Header
          title={t('legacyReportDetails', 'Legacy Report Details')}
          subtitle={t('legacyReportDetailsSubtitle', 'View and manage legacy report configuration')}
        />
        <InlineLoading description="Loading report details..." />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div>
        <Header
          title={t('legacyReportDetails', 'Legacy Report Details')}
          subtitle={t('legacyReportDetailsSubtitle', 'View and manage legacy report configuration')}
        />
        <InlineNotification kind="error" title="Error" subtitle={error || 'Report not found'} />
      </div>
    );
  }

  return (
    <div>
      <Header
        title={t('legacyReportDetails', 'Legacy Report Details')}
        subtitle={t('legacyReportDetailsSubtitle', 'View and manage legacy report configuration')}
      />

      <div style={{ marginBottom: '1rem' }}>
        <Button
          kind="ghost"
          renderIcon={ArrowLeft}
          onClick={() => navigate('/legacy-reports')}
          style={{ marginRight: '0.5rem' }}
        >
          Back to Legacy Reports
        </Button>

        <Button kind="secondary" renderIcon={Download} disabled style={{ marginRight: '0.5rem' }}>
          Export JSON
        </Button>

        <Button kind="secondary" renderIcon={Edit} onClick={handleEdit} style={{ marginRight: '0.5rem' }}>
          Edit Configuration
        </Button>

        <Button kind="primary" renderIcon={Upload} onClick={handleImport}>
          Import to Builder
        </Button>
      </div>

      <Tabs>
        <TabList aria-label="Report detail tabs">
          <Tab>Overview</Tab>
          <Tab>Parameters</Tab>
          <Tab>Datasets</Tab>
          <Tab>Design</Tab>
          <Tab>JSON Configuration</Tab>
        </TabList>

        <TabPanels>
          {/* Overview Tab */}
          <TabPanel>
            <Tile>
              <h3 style={{ marginTop: 0 }}>Report Overview</h3>

              <StructuredListBody>
                <StructuredListRow>
                  <StructuredListCell>Report Key</StructuredListCell>
                  <StructuredListCell>
                    <code>{report.key}</code>
                  </StructuredListCell>
                </StructuredListRow>

                <StructuredListRow>
                  <StructuredListCell>Report Name</StructuredListCell>
                  <StructuredListCell>
                    <strong>{report.name}</strong>
                  </StructuredListCell>
                </StructuredListRow>

                <StructuredListRow>
                  <StructuredListCell>Description</StructuredListCell>
                  <StructuredListCell>{report.description || '—'}</StructuredListCell>
                </StructuredListRow>

                <StructuredListRow>
                  <StructuredListCell>Status</StructuredListCell>
                  <StructuredListCell>
                    <Tag type="blue">{report.status}</Tag>
                  </StructuredListCell>
                </StructuredListRow>

                <StructuredListRow>
                  <StructuredListCell>UUID</StructuredListCell>
                  <StructuredListCell>
                    <code style={{ fontSize: '0.85em' }}>{report.uuid}</code>
                  </StructuredListCell>
                </StructuredListRow>
              </StructuredListBody>
            </Tile>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <Tile>
                <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
                  {report.parameters?.length || 0}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Parameters</div>
              </Tile>

              <Tile>
                <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
                  {report.datasets?.length || 0}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Datasets</div>
              </Tile>

              <Tile>
                <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
                  {report.designs?.length || 0}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Designs</div>
              </Tile>
            </div>
          </TabPanel>

          {/* Parameters Tab */}
          <TabPanel>
            <Tile>
              <h3 style={{ marginTop: 0 }}>Parameters</h3>
              {report.parameters && report.parameters.length > 0 ? (
                <StructuredListBody>
                  {report.parameters.map((param: any, index: number) => (
                    <StructuredListRow key={index}>
                      <StructuredListCell>
                        <code>{param.name}</code>
                      </StructuredListCell>
                      <StructuredListCell>{param.label || param.name}</StructuredListCell>
                      <StructuredListCell>
                        <code>{param.type || 'java.lang.String'}</code>
                      </StructuredListCell>
                    </StructuredListRow>
                  ))}
                </StructuredListBody>
              ) : (
                <div style={{ opacity: 0.7, padding: '1rem 0' }}>No parameters defined for this report.</div>
              )}
            </Tile>
          </TabPanel>

          {/* Datasets Tab */}
          <TabPanel>
            <Tile>
              <h3 style={{ marginTop: 0 }}>Datasets</h3>
              {report.datasets && report.datasets.length > 0 ? (
                <StructuredListBody>
                  {report.datasets.map((dataset: any, index: number) => (
                    <StructuredListRow key={index}>
                      <StructuredListCell>
                        <code>{dataset.key}</code>
                      </StructuredListCell>
                      <StructuredListCell>
                        <strong>{dataset.name}</strong>
                      </StructuredListCell>
                    </StructuredListRow>
                  ))}
                </StructuredListBody>
              ) : (
                <div style={{ opacity: 0.7, padding: '1rem 0' }}>No datasets defined for this report.</div>
              )}
            </Tile>
          </TabPanel>

          {/* Design Tab */}
          <TabPanel>
            <Tile>
              <h3 style={{ marginTop: 0 }}>Report Design</h3>
              {report.designs && report.designs.length > 0 ? (
                <StructuredListBody>
                  {report.designs.map((design: any, index: number) => (
                    <StructuredListRow key={index}>
                      <StructuredListCell>{design.type || 'Unknown'}</StructuredListCell>
                      <StructuredListCell>{design.name || 'Unnamed Design'}</StructuredListCell>
                      <StructuredListCell>
                        <code>{design.uuid || 'No UUID'}</code>
                      </StructuredListCell>
                    </StructuredListRow>
                  ))}
                </StructuredListBody>
              ) : (
                <div style={{ opacity: 0.7, padding: '1rem 0' }}>No designs defined for this report.</div>
              )}
            </Tile>

            {report.jsonTemplateConfig && Object.keys(report.jsonTemplateConfig).length > 0 && (
              <Tile style={{ marginTop: '1rem' }}>
                <h4 style={{ marginTop: 0 }}>JSON Template Configuration</h4>
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  <Accordion>
                    <AccordionItem title="View Configuration">
                      <CodeSnippet type="multi">
                        {JSON.stringify(report.jsonTemplateConfig, null, 2)}
                      </CodeSnippet>
                    </AccordionItem>
                  </Accordion>
                </div>
              </Tile>
            )}
          </TabPanel>

          {/* JSON Configuration Tab */}
          <TabPanel>
            <Tile>
              <h3 style={{ marginTop: 0 }}>Full JSON Configuration</h3>
              <div style={{ maxHeight: '600px', overflow: 'auto' }}>
                <Accordion>
                  <AccordionItem title="View Complete JSON">
                    <CodeSnippet type="multi">
                      {JSON.stringify(report, null, 2)}
                    </CodeSnippet>
                  </AccordionItem>
                </Accordion>
              </div>
            </Tile>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
};

export default LegacyReportDetailPage;

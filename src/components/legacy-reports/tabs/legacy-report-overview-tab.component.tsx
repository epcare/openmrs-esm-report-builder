import React from 'react';
import {
  TextInput,
  TextArea,
  Select,
  SelectItem,
  FormGroup,
  Tile,
  Stack,
  Grid,
  Column,
} from '@carbon/react';
import { Information } from '@carbon/icons-react';
import type { LegacyReportConfig } from '../legacy-report-editor-page.component';

type Props = {
  report: LegacyReportConfig;
  onChange: (report: LegacyReportConfig) => void;
};

const categories = [
  { value: 'NATIONAL_REPORTS', label: 'National Reports' },
  { value: 'FACILITY_REPORTS', label: 'Facility Reports' },
  { value: 'COMMUNITY_REPORTS', label: 'Community Reports' },
  { value: 'LAB_REPORTS', label: 'Laboratory Reports' },
  { value: 'PHARMACY_REPORTS', label: 'Pharmacy Reports' },
];

const reportTypes = [
  { value: 'AGGREGATE', label: 'Aggregate Report' },
  { value: 'LINELIST', label: 'Patient Line List' },
  { value: 'COHORT', label: 'Cohort Analysis' },
  { value: 'SUMMARY', label: 'Summary Report' },
];

const reportYears = [
  { value: 'BEFORE_2019', label: 'Before 2019' },
  { value: 'YEAR_2019', label: '2019' },
  { value: 'YEAR_2020', label: '2020' },
  { value: 'YEAR_2021', label: '2021' },
  { value: 'YEAR_2022', label: '2022' },
  { value: 'YEAR_2023', label: '2023' },
  { value: 'YEAR_2024', label: '2024' },
  { value: 'YEAR_2025', label: '2025' },
];

const reportScopes = [
  { value: 'NATIONAL_AGGREGATION', label: 'National Aggregation' },
  { value: 'FACILITY_BASED', label: 'Facility Based' },
  { value: 'COMMUNITY_BASED', label: 'Community Based' },
  { value: 'DISTRICT_LEVEL', label: 'District Level' },
  { value: 'REGIONAL_LEVEL', label: 'Regional Level' },
];

const LegacyReportOverviewTab: React.FC<Props> = ({ report, onChange }) => {
  const handleChange = (field: keyof LegacyReportConfig, value: any) => {
    onChange({
      ...report,
      [field]: value,
    });
  };

  return (
    <Stack gap={6}>
      {/* Basic Information */}
      <Tile>
        <h4 style={{ marginTop: 0 }}>Basic Information</h4>
        <Grid narrow>
          <Column lg={8} md={4} sm={4}>
            <FormGroup legendText="">
              <TextInput
                id="report-name"
                labelText="Report Name"
                placeholder="Enter report name"
                value={report.name}
                onChange={(e) => handleChange('name', e.target.value)}
                style={{ marginBottom: '1rem' }}
              />
            </FormGroup>
          </Column>

          <Column lg={8} md={4} sm={4}>
            <FormGroup legendText="">
              <TextInput
                id="report-version"
                labelText="Version"
                placeholder="0.1.0-generic"
                value={report.version || ''}
                onChange={(e) => handleChange('version', e.target.value)}
                style={{ marginBottom: '1rem' }}
              />
            </FormGroup>
          </Column>
        </Grid>

        <FormGroup legendText="">
          <TextArea
            id="report-description"
            labelText="Description"
            placeholder="Enter report description"
            value={report.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
          />
        </FormGroup>
      </Tile>

      {/* Report Classification */}
      <Tile>
        <h4 style={{ marginTop: 0 }}>Report Classification</h4>
        <Grid narrow>
          <Column lg={4} md={4} sm={4}>
            <FormGroup legendText="">
              <Select
                id="report-category"
                labelText="Category"
                value={report.category || ''}
                onChange={(e) => handleChange('category', e.target.value)}
                style={{ marginBottom: '1rem' }}
              >
                <SelectItem value="" text="Select category" />
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value} text={cat.label} />
                ))}
              </Select>
            </FormGroup>
          </Column>

          <Column lg={4} md={4} sm={4}>
            <FormGroup legendText="">
              <TextInput
                id="report-subcategory"
                labelText="Subcategory"
                placeholder="e.g., PATIENT_REGISTERS"
                value={report.subcategory || ''}
                onChange={(e) => handleChange('subcategory', e.target.value)}
                style={{ marginBottom: '1rem' }}
              />
            </FormGroup>
          </Column>

          <Column lg={4} md={4} sm={4}>
            <FormGroup legendText="">
              <Select
                id="report-type"
                labelText="Report Type"
                value={report.reportType || ''}
                onChange={(e) => handleChange('reportType', e.target.value)}
                style={{ marginBottom: '1rem' }}
              >
                <SelectItem value="" text="Select report type" />
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value} text={type.label} />
                ))}
              </Select>
            </FormGroup>
          </Column>

          <Column lg={6} md={4} sm={4}>
            <FormGroup legendText="">
              <Select
                id="report-year"
                labelText="Report Year"
                value={report.reportYear || ''}
                onChange={(e) => handleChange('reportYear', e.target.value)}
                style={{ marginBottom: '1rem' }}
              >
                <SelectItem value="" text="Select report year" />
                {reportYears.map((year) => (
                  <SelectItem key={year.value} value={year.value} text={year.label} />
                ))}
              </Select>
            </FormGroup>
          </Column>

          <Column lg={6} md={4} sm={4}>
            <FormGroup legendText="">
              <Select
                id="report-scope"
                labelText="Report Scope"
                value={report.reportScope || ''}
                onChange={(e) => handleChange('reportScope', e.target.value)}
                style={{ marginBottom: '1rem' }}
              >
                <SelectItem value="" text="Select report scope" />
                {reportScopes.map((scope) => (
                  <SelectItem key={scope.value} value={scope.value} text={scope.label} />
                ))}
              </Select>
            </FormGroup>
          </Column>
        </Grid>
      </Tile>

      {/* Information Section */}
      <Tile style={{ background: 'var(--cds-background-information)' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <Information size={20} style={{ marginTop: '2px' }} />
          <div>
            <strong>About Report Classification</strong>
            <p style={{ margin: '0.5rem 0', opacity: 0.85 }}>
              These classifications help organize and categorize reports for better discoverability and consistency.
              Choose categories and types that best represent your report's purpose and data structure.
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', opacity: 0.85 }}>
              <li><strong>Category:</strong> High-level grouping (National, Facility, Community, etc.)</li>
              <li><strong>Report Type:</strong> Data structure type (Aggregate, Line List, Cohort, etc.)</li>
              <li><strong>Report Scope:</strong> Geographic/organizational scope of the report</li>
              <li><strong>Report Year:</strong> The reporting year or version year this report applies to</li>
            </ul>
          </div>
        </div>
      </Tile>
    </Stack>
  );
};

export default LegacyReportOverviewTab;

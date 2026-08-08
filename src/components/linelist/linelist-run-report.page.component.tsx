/**
 * Linelist Run Report Component
 *
 * Screen for running linelist reports with runtime parameters.
 * Follows design spec section 11: Run report screen.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Button,
  ButtonSet,
  InlineNotification,
  Tag,
  Tile,
  Select,
  SelectItem,
  DataTable,
  Table,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
  TableCell,
  Pagination,
  Loading,
  Grid,
  Column,
  RadioButton,
  RadioButtonGroup,
} from '@carbon/react';
import { ArrowLeft, Download, Renew, Play, Save, View } from '@carbon/react/icons';
import { useNavigate, useParams } from 'react-router-dom';

import {
  getLinelistReport,
  parseLinelistConfig,
  parseLinelistParameters,
  evaluateLinelistReport,
  compileLinelistReport,
} from '../../resources/linelist/linelist-reports.api';
import type { LinelistReportDto, LinelistParameter } from '../../types/linelist-types';
import {
  RELATIVE_PERIOD_OPTIONS,
  type RelativePeriod,
  resolveRelativePeriod,
  formatDate,
} from '../../utils/parameter-resolution';

// Import parameter input components from data-visualizer (reuse)
import DateParameterInput from '../data-visualizer/parameter-inputs/date-parameter-input.component';
import NumberParameterInput from '../data-visualizer/parameter-inputs/number-parameter-input.component';
import BooleanParameterInput from '../data-visualizer/parameter-inputs/boolean-parameter-input.component';
import ListParameterInput from '../data-visualizer/parameter-inputs/list-parameter-input.component';
import LocationParameterInput from '../data-visualizer/parameter-inputs/location-parameter-input.component';
import ConceptParameterInput from '../data-visualizer/parameter-inputs/concept-parameter-input.component';
import IdentifierTypeParameterInput from '../data-visualizer/parameter-inputs/identifier-type-parameter-input.component';
import PersonAttributeParameterInput from '../data-visualizer/parameter-inputs/person-attribute-parameter-input.component';
import TextParameterInput from '../data-visualizer/parameter-inputs/text-parameter-input.component';

import styles from './linelist-run-report.page.scss';

type Props = {};

const LinelistRunReport: React.FC<Props> = () => {
  const navigate = useNavigate();
  const { reportId } = useParams();

  const [report, setReport] = useState<LinelistReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // Runtime parameters
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({});
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

  // Date mode (FIXED or RELATIVE)
  const [dateMode, setDateMode] = useState<'FIXED' | 'RELATIVE'>('FIXED');
  const [relativePeriod, setRelativePeriod] = useState<RelativePeriod | ''>('');

  // Results
  const [results, setResults] = useState<any[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [generatedTime, setGeneratedTime] = useState<Date | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /**
   * Load report details
   */
  useEffect(() => {
    const loadData = async () => {
      if (!reportId) return;

      setLoading(true);
      setError(null);

      try {
        const reportData = await getLinelistReport(reportId);

        setReport(reportData);

        // Initialize default parameter values
        const config = parseLinelistConfig(reportData);
        if (config?.parameters) {
          const defaults: Record<string, any> = {};
          config.parameters.forEach((param) => {
            if (param.defaultValue) {
              defaults[param.name] = param.defaultValue;
            }
            // Set default date values for date parameters without defaults
            if (param.type === 'DATE' && !defaults[param.name]) {
              if (param.name === 'startDate') {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 6);
                defaults.startDate = startDate.toISOString().split('T')[0];
                // Only set endDate if it exists in the parameters
                if (config.parameters.some(p => p.name === 'endDate')) {
                  defaults.endDate = endDate.toISOString().split('T')[0];
                }
              } else if (param.name === 'endDate') {
                defaults.endDate = new Date().toISOString().split('T')[0];
              } else if (param.name.toLowerCase().includes('date') && !param.name.includes('end')) {
                // For other date parameters, use today as default
                defaults[param.name] = new Date().toISOString().split('T')[0];
              }
            }
          });
          setParamValues(defaults);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [reportId]);

  /**
   * Get parameters from report config
   * Uses parseLinelistParameters which reads from metaJson first (for dynamic options)
   * then falls back to configJson
   */
  const getParameters = useCallback((): LinelistParameter[] => {
    if (!report) return [];
    return parseLinelistParameters(report);
  }, [report]);

  /**
   * Get date parameters from report config
   */
  const getDateParameters = useCallback((): LinelistParameter[] => {
    const params = getParameters();
    return params.filter(p => p.type === 'DATE' || p.type === 'DATETIME');
  }, [getParameters]);

  /**
   * Check if report has both startDate and endDate for relative period support
   */
  const supportsRelativePeriod = useCallback(() => {
    const dateParams = getDateParameters();
    return (
      dateParams.some(p => p.name.toLowerCase() === 'startdate' || p.name.toLowerCase() === 'start_date') &&
      dateParams.some(p => p.name.toLowerCase() === 'enddate' || p.name.toLowerCase() === 'end_date')
    );
  }, [getDateParameters]);

  /**
   * Update parameter value
   */
  const updateParamValue = (paramName: string, value: any) => {
    setParamValues((prev) => ({ ...prev, [paramName]: value }));
    // Clear error for this parameter
    if (paramErrors[paramName]) {
      setParamErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[paramName];
        return newErrors;
      });
    }
  };

  /**
   * Update parameter error
   */
  const updateParamError = (paramName: string, error: string | undefined) => {
    setParamErrors((prev) => {
      if (error) {
        return { ...prev, [paramName]: error };
      }
      const newErrors = { ...prev };
      delete newErrors[paramName];
      return newErrors;
    });
  };

  /**
   * Update search query for a parameter
   */
  const updateSearchQuery = (paramName: string, query: string) => {
    setSearchQueries((prev) => ({ ...prev, [paramName]: query }));
  };

  /**
   * Check if parameters are valid
   */
  const areParamsValid = useCallback(() => {
    const params = getParameters();

    // If in RELATIVE mode but no period selected, invalid
    if (dateMode === 'RELATIVE' && supportsRelativePeriod() && !relativePeriod) {
      return false;
    }

    for (const param of params) {
      // Skip date parameters in RELATIVE mode
      if ((param.type === 'DATE' || param.type === 'DATETIME') && dateMode === 'RELATIVE') {
        const isStartDate = param.name.toLowerCase() === 'startdate' || param.name.toLowerCase() === 'start_date';
        const isEndDate = param.name.toLowerCase() === 'enddate' || param.name.toLowerCase() === 'end_date';
        if (isStartDate || isEndDate) continue;
      }

      if (param.required && !paramValues[param.name]) {
        return false;
      }
    }
    return true;
  }, [getParameters, paramValues, dateMode, relativePeriod, supportsRelativePeriod]);

  /**
   * Run the report
   */
  const runReport = useCallback(async () => {
    if (!report || !areParamsValid()) {
      setRunError('Please fill in all required parameters');
      return;
    }

    // If in RELATIVE mode but no period selected, show error
    if (dateMode === 'RELATIVE' && supportsRelativePeriod() && !relativePeriod) {
      setRunError('Please select a reporting period');
      return;
    }

    setRunning(true);
    setRunError(null);
    setResults(null);

    try {
      const config = parseLinelistConfig(report);
      const params = getParameters();

      // Build parameters object from the report config
      const reportParams: Record<string, any> = {};

      // If in RELATIVE mode with period selected, resolve dates
      if (dateMode === 'RELATIVE' && relativePeriod && supportsRelativePeriod()) {
        const { start, end } = resolveRelativePeriod(relativePeriod);
        const dateParams = getDateParameters();

        // Map resolved dates to date parameters
        dateParams.forEach((param, index) => {
          if (index === 0) {
            reportParams[param.name] = formatDate(start);
          } else if (index === 1) {
            reportParams[param.name] = formatDate(end);
          }
        });

        // Add non-date parameters
        params.forEach((param) => {
          if (param.type !== 'DATE' && param.type !== 'DATETIME' && paramValues[param.name]) {
            reportParams[param.name] = paramValues[param.name];
          }
        });
      } else {
        // FIXED mode - use all parameter values
        params.forEach((param) => {
          if (paramValues[param.name]) {
            reportParams[param.name] = paramValues[param.name];
          }
        });
      }

      // Step 1: Compile the report to get the reportDefinitionUuid
      // Pass categoryUuid from config to avoid "category is required" error
      const compileResult = await compileLinelistReport(report.uuid, config?.categoryUuid);
      if (!compileResult.reportDefinitionUuid) {
        setRunError('Failed to compile report - no report definition UUID returned');
        return;
      }

      // Step 2: Evaluate using the compiled reportDefinitionUuid
      const response = await evaluateLinelistReport({
        reportDefinitionUuid: compileResult.reportDefinitionUuid,
        parameters: reportParams,
        maxRows: pageSize * 10, // Get enough rows for pagination
      });

      if (response.success && response.data) {
        // Extract the dataset (usually named PATIENT_LIST)
        const dataSetName = config?.dataSetDefinitions?.[0]?.name || 'PATIENT_LIST';
        const data = response.data[dataSetName] || [];

        // Extract column names from first row
        const cols = data.length > 0 ? Object.keys(data[0]) : [];
        setColumns(cols);
        setResults(data);
        setRecordCount(data.length);
        setGeneratedTime(new Date());
      } else {
        setRunError(response.error || 'Failed to run report');
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Failed to run report');
    } finally {
      setRunning(false);
    }
  }, [report, paramValues, pageSize, areParamsValid, getParameters, getDateParameters, dateMode, relativePeriod, supportsRelativePeriod]);

  /**
   * Export report data
   */
  const exportData = useCallback((format: 'CSV' | 'XLSX') => {
    if (!results || results.length === 0) return;

    // For now, just implement CSV export
    if (format === 'CSV') {
      const headers = columns.join(',');
      const rows = results.map((row) =>
        columns.map((col) => {
          const value = row[col];
          // Escape values containing commas or quotes
          if (value === null || value === undefined) return '';
          const strValue = String(value);
          if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
            return `"${strValue.replace(/"/g, '""')}"`;
          }
          return strValue;
        }).join(',')
      );
      const csv = [headers, ...rows].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report?.name?.replace(/[^a-z0-9]/gi, '_') || 'linelist'}_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // XLSX would require a library like xlsx
      alert('XLSX export not implemented yet');
    }
  }, [results, columns, report]);

  /**
   * Render parameter input based on type
   */
  const renderParameterInput = (param: LinelistParameter) => {
    const value = paramValues[param.name] || '';
    const error = paramErrors[param.name];

    // Skip start/end date parameters in RELATIVE mode - they're handled by the global relative period selector
    if (supportsRelativePeriod() && dateMode === 'RELATIVE') {
      const isStartDate = param.name.toLowerCase() === 'startdate' || param.name.toLowerCase() === 'start_date';
      const isEndDate = param.name.toLowerCase() === 'enddate' || param.name.toLowerCase() === 'end_date';
      if ((param.type === 'DATE' || param.type === 'DATETIME') && (isStartDate || isEndDate)) {
        return null;
      }
    }

    const commonProps = {
      key: param.name,
      parameter: param,
      value,
      error,
      onChange: (newValue: any) => updateParamValue(param.name, newValue),
    };

    switch (param.type) {
      case 'DATE':
      case 'DATETIME':
        return <DateParameterInput {...commonProps} />;

      case 'NUMBER':
        return <NumberParameterInput {...commonProps} />;

      case 'BOOLEAN':
        return <BooleanParameterInput {...commonProps} />;

      case 'LIST':
        return <ListParameterInput {...commonProps} />;

      case 'LOCATION':
        return (
          <LocationParameterInput
            {...commonProps}
            onSearchQueryChange={(query) => updateSearchQuery(param.name, query)}
          />
        );

      case 'CONCEPT':
        return (
          <ConceptParameterInput
            {...commonProps}
            searchQuery={searchQueries[param.name] || ''}
            onSearchQueryChange={(query) => updateSearchQuery(param.name, query)}
          />
        );

      case 'IDENTIFIER_TYPE':
        return <IdentifierTypeParameterInput {...commonProps} />;

      case 'PERSON_ATTRIBUTE':
        return <PersonAttributeParameterInput {...commonProps} />;

      case 'TEXT':
      default:
        return (
          <TextParameterInput
            {...commonProps}
            onError={(error) => updateParamError(param.name, error)}
          />
        );
    }
  };

  const config = report ? parseLinelistConfig(report) : null;
  const parameters = getParameters();
  const hasResults = results && results.length > 0;

  /**
   * Get paginated data
   */
  const paginatedData = hasResults
    ? results.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : [];

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <Loading description="Loading report..." withOverlay={false} active />
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className={styles.page}>
        <InlineNotification kind="error" title="Error" subtitle={error} />
        <Button kind="secondary" renderIcon={ArrowLeft} onClick={() => navigate('/linelist')}>
          Back to Linelist Reports
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <Button kind="ghost" renderIcon={ArrowLeft} onClick={() => navigate('/linelist')}>
          Back to Linelist Reports
        </Button>
        <div className={styles.reportInfo}>
          <h1 className={styles.title}>{report?.name}</h1>
          {report?.description && <p className={styles.description}>{report.description}</p>}
          <div className={styles.meta}>
            {config?.rowGrain && (
              <Tag type="blue" size="sm">
                {config.rowGrain.replace('_', ' ')}
              </Tag>
            )}
            {report?.retired && <Tag type="red" size="sm">Retired</Tag>}
          </div>
        </div>
      </div>

      {/* Parameters Section */}
      {parameters.length > 0 && (
        <div className={styles.parametersSection}>
          <div className={styles.parametersHeader}>
            <h2 className={styles.parametersTitle}>Report Parameters</h2>
            <p className={styles.parametersDescription}>
              Configure the parameters for this report run, then click "Run Report" to view results.
            </p>
          </div>

          {/* Date Mode Toggle - shown ONLY if report has both startDate AND endDate */}
          {supportsRelativePeriod() && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="cds--label">Date Selection Mode</label>
              <RadioButtonGroup
                legendText=""
                name="date-mode"
                valueSelected={dateMode}
                onChange={(mode) => {
                  setDateMode(mode as 'FIXED' | 'RELATIVE');
                  // Clear relative period when switching to FIXED
                  if (mode === 'FIXED') {
                    setRelativePeriod('');
                  }
                }}
              >
                <RadioButton
                  id="date-mode-fixed"
                  labelText="Specific dates"
                  value="FIXED"
                />
                <RadioButton
                  id="date-mode-relative"
                  labelText="Relative period"
                  value="RELATIVE"
                />
              </RadioButtonGroup>
            </div>
          )}

          {/* Relative Period Selector - shown in RELATIVE mode */}
          {dateMode === 'RELATIVE' && supportsRelativePeriod() && (
            <div style={{ marginBottom: '1.5rem', maxWidth: '300px' }}>
              <Select
                id="relative-period-select"
                labelText="Select reporting period"
                value={relativePeriod}
                onChange={(e) => {
                  setRelativePeriod(e.target.value as RelativePeriod);
                }}
                size="sm"
              >
                <SelectItem value="" text="Select period" />
                {RELATIVE_PERIOD_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    text={option.label}
                  />
                ))}
              </Select>
              {paramErrors.relativePeriod && (
                <div style={{ color: '#da1e28', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  {paramErrors.relativePeriod}
                </div>
              )}
            </div>
          )}

          <Grid fullWidth className={styles.parametersGrid}>
            {parameters.map((param) => {
              const rendered = renderParameterInput(param);
              if (!rendered) return null;
              return (
                <Column key={param.name} md={4} lg={4}>
                  <div className={styles.parameterField}>
                    {rendered}
                  </div>
                </Column>
              );
            })}
          </Grid>

          <div className={styles.actions}>
            <ButtonSet>
              <Button
                kind="primary"
                renderIcon={Play}
                onClick={runReport}
                disabled={running || !areParamsValid()}
              >
                {running ? 'Running...' : 'Run Report'}
              </Button>
              <Button kind="secondary" renderIcon={Renew} onClick={() => {
                setParamValues({});
                setRelativePeriod('');
                setDateMode('FIXED');
              }} disabled={running}>
                Reset
              </Button>
              <Button
                kind="ghost"
                renderIcon={Save}
                onClick={() => {
                  // TODO: Implement save preset functionality
                  alert('Save preset functionality not yet implemented');
                }}
                disabled={running}
              >
                Save Preset
              </Button>
            </ButtonSet>
          </div>

          {runError && (
            <InlineNotification
              kind="error"
              title="Run Error"
              subtitle={runError}
              onClose={() => setRunError(null)}
            />
          )}
        </div>
      )}

      {/* Results Section */}
      {hasResults && (
        <div className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <div className={styles.resultsInfo}>
              <h2 className={styles.resultsTitle}>Results</h2>
              <div className={styles.stats}>
                <span>Records: <strong>{recordCount}</strong></span>
                <span>
                  Generated: <strong>{generatedTime?.toLocaleString()}</strong>
                </span>
                {parameters.some((p) => p.name === 'startDate' || p.name === 'endDate') && (
                  <span>
                    {parameters.some((p) => p.name === 'startDate')
                      ? `Date Range: ${paramValues.startDate} to ${paramValues.endDate || 'N/A'}`
                      : `Report Date: ${paramValues.endDate || paramValues.date || 'N/A'}`
                    }
                  </span>
                )}
              </div>
            </div>
            <div className={styles.exportActions}>
              <ButtonSet>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Download}
                  onClick={() => exportData('CSV')}
                >
                  Export CSV
                </Button>
                <Button
                  kind="ghost"
                  size="sm"
                  onClick={() => exportData('XLSX')}
                >
                  Export XLSX
                </Button>
              </ButtonSet>
            </div>
          </div>

          {/* Data Table */}
          <DataTable
            rows={paginatedData.map((row, idx) => ({ id: idx, ...row }))}
            headers={columns.map((col) => ({ key: col, header: col }))}
          >
            {({ rows, headers, getHeaderProps, getTableProps }) => (
              <TableContainer>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHeader {...getHeaderProps({ header })} key={header.key}>
                          {header.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        {headers.map((header) => (
                          <TableCell key={header.key}>{(row as any)[header.key] ?? '-'}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>

          {/* Pagination */}
          <Pagination
            totalItems={results.length}
            pageSize={pageSize}
            pageSizes={[25, 50, 100]}
            page={currentPage}
            onChange={({ page, pageSize: newSize }) => {
              setCurrentPage(page);
              setPageSize(newSize);
            }}
          />
        </div>
      )}

      {/* No Results */}
      {!running && !hasResults && parameters.length === 0 && (
        <Tile className={styles.emptyState}>
          <View size={48} />
          <h3>No Parameters Required</h3>
          <p>This report has no configurable parameters.</p>
          <Button kind="primary" renderIcon={Play} onClick={runReport}>
            Run Report
          </Button>
        </Tile>
      )}

      {!running && !hasResults && parameters.length > 0 && (
        <Tile className={styles.emptyState}>
          <View size={48} />
          <h3>Ready to Run</h3>
          <p>Configure the parameters above and click "Run Report" to view results.</p>
        </Tile>
      )}
    </div>
  );
};

export default LinelistRunReport;

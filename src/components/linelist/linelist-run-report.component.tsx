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
  TextInput,
  DatePicker,
  DatePickerInput,
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
} from '@carbon/react';
import { ArrowLeft, Download, Renew, Play, Save, View } from '@carbon/react/icons';
import { useNavigate, useParams } from 'react-router-dom';

import {
  getLinelistReport,
  parseLinelistConfig,
  evaluateLinelistReport,
} from '../../resources/linelist/linelist-reports.api';
import type { LinelistReportDto, LinelistParameter } from '../../types/linelist-types';

import styles from './linelist-run-report.scss';

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
            // Set default date range for date parameters
            if (param.type === 'DATE' && !defaults[param.name]) {
              if (param.name === 'startDate') {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 6);
                defaults.startDate = startDate.toISOString().split('T')[0];
                defaults.endDate = endDate.toISOString().split('T')[0];
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
   */
  const getParameters = useCallback((): LinelistParameter[] => {
    if (!report) return [];
    const config = parseLinelistConfig(report);
    return config?.parameters || [];
  }, [report]);

  /**
   * Update parameter value
   */
  const updateParamValue = (paramName: string, value: any) => {
    setParamValues((prev) => ({ ...prev, [paramName]: value }));
  };

  /**
   * Check if parameters are valid
   */
  const areParamsValid = useCallback(() => {
    const params = getParameters();
    for (const param of params) {
      if (param.required && !paramValues[param.name]) {
        return false;
      }
    }
    return true;
  }, [getParameters, paramValues]);

  /**
   * Run the report
   */
  const runReport = useCallback(async () => {
    if (!report || !areParamsValid()) {
      setRunError('Please fill in all required parameters');
      return;
    }

    setRunning(true);
    setRunError(null);
    setResults(null);

    try {
      const config = parseLinelistConfig(report);
      const startDate = paramValues.startDate || new Date().toISOString().split('T')[0];
      const endDate = paramValues.endDate || new Date().toISOString().split('T')[0];

      const response = await evaluateLinelistReport({
        reportUuid: report.uuid,
        startDate,
        endDate,
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
  }, [report, paramValues, pageSize, areParamsValid]);

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
    const value = paramValues[param.name];
    const required = param.required;

    switch (param.type) {
      case 'DATE':
      case 'DATETIME':
        return (
          <DatePicker
            dateFormat="Y-m-d"
            value={value ? new Date(value) : null}
            onChange={(date) => {
              if (date && date.length > 0) {
                const dateObj = date[0];
                const dateStr = dateObj instanceof Date ? dateObj.toISOString().split('T')[0] : dateObj;
                updateParamValue(param.name, dateStr);
              }
            }}
          >
            <DatePickerInput
              id={`param-${param.name}`}
              labelText={param.label}
              placeholder={param.label}
              disabled={running}
            />
          </DatePicker>
        );

      case 'TEXT':
      case 'NUMBER':
        return (
          <TextInput
            id={`param-${param.name}`}
            labelText={param.label}
            value={value || ''}
            onChange={(e) => updateParamValue(param.name, (e.target as HTMLInputElement).value)}
            disabled={running}
            required={required}
            placeholder={param.name}
          />
        );

      case 'BOOLEAN':
        return (
          <Select
            id={`param-${param.name}`}
            labelText={param.label}
            value={value !== undefined ? String(value) : ''}
            onChange={(e) => updateParamValue(param.name, (e.target as HTMLSelectElement).value === 'true')}
            disabled={running}
            required={required}
          >
            <SelectItem value="" text="Select..." />
            <SelectItem value="true" text="Yes" />
            <SelectItem value="false" text="No" />
          </Select>
        );

      case 'LOCATION':
      case 'PROGRAM':
      case 'PROVIDER':
      case 'CONCEPT':
      case 'CODED_VALUE':
        // These would typically use specialized pickers
        // For now, use a simple text input
        return (
          <TextInput
            id={`param-${param.name}`}
            labelText={param.label}
            value={value || ''}
            onChange={(e) => updateParamValue(param.name, (e.target as HTMLInputElement).value)}
            disabled={running}
            required={required}
            placeholder={`Enter ${param.label.toLowerCase()}...`}
            helperText={`${param.type} - In production, this would use a specialized picker`}
          />
        );

      default:
        return (
          <TextInput
            id={`param-${param.name}`}
            labelText={param.label}
            value={value || ''}
            onChange={(e) => updateParamValue(param.name, (e.target as HTMLInputElement).value)}
            disabled={running}
            required={required}
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

          <Grid fullWidth className={styles.parametersGrid}>
            {parameters.map((param) => (
              <Column key={param.name} md={4} lg={4}>
                <div className={styles.parameterField}>
                  {renderParameterInput(param)}
                </div>
              </Column>
            ))}
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
              <Button kind="secondary" renderIcon={Renew} onClick={() => setParamValues({})} disabled={running}>
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
                {parameters.some((p) => p.name === 'startDate') && (
                  <span>
                    Date Range: <strong>{paramValues.startDate}</strong> to <strong>{paramValues.endDate}</strong>
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

/**
 * Report Visualizer Page - Two-Panel Layout
 *
 * Main container for the report visualizer with collapsible explorer and workspace panels.
 * Adapts collapse pattern from linelist-builder-workspace.component.tsx
 *
 * Phase 6: Integration with existing APIs (getReport, downloadReport, sendReportToDHIS2)
 *
 * Layout:
 * - Left Panel (Explorer): Search, filters, report list, parameters, run button
 * - Right Panel (Workspace): Report title, view tabs, results
 */
import React, { useState, useCallback, useEffect } from 'react';
import styles from './report-visualizer.scss';

// Import custom hooks
import { useReports, useReportParameters, useExplorerPreferences, useReportCapabilities } from './hooks';

// Import components
import ReportExplorerPanel from './components/ReportExplorer/ReportExplorerPanel';
import ReportWorkspacePanel from './components/ReportWorkspace/ReportWorkspacePanel';

// Import categories hook
import { useGetReportCategories } from '../../components/data-visualizer/data-visualizer.resource';

// Import API functions for integration
import {
  getReport,
  downloadReport,
  sendReportToDHIS2,
} from '../../components/data-visualizer/data-visualizer.resource';

// Import utilities
import { formatDate } from '../../components/data-visualizer/data-visualizer.resource';
import { showToast, showNotification } from '@openmrs/esm-framework';

import type { ReportLibraryItem, ReportViewType } from './types';

const ReportVisualizerPage: React.FC = () => {
  // ===== PREFERENCES =====
  // Load user preferences from localStorage
  const {
    preferences,
    setExplorerExpanded,
    setLastActiveView,
    isLoaded: prefsLoaded,
  } = useExplorerPreferences();

  // ===== PANEL STATE =====
  // Panel state - initialized from preferences
  const [explorerCollapsed, setExplorerCollapsed] = useState(!preferences.explorerExpanded);
  const [explorerWidth, setExplorerWidth] = useState(preferences.explorerWidth);

  // Resizable state
  const [isResizing, setIsResizing] = useState(false);

  // ===== FILTER STATE =====
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // ===== SELECTION STATE =====
  const [selectedReportUuid, setSelectedReportUuid] = useState<string | undefined>();

  // ===== VIEW STATE =====
  const [activeView, setActiveView] = useState<ReportViewType>('TABLE');

  // ===== REPORT EXECUTION STATE =====
  const [runningReport, setRunningReport] = useState(false);
  const [reportResults, setReportResults] = useState<any>(null);
  const [dhisJson, setDhisJson] = useState({});
  const [htmlContent, setHTML] = useState('');

  // ===== USE HOOKS =====
  // Get reports with filtering
  const { filteredReports, loading: loadingReports, getReportByUuid, availableTags } = useReports({
    searchQuery,
    selectedCategory,
    selectedTags,
  });

  // Get categories
  const { reportCategories, isLoadingReportCategories: loadingCategories } = useGetReportCategories();

  // Get selected report object
  const selectedReport = selectedReportUuid ? getReportByUuid(selectedReportUuid) || null : null;

  // Get parameters for selected report
  const {
    parameters: reportParameters,
    values: parameterValues,
    errors: parameterErrors,
    setValues: setParameterValues,
    validate: validateParameters,
    reset: resetParameters,
    // hasParameters,
  } = useReportParameters({ report: selectedReport });

  // Get capabilities for selected report
  const { capabilities } = useReportCapabilities(selectedReport);

  // ===== PANEL RESIZE =====
  /**
   * Handle panel resize with mouse
   * Adapted from linelist-builder-workspace.component.tsx lines 1258-1294
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(280, Math.min(700, e.clientX));
        setExplorerWidth(newWidth);
        setExplorerWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing]);

  /**
   * Start resizing explorer panel
   */
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  /**
   * Collapse explorer panel
   */
  const handleCollapse = useCallback(() => {
    setExplorerCollapsed(true);
    setExplorerExpanded(false);
  }, [setExplorerExpanded]);

  /**
   * Expand explorer panel
   */
  const handleExpand = useCallback(() => {
    setExplorerCollapsed(false);
    setExplorerExpanded(true);
  }, [setExplorerExpanded]);

  // ===== FILTER HANDLERS =====
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleCategoryChange = useCallback((category?: string) => {
    setSelectedCategory(category);
  }, []);

  const handleTagsChange = useCallback((tags: string[]) => {
    setSelectedTags(tags);
  }, []);

  // ===== REPORT SELECTION =====
  const handleReportSelect = useCallback((report: ReportLibraryItem) => {
    setSelectedReportUuid(report.uuid);
    // Reset previous results
    setReportResults(null);
    setHTML('');
    setDhisJson({});
  }, []);

  // ===== PARAMETER HANDLERS =====
  const handleParameterChange = useCallback((values: Record<string, any>) => {
    setParameterValues(values);
  }, [setParameterValues]);

  const handleParametersReset = useCallback(() => {
    resetParameters();
  }, [resetParameters]);

  // ===== VIEW CHANGE =====
  const handleViewChange = useCallback((view: ReportViewType) => {
    setActiveView(view);
    setLastActiveView(view);
  }, [setLastActiveView]);

  // ===== REPORT EXECUTION =====
  /**
   * Handle run report click - ONLY triggered when user clicks the Run Report button
   * Validates parameters and executes the report using getReport API
   */
  const handleRunReport = useCallback(async () => {
    console.log('handleRunReport called - user clicked Run Report button');

    if (!selectedReport) return;

    // Validate required parameters
    if (!validateParameters()) {
      showNotification({
        title: 'Validation Error',
        kind: 'error',
        critical: false,
        description: 'Please fill in all required parameters',
      });
      return;
    }

    setRunningReport(true);
    setReportResults(null);
    setHTML('');
    setDhisJson({});

    try {
      // Get the report UUID (use reportDefinitionUuid if available, otherwise use uuid)
      const reportUuid = selectedReport.reportDefinitionUuid || selectedReport.reportBuilderReportUuid || selectedReport.uuid;

      // Determine report type based on reportType field
      const reportType = selectedReport.reportType === 'LINE_LIST' || selectedReport.reportType === 'linelist' || selectedReport.reportType === 'linelistDataSet'
        ? 'fixed'
        : 'custom';

      console.log('Report type detection:', {
        reportType: selectedReport.reportType,
        determinedAs: reportType,
        selectedReport
      });

      // Build request parameters
      const requestParams: any = {
        uuid: reportUuid,
        startDate: parameterValues.startDate || formatDate(new Date()),
        endDate: parameterValues.endDate || formatDate(new Date()),
        reportType,
        parameters: parameterValues,
      };

      console.log('Executing report:', selectedReport.name);
      console.log('Request params:', requestParams);

      // Call getReport API
      const response = await getReport(requestParams);

      if (response.status === 200) {
        const reportData = response.data;

        console.log('Report response data:', reportData);
        console.log('Report type:', reportType);
        console.log('Has linelistDataSet:', !!reportData.linelistDataSet);
        console.log('Has _html:', !!reportData._html);
        console.log('Has results:', !!reportData.results);

        // Handle different response formats
        if (reportType === 'fixed') {
          // Handle fixed format (linelist reports, etc.)

          // Check for linelistDataSet first (preferred for tabular data)
          if (reportData.linelistDataSet && Array.isArray(reportData.linelistDataSet) && reportData.linelistDataSet.length > 0) {
            const data = reportData.linelistDataSet;
            const columns = Object.keys(data[0] || {});

            console.log('Parsing linelistDataSet:', {
              dataLength: data.length,
              columns,
              firstRow: data[0],
            });

            setReportResults({
              rowCount: data.length,
              generatedTime: new Date().toISOString(),
              parameters: parameterValues,
              columns,
              data,
            });

            // Also set HTML if available for report layout view
            if (reportData._html && reportData._html.length > 0) {
              setHTML(reportData._html[0].html || '');
            }
            if (reportData.json) {
              setDhisJson(reportData.json);
            }

            console.log('Report results state updated with linelistDataSet data');
          }
          // Fall back to HTML format
          else if (reportData._html && reportData._html.length > 0) {
            // Linelist HTML format
            setHTML(reportData._html[0].html || '');
            setDhisJson(reportData.json || {});

            // Try to parse results from other possible locations
            let tableData = null;
            let columns = [];

            // Check for results array
            if (reportData.results && Array.isArray(reportData.results)) {
              tableData = reportData.results;
              columns = tableData.length > 0 ? Object.keys(tableData[0]) : [];
            }
            // Check for nested report name keys
            else {
              const responseReportName = Object.keys(reportData).find(key =>
                !['html', '_html', 'json', 'rowCount', 'results', 'linelistDataSet'].includes(key)
              );
              if (responseReportName && Array.isArray(reportData[responseReportName]) && reportData[responseReportName].length > 0) {
                tableData = reportData[responseReportName];
                columns = Object.keys(tableData[0]);
              }
            }

            setReportResults({
              rowCount: tableData ? tableData.length : (reportData.rowCount || 0),
              generatedTime: new Date().toISOString(),
              parameters: parameterValues,
              data: tableData || [],
              columns,
            });
          }
          else if (reportData.html) {
            // Aggregate report HTML format
            setHTML(reportData.html || '');
            setDhisJson(reportData.json || {});
            setReportResults({
              rowCount: 0,
              generatedTime: new Date().toISOString(),
              parameters: parameterValues,
            });
          }
          else {
            // Parse tabular data from unknown format
            const responseReportName = Object.keys(reportData).find(key =>
              !['html', '_html', 'json', 'rowCount', 'results', 'linelistDataSet'].includes(key)
            );
            if (responseReportName && Array.isArray(reportData[responseReportName]) && reportData[responseReportName].length > 0) {
              const columns = Object.keys(reportData[responseReportName][0]);
              const data = reportData[responseReportName];
              setReportResults({
                rowCount: data.length,
                generatedTime: new Date().toISOString(),
                parameters: parameterValues,
                columns,
                data,
              });
            }
          }
        } else {
          // Handle custom format (dataExport)
          if (reportData.results) {
            setReportResults({
              rowCount: reportData.results.length,
              generatedTime: new Date().toISOString(),
              parameters: parameterValues,
              data: reportData.results,
              columns: Object.keys(reportData.results[0] || {}),
            });
          }
        }

        showToast({
          title: 'Report executed successfully',
          kind: 'success',
          critical: false,
          description: '',
        });
      } else {
        throw new Error(`Report execution failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to run report:', error);
      showNotification({
        title: 'Error executing report',
        kind: 'error',
        critical: true,
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setRunningReport(false);
    }
  }, [selectedReport, parameterValues, validateParameters]);

  // ===== EXPORT =====
  /**
   * Handle export request
   */
  const handleExport = useCallback(async (format: 'CSV' | 'XLSX' | 'PDF') => {
    if (!selectedReport) return;

    try {
      const reportUuid = selectedReport.reportDefinitionUuid || selectedReport.uuid;

      // Call downloadReport API
      const response = await downloadReport({
        uuid: reportUuid,
        startDate: parameterValues.startDate || formatDate(new Date()),
        endDate: parameterValues.endDate || formatDate(new Date()),
      });

      if (response.ok) {
        // Get filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        const filenameMatch = contentDisposition?.match(/filename=(.+)/);
        const filename = filenameMatch ? filenameMatch[1] : `${selectedReport.name}.${format.toLowerCase()}`;

        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);

        showToast({
          title: 'Export successful',
          kind: 'success',
          critical: false,
          description: '',
        });
      } else {
        throw new Error(`Export failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
      showNotification({
        title: 'Error exporting report',
        kind: 'error',
        critical: true,
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [selectedReport, parameterValues]);

  // ===== DHIS2 =====
  /**
   * Handle send to DHIS2
   */
  const handleSendToDhis2 = useCallback(async () => {
    if (!selectedReport) return;

    try {
      const reportUuid = selectedReport.reportDefinitionUuid || selectedReport.uuid;

      const response = await sendReportToDHIS2(reportUuid, dhisJson);

      if (response.status === 200) {
        showToast({
          title: 'Report sent to DHIS2',
          kind: 'success',
          critical: true,
          description: `Report ${selectedReport.name} sent successfully`,
        });
      } else {
        throw new Error(`DHIS2 send failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send to DHIS2:', error);
      showNotification({
        title: 'Error sending to DHIS2',
        kind: 'error',
        critical: true,
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [selectedReport, dhisJson]);

  const loading = loadingReports || loadingCategories || !prefsLoaded;

  return (
    <div className={styles.page}>
      <div className={styles.panels}>
        {/* Left Panel - Explorer with all components */}
        <ReportExplorerPanel
          collapsed={explorerCollapsed}
          width={explorerWidth}
          onCollapse={handleCollapse}
          onExpand={handleExpand}
          // Report data
          categories={reportCategories ?? []}
          availableTags={availableTags}
          reports={filteredReports}
          // Current state
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          selectedTags={selectedTags}
          selectedReportUuid={selectedReportUuid}
          // Parameters
          reportParameters={reportParameters}
          parameterValues={parameterValues}
          parameterErrors={parameterErrors}
          // Handlers
          onSearchChange={handleSearchChange}
          onCategoryChange={handleCategoryChange}
          onTagsChange={handleTagsChange}
          onReportSelect={handleReportSelect}
          onParameterChange={handleParameterChange}
          onParametersReset={handleParametersReset}
          onRunReport={handleRunReport}
          // UI state
          loading={loading}
          runningReport={runningReport}
        />

        {/* Resize Handle */}
        {!explorerCollapsed && (
          <div
            className={styles.resizeHandle}
            onMouseDown={startResize}
          />
        )}

        {/* Right Panel - Workspace */}
        <ReportWorkspacePanel
          explorerCollapsed={explorerCollapsed}
          selectedReport={selectedReport}
          reportResults={reportResults}
          runningReport={runningReport}
          htmlContent={htmlContent}
          activeView={activeView}
          onViewChange={handleViewChange}
          capabilities={capabilities}
          onExport={handleExport}
          onSendToDhis2={handleSendToDhis2}
          parameterValues={parameterValues}
        />
      </div>
    </div>
  );
};

export default ReportVisualizerPage;

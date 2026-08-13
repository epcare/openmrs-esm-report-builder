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
import { showToast, showNotification, showModal } from '@openmrs/esm-framework';

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
  const [activeView, setActiveView] = useState<ReportViewType>('REPORT_LAYOUT');

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

      // Build request parameters
      const requestParams: any = {
        uuid: reportUuid,
        startDate: parameterValues.startDate || formatDate(new Date()),
        endDate: parameterValues.endDate || formatDate(new Date()),
        renderType: 'html',
        parameters: parameterValues,
      };

      console.log('Executing report:', selectedReport.name);
      console.log('Request params:', requestParams);

      // Call getReport API
      const response = await getReport(requestParams);

      if (response.status === 200) {
        const reportData = response.data;

        console.log('Report response data:', reportData);

        // Use HTML returned by backend (all report types return HTML)
        // Backend handles design-based rendering for each report type
        if (reportData._html && reportData._html.length > 0) {
          setHTML(reportData._html[0].html || '');
        } else if (reportData.html) {
          setHTML(reportData.html || '');
        }

        // Set DHIS2 JSON if available
        if (reportData.json) {
          setDhisJson(reportData.json);
        }

        // TODO: Future - parse tabular data based on report design interpreter
        // For now, reports are rendered via HTML only
        setReportResults({
          rowCount: 0,
          generatedTime: new Date().toISOString(),
          parameters: parameterValues,
        });

        console.log('Report HTML content set');

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
   * Confirm send to DHIS2 - shows confirmation modal and handles the send
   */
  const confirmSendToDhis2 = useCallback(async () => {
    if (!selectedReport) return;

    const dispose = showModal('confirm-modal', {
      close: () => dispose(),
      submit: async () => {
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
        dispose();
      },
      report: selectedReport.name,
    });
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
          onSendToDhis2={capabilities.sendToDhis2 ? confirmSendToDhis2 : undefined}
          parameterValues={parameterValues}
        />
      </div>
    </div>
  );
};

export default ReportVisualizerPage;

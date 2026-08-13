/**
 * useReportCapabilities Hook
 *
 * Determines which views and actions are available for a given report.
 * Based on report type and metadata.
 *
 * Phase 5.4: Capabilities hook
 */
import { useMemo } from 'react';
import type { ReportLibraryItem, ReportCapabilities } from '../types';

interface UseReportCapabilitiesResult {
  capabilities: ReportCapabilities;
  canTable: boolean;
  canPivot: boolean;
  canChart: boolean;
  canReportLayout: boolean;
  canExport: boolean;
  canSendToDhis2: boolean;
}

/**
 * Hook for determining report capabilities
 * @param report - Report to determine capabilities for
 */
export function useReportCapabilities(report: ReportLibraryItem | null): UseReportCapabilitiesResult {
  const capabilities = useMemo((): ReportCapabilities => {
    if (!report) {
      return {
        table: false,
        pivot: false,
        chart: false,
        reportLayout: false,
        export: false,
        sendToDhis2: false,
      };
    }

    // Default capabilities
    const caps: ReportCapabilities = {
      table: true,
      pivot: false,
      chart: false,
      reportLayout: false,
      export: true,
      sendToDhis2: false,
    };

    // Determine capabilities based on report type
    const reportType = report.reportType?.toLowerCase();
    const categoryName = report.category?.name?.toLowerCase() || report.category?.display?.toLowerCase() || '';

    if (reportType === 'linelist' || reportType === 'line_list') {
      // Linelist reports can pivot, chart, and have report layout (HTML)
      caps.pivot = true;
      caps.chart = true;
      caps.reportLayout = true; // Enable HTML view for linelists
    } else if (reportType === 'aggregate') {
      // Aggregate reports have fixed layout, can chart, and can send to DHIS2
      caps.reportLayout = true;
      caps.chart = true;
      caps.sendToDhis2 = true; // Enable DHIS2 export for aggregate reports
    } else if (reportType === 'indicator') {
      // Indicator reports can chart
      caps.chart = true;
    }

    // Enable DHIS2 for specific aggregate report categories (NATIONAL REPORTS, MER INDICATOR REPORTS)
    // These categories have renderType: "html" in the old system
    if (categoryName.includes('national') || categoryName.includes('mer') || categoryName.includes('donor') || categoryName.includes('indicator report')) {
      caps.sendToDhis2 = true;
      caps.reportLayout = true; // These also have HTML layout
    }

    // Check metaJson for additional capabilities
    if (report.metaJson) {
      try {
        const meta = JSON.parse(report.metaJson);

        // Explicit capability overrides from metaJson
        if (meta.capabilities) {
          if (meta.capabilities.pivot !== undefined) caps.pivot = meta.capabilities.pivot;
          if (meta.capabilities.chart !== undefined) caps.chart = meta.capabilities.chart;
          if (meta.capabilities.reportLayout !== undefined) caps.reportLayout = meta.capabilities.reportLayout;
          if (meta.capabilities.export !== undefined) caps.export = meta.capabilities.export;
          if (meta.capabilities.sendToDhis2 !== undefined) caps.sendToDhis2 = meta.capabilities.sendToDhis2;
        }

        // Check for DHIS2 configuration
        if (meta.dhis2 || meta.dhis2Config) {
          caps.sendToDhis2 = true;
        }
      } catch (error) {
        console.error('Failed to parse metaJson for capabilities:', error);
      }
    }

    return caps;
  }, [report]);

  return {
    capabilities,
    canTable: capabilities.table,
    canPivot: capabilities.pivot,
    canChart: capabilities.chart,
    canReportLayout: capabilities.reportLayout,
    canExport: capabilities.export,
    canSendToDhis2: capabilities.sendToDhis2,
  };
}

export default useReportCapabilities;

/**
 * Report Visualizer Types
 *
 * Shared types for the report visualizer feature.
 */

/**
 * Report library item from the API
 * Re-exported from data-visualizer.resource.ts for convenience
 */
export interface ReportLibraryItem {
  uuid: string;
  display?: string;
  name: string;
  description?: string;
  code?: string;
  sourceType?: string;
  reportDefinitionUuid?: string;
  reportBuilderReportUuid?: string;
  reportType?: string;
  migrated?: boolean;
  retired?: boolean;
  category?: ReportLibraryCategoryRef;
  metaJson?: string;
}

/**
 * Report category reference
 */
export interface ReportLibraryCategoryRef {
  uuid?: string;
  display?: string;
  name?: string;
  description?: string;
}

/**
 * Report category DTO
 */
export interface ReportCategoryDto {
  uuid: string;
  display?: string;
  name: string;
  description?: string;
  retired?: boolean;
}

/**
 * Report explorer state
 */
export interface ReportExplorerState {
  explorerExpanded: boolean;           // Panel expanded/collapsed
  explorerWidth: number;               // Current panel width (resizable)
  reportSearch: string;                // Search query text
  selectedCategory?: string;           // Selected category UUID
  selectedTags: string[];              // Selected tag names
  selectedReportUuid?: string;         // Currently selected report
  parameterValues: Record<string, unknown>; // Runtime parameter values
  activeView: "TABLE" | "PIVOT" | "CHART" | "REPORT_LAYOUT";
  hasRun: boolean;                     // Whether report has been run
  isDirtySinceRun: boolean;            // Whether params changed since run
}

/**
 * Report capabilities (Phase 3+)
 */
export interface ReportCapabilities {
  table: boolean;          // Can show as table
  pivot: boolean;          // Can pivot (linelists only)
  chart: boolean;          // Can chart
  reportLayout: boolean;   // Has fixed layout (aggregate reports)
  export: boolean;         // Can export
  sendToDhis2: boolean;    // Can send to DHIS2
}

/**
 * Report visualizer preferences (localStorage)
 */
export interface ReportVisualizerPreferences {
  explorerExpanded: boolean;
  explorerWidth: number;
  rowsPerPage: number;
  lastActiveView?: string;
}

/**
 * Report view type enum
 */
export type ReportViewType = "TABLE" | "PIVOT" | "CHART" | "REPORT_LAYOUT";

/**
 * Report option (for dropdowns/lists)
 */
export interface ReportOption {
  id: string;
  uuid: string;
  label: string;
  name: string;
  sourceType?: string;
  reportType?: string;
  code?: string;
  category?: string;
  metaJson?: string;
}

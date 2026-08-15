/**
 * Linelist Reports API
 *
 * API client for linelist report definitions.
 * Linelists are standalone reports (not sections) that return patient lists.
 *
 * Uses the existing /reportbuilder/reportdefinition endpoint with reportType: 'LINE_LIST'
 */

import { omrsGet, omrsPost } from '../openmrs-api';
import { decodeHtmlEntities } from '../../utils/html-entities.utils';
import type {
  LinelistReportDto,
  LinelistReportDefinitionConfig,
  LinelistParameter,
} from '../../types/linelist-types';
import { compileToBackendConfig } from '../../types/linelist/compile-config';

const RESOURCE = '/reportbuilder/report';

type RestList<T> = { results?: T[] } & Record<string, any>;

function unwrapRestList<T>(data: RestList<T> | T[] | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Array.isArray(data.results) ? data.results : [];
}

export type RestRep = 'default' | 'full';

/**
 * Extended report DTO with linelist-specific fields
 */
export type LinelistReportDefinitionDto = LinelistReportDto & {
  configJson?: string; // LinelistReportDefinitionConfig as JSON string
  baseCohortDefinition?: any;
  dataSetDefinitions?: any[];
};

/**
 * List linelist reports
 */
export type ListLinelistReportsParams = {
  q?: string;
  includeRetired?: boolean;
  v?: RestRep;
};

/**
 * Save linelist report payload
 */
export type SaveLinelistReportPayload = {
  name: string;
  description?: string;
  code?: string;
  reportType: 'LINE_LIST';
  configJson: string;
  metaJson?: string;
};

/**
 * Normalize report DTO by decoding HTML entities in JSON fields
 */
function normalizeLinelistReportDto(
  report: LinelistReportDefinitionDto
): LinelistReportDefinitionDto {
  return {
    ...report,
    configJson: report.configJson
      ? decodeHtmlEntities(report.configJson)
      : report.configJson,
    metaJson: report.metaJson
      ? decodeHtmlEntities(report.metaJson)
      : report.metaJson,
  };
}

/**
 * Parse configJson into LinelistReportDefinitionConfig
 */
export function parseLinelistConfig(
  report: LinelistReportDefinitionDto
): LinelistReportDefinitionConfig | null {
  if (!report.configJson) return null;

  try {
    const parsed = JSON.parse(report.configJson);
    if (parsed && typeof parsed === 'object' && parsed.type === 'LINE_LIST') {
      return parsed as LinelistReportDefinitionConfig;
    }
  } catch (e) {
    console.error('Failed to parse linelist config:', e);
  }

  return null;
}

/**
 * Parse parameters from metaJson (with fallback to configJson)
 * This is used for reports from the report library which may only have metaJson
 * and need dynamic parameter options (e.g., LIST parameter options)
 */
export function parseLinelistParameters(
  report: LinelistReportDefinitionDto
): LinelistParameter[] {
  // First try to get parameters from metaJson (may have dynamic options)
  if (report.metaJson) {
    try {
      const meta = JSON.parse(report.metaJson);
      if (meta?.parameters && Array.isArray(meta.parameters) && meta.parameters.length > 0) {
        return meta.parameters as LinelistParameter[];
      }
    } catch (e) {
      console.warn('Failed to parse metaJson parameters:', e);
    }
  }

  // Fallback to configJson parameters
  const config = parseLinelistConfig(report);
  return config?.parameters || [];
}

/**
 * List all linelist reports
 *
 * @param params - Query parameters
 * @param signal - AbortSignal for cancellation
 * @returns Array of linelist report definitions
 */
export async function listLinelistReports(
  params?: ListLinelistReportsParams,
  signal?: AbortSignal
): Promise<LinelistReportDefinitionDto[]> {
  const q = params?.q?.trim();
  const includeRetired = params?.includeRetired === true;
  const v = params?.v ?? 'default';

  const qs = new URLSearchParams();
  qs.set('v', v);

  // Filter for LINE_LIST report type
  // Note: Backend may not support reportType filter yet, so we'll filter client-side
  if (q) qs.set('q', q);
  if (includeRetired) qs.set('includeRetired', 'true');

  const data = await omrsGet<
    RestList<LinelistReportDefinitionDto> | LinelistReportDefinitionDto[] | undefined
  >(`${RESOURCE}?${qs.toString()}`, signal);

  const allReports = unwrapRestList(data)
    .filter((x) => Boolean(x?.uuid))
    .map(normalizeLinelistReportDto);

  // Filter for LINE_LIST reports client-side if backend doesn't support the filter
  return allReports.filter(
    (report) => report.reportType === 'LINE_LIST' || parseLinelistConfig(report)?.type === 'LINE_LIST'
  );
}

/**
 * Get a single linelist report by UUID
 *
 * @param uuid - Report UUID
 * @param signal - AbortSignal for cancellation
 * @param v - Representation version
 * @returns Linelist report definition
 */
export async function getLinelistReport(
  uuid: string,
  signal?: AbortSignal,
  v: RestRep = 'full'
): Promise<LinelistReportDefinitionDto> {
  const report = await omrsGet<LinelistReportDefinitionDto>(
    `${RESOURCE}/${encodeURIComponent(uuid)}?v=${v}`,
    signal
  );
  return normalizeLinelistReportDto(report);
}

/**
 * Create a new linelist report
 *
 * @param payload - Report definition payload
 * @param signal - AbortSignal for cancellation
 * @returns Created report definition
 */
export async function createLinelistReport(
  payload: SaveLinelistReportPayload,
  signal?: AbortSignal
): Promise<LinelistReportDefinitionDto> {
  const report = await omrsPost<LinelistReportDefinitionDto>(RESOURCE, payload, signal);
  return normalizeLinelistReportDto(report);
}

/**
 * Update an existing linelist report
 *
 * @param uuid - Report UUID to update
 * @param payload - Updated report definition payload
 * @param signal - AbortSignal for cancellation
 * @returns Updated report definition
 */
export async function updateLinelistReport(
  uuid: string,
  payload: SaveLinelistReportPayload,
  signal?: AbortSignal
): Promise<LinelistReportDefinitionDto> {
  const report = await omrsPost<LinelistReportDefinitionDto>(
    `${RESOURCE}/${encodeURIComponent(uuid)}`,
    payload,
    signal
  );
  return normalizeLinelistReportDto(report);
}

/**
 * Delete/retire a linelist report
 *
 * @param uuid - Report UUID to delete
 * @param reason - Reason for deletion
 * @param signal - AbortSignal for cancellation
 */
export async function deleteLinelistReport(
  uuid: string,
  reason = 'Retired from Report Builder',
  signal?: AbortSignal
): Promise<void> {
  const qs = new URLSearchParams();
  qs.set('reason', reason);
  return omrsDelete(`${RESOURCE}/${encodeURIComponent(uuid)}?${qs.toString()}`, signal);
}

/**
 * Import omrsDelete function
 * This may need to be added to openmrs-api.ts
 */
async function omrsDelete(url: string, signal?: AbortSignal): Promise<void> {
  const response = await fetch(url, {
    method: 'DELETE',
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to delete resource');
  }
}

/**
 * Evaluate a linelist report
 *
 * Uses the existing /reportingDefinition endpoint with renderType=list
 *
 * @param params - Evaluation parameters
 * @param signal - AbortSignal for cancellation
 * @returns Evaluation result with patient rows
 */
export type LinelistEvaluationParams = {
  reportDefinitionUuid?: string; // The compiled report definition UUID (from compile result)
  reportLibraryUuid?: string; // Alternative: use report library UUID to resolve the report definition
  parameters?: Record<string, any>; // Dynamic parameters from report config
  startDate?: string; // Deprecated: Use parameters instead
  endDate?: string; // Deprecated: Use parameters instead
  maxRows?: number;
};

export type LinelistEvaluationResult = {
  success: boolean;
  data?: Record<string, any[]>; // Dataset name -> array of patient rows
  error?: string;
};

/**
 * Compile linelist report payload
 */
export type CompileLinelistReportPayload = {
  reportUuid: string;
  category?: string; // Optional category UUID/name to add report to library
};

/**
 * Compile linelist report result
 */
export type CompileLinelistReportResult = {
  reportUuid: string;
  reportDefinitionUuid?: string;
  reportDefinitionName?: string;
  reportDesignPath?: string;
  compiled?: boolean;
  addedToLibrary?: boolean;
  reportLibraryUuid?: string;
};

export async function evaluateLinelistReport(
  params: LinelistEvaluationParams,
  signal?: AbortSignal
): Promise<LinelistEvaluationResult> {
  // Use reportDefinitionUuid (from compile result) or reportLibraryUuid
  const uuid = params.reportDefinitionUuid || params.reportLibraryUuid;
  if (!uuid) {
    return {
      success: false,
      error: 'Either reportDefinitionUuid or reportLibraryUuid is required',
    };
  }

  const qs = new URLSearchParams();
  qs.set('uuid', uuid);
  qs.set('renderType', 'list'); // Get patient list data

  // Support both new parameters format and legacy startDate/endDate
  if (params.parameters) {
    // Add all parameters from the report config
    Object.entries(params.parameters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        qs.set(key, String(value));
      }
    });
  } else {
    // Legacy support for hardcoded startDate/endDate
    if (params.startDate) {
      qs.set('startDate', params.startDate);
    }
    if (params.endDate) {
      qs.set('endDate', params.endDate);
    }
  }

  if (params.maxRows) {
    qs.set('maxRows', String(params.maxRows));
  }

  const response = await fetch(
    `/openmrs/ws/rest/v1/reportbuilder/reportingDefinition?${qs.toString()}`,
    {
      method: 'GET',
      signal,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    return {
      success: false,
      error: error || 'Failed to evaluate linelist report',
    };
  }

  const data = await response.json();

  return {
    success: true,
    data,
  };
}

/**
 * Compile a linelist report
 *
 * Uses the same /reportbuilder/reportcompile endpoint as aggregate reports.
 * This generates the runtime report definition from the saved linelist report.
 *
 * @param reportUuid - The UUID of the saved linelist report to compile
 * @param category - Optional category UUID/name to add the compiled report to library
 * @param signal - AbortSignal for cancellation
 * @returns Compile result with report definition UUID and status
 */
export async function compileLinelistReport(
  reportUuid: string,
  category?: string,
  signal?: AbortSignal
): Promise<CompileLinelistReportResult> {
  const payload: CompileLinelistReportPayload = { reportUuid, category };
  console.log('compileLinelistReport sending:', payload);
  return omrsPost<CompileLinelistReportResult>('/reportbuilder/reportcompile', payload, signal);
}

/**
 * Builder-specific metadata stored in metaJson so the editor can reconstruct
 * the full draft (indicators selected, build method, display settings, etc.)
 * when re-opening a report for editing.
 */
export type LinelistBuilderMeta = {
  buildMethod?: 'SQL_BUILDER' | 'VISUAL_FILTER' | 'INDICATOR_BASED';
  /** Population sources used for SQL_BUILDER and HYBRID modes */
  populationSources?: Array<{
    uuid: string;
    name: string;
    type: 'ETL' | 'CORE' | 'REFERENCE' | 'SQL' | 'INDICATOR';
    joinType: 'JOIN' | 'LEFT_JOIN' | 'INTERSECT' | 'UNION' | 'EXCEPT';
    enabled: boolean;
    order: number;
  }>;
  /** Indicator rules used to build the population (for INDICATOR_BASED mode) */
  indicatorRules?: Array<{
    id: string;
    indicatorUuid: string;
    name: string;
    conditions?: Array<{ key: string; operator?: string; value: any }>;
    logicalOperator?: 'AND' | 'OR';
    negate?: boolean;
  }>;
  /** Visual filter state for reconstructing the filter UI */
  visualFilter?: {
    rootGroup: {
      id: string;
      logicalOperator: 'AND' | 'OR';
      conditions: Array<{
        id: string;
        field: string;
        fieldLabel: string;
        fieldType: string;
        operator: string;
        value?: string | string[];
        value2?: string;
        negate?: boolean;
      }>;
      nestedGroups?: any[];
    };
    useVisualBuilder: boolean;
  };
  /** Filter map for parameter-to-column mapping */
  filterMap?: {
    [parameterName: string]: string;
  };
};

/**
 * Convert LinelistReportDefinitionConfig to SaveLinelistReportPayload
 *
 * Compiles the builder's intermediate config into the backend's expected format.
 * The builder state needed for editing (indicators, build method, data sources)
 * is preserved inside the configJson under a `_builder` key and also in metaJson.
 *
 * @param config - The builder's intermediate configuration
 * @param meta - Report name/description/code
 * @param builderMeta - Builder state (indicators, build method) for edit reconstruction
 */
export function configToSavePayload(
  config: LinelistReportDefinitionConfig,
  meta: { name: string; description?: string; code?: string; categoryUuid?: string },
  builderMeta?: LinelistBuilderMeta
): SaveLinelistReportPayload {
  // Compile to the backend's final format
  const compiled = compileToBackendConfig(config, meta);

  // Preserve builder state inside configJson (under _builder) so the editor
  // can reconstruct the draft on re-open. The backend ignores this key.
  const configWithBuilder = {
    ...compiled,
    _builder: {
      dataSources: config.dataSources,
      populationSources: builderMeta?.populationSources,
      rowGrain: config.rowGrain,
      templateId: config.templateId,
      buildMethod: builderMeta?.buildMethod || config.buildMethod,
      indicatorRules: builderMeta?.indicatorRules || config.indicatorRules,
      categoryUuid: config.categoryUuid,
      visualFilter: builderMeta?.visualFilter,
      filterMap: builderMeta?.filterMap,
    },
  };

  return {
    name: meta.name,
    description: meta.description,
    code: meta.code,
    reportType: 'LINE_LIST',
    configJson: JSON.stringify(configWithBuilder),
    metaJson: builderMeta ? JSON.stringify(builderMeta) : undefined,
  };
}

/**
 * Preview a linelist report before saving
 *
 * This function creates a temporary draft report, compiles it, evaluates it,
 * and then deletes the temporary report. The user gets to see preview data
 * without cluttering their report list.
 *
 * If a cachedReportDefinitionUuid is provided, the compilation step is skipped
 * to avoid unnecessary recompilation.
 *
 * @param params - Preview parameters including config and optional parameters
 * @param signal - AbortSignal for cancellation
 * @returns Preview result with data or error
 */
export type PreviewLinelistParams = {
  reportUuid: string; // UUID of the draft report to preview
  config: LinelistReportDefinitionConfig;
  parameters?: Record<string, any>;
  maxRows?: number;
  cachedReportDefinitionUuid?: string; // Cached compiled report UUID to skip recompilation
};

export type PreviewLinelistResult = {
  success: boolean;
  data?: {
    columns: string[];
    rows: Record<string, any>[];
    rowCount: number;
    html?: string; // HTML rendering from backend (for linelist reports)
  };
  error?: string;
};

export async function previewLinelistReport(
  params: PreviewLinelistParams,
  signal?: AbortSignal
): Promise<PreviewLinelistResult> {
  const { reportUuid, config, parameters = {}, maxRows = 100, cachedReportDefinitionUuid } = params;

  try {
    // Step 1: Compile the report to get the reportDefinitionUuid
    // Skip if cached UUID is provided
    let reportDefinitionUuid = cachedReportDefinitionUuid;

    if (!reportDefinitionUuid) {
      const compileResult = await compileLinelistReport(reportUuid, config.categoryUuid, signal);

      if (!compileResult.compiled || !compileResult.reportDefinitionUuid) {
        return {
          success: false,
          error: 'Failed to compile report for preview',
        };
      }
      reportDefinitionUuid = compileResult.reportDefinitionUuid;
    }

    // Step 2: Build parameter values from config defaults and overrides
    const configParameters = config.parameters || [];
    const paramValues: Record<string, any> = {};

    for (const param of configParameters) {
      if (param.defaultValue) {
        paramValues[param.name] = param.defaultValue;
      }
      // Override with explicitly provided parameters
      if (parameters && parameters[param.name] !== undefined) {
        paramValues[param.name] = parameters[param.name];
      }
    }

    // Default date range if no parameters provided at all
    if (configParameters.length === 0) {
      paramValues.startDate = parameters.startDate || getDefaultStartDate();
      paramValues.endDate = parameters.endDate || new Date().toISOString().split('T')[0];
    }

    // Step 3: Evaluate the compiled report with parameters
    const evalParams: LinelistEvaluationParams = {
      reportDefinitionUuid: reportDefinitionUuid,
      parameters: paramValues,
      maxRows,
    };

    const evalResult = await evaluateLinelistReport(evalParams, signal);

    if (!evalResult.success) {
      return {
        success: false,
        error: evalResult.error || 'Failed to evaluate report for preview',
      };
    }

    // Step 5: Transform the result into a preview format
    // The evaluation returns data as Record<string, any[]> where the key is the dataset name
    const datasets = evalResult.data;
    const firstDataset = datasets ? Object.values(datasets)[0] : null;

    // Extract HTML if available (for linelist reports)
    const htmlData = datasets?._html ? datasets._html[0]?.html : null;

    if (!firstDataset || !Array.isArray(firstDataset) || firstDataset.length === 0) {
      return {
        success: true,
        data: {
          columns: [],
          rows: [],
          rowCount: 0,
          html: htmlData, // Include HTML even if no data
        },
      };
    }

    // Extract column names from the first row
    const columns = Object.keys(firstDataset[0]);

    return {
      success: true,
      data: {
        columns,
        rows: firstDataset,
        rowCount: firstDataset.length,
        html: htmlData, // Include HTML rendering
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Preview failed',
    };
  }
}

/**
 * Get a default start date (30 days ago) for preview
 */
function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}

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
  reportUuid: string;
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
};

export async function evaluateLinelistReport(
  params: LinelistEvaluationParams,
  signal?: AbortSignal
): Promise<LinelistEvaluationResult> {
  const qs = new URLSearchParams();
  qs.set('uuid', params.reportUuid);
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
 * @param signal - AbortSignal for cancellation
 * @returns Compile result with report definition UUID and status
 */
export async function compileLinelistReport(
  reportUuid: string,
  signal?: AbortSignal
): Promise<CompileLinelistReportResult> {
  const payload: CompileLinelistReportPayload = { reportUuid };
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

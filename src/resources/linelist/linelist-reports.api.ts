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

const RESOURCE = '/reportbuilder/reportdefinition';

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
  startDate: string;
  endDate: string;
  maxRows?: number;
};

export type LinelistEvaluationResult = {
  success: boolean;
  data?: Record<string, any[]>; // Dataset name -> array of patient rows
  error?: string;
};

export async function evaluateLinelistReport(
  params: LinelistEvaluationParams,
  signal?: AbortSignal
): Promise<LinelistEvaluationResult> {
  const qs = new URLSearchParams();
  qs.set('uuid', params.reportUuid);
  qs.set('startDate', params.startDate);
  qs.set('endDate', params.endDate);
  qs.set('renderType', 'list'); // Get patient list data

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
 * Convert LinelistReportDefinitionConfig to SaveLinelistReportPayload
 */
export function configToSavePayload(
  config: LinelistReportDefinitionConfig,
  meta: { name: string; description?: string; code?: string }
): SaveLinelistReportPayload {
  return {
    name: meta.name,
    description: meta.description,
    code: meta.code,
    reportType: 'LINE_LIST',
    configJson: JSON.stringify(config),
  };
}

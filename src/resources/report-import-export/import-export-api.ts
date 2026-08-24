import { omrsGet, omrsPost } from '../openmrs-api';

const EXPORT_RESOURCE = '/reportbuilder/ship';
const EXPORT_ALL_RESOURCE = '/reportbuilder/ship/all';
const EXPORT_BULK_RESOURCE = '/reportbuilder/ship/bulk';
const IMPORT_RESOURCE = '/reportbuilder/import';

// Backend response wrapper
type BackendResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

// Types for Export API
export type ExportRequest = {
  reportUuid?: string;
  version: string;
  destination?: string;
  entityTypes?: string[];
};

export type ExportResultData = {
  reportCode?: string;
  version?: string;
  sourceFile?: string;
  compiledFile?: string;
  versionFile?: string;
  dependencies?: {
    categories?: string[];
    indicators?: string[];
    themes?: string[];
    sections?: string[];
    library?: string[];
    ageCategories?: string[];
    ageGroups?: string[];
    etlSources?: string[];
    etlMonitors?: string[];
  };
};

export type ExportResult = {
  success: boolean;
  message?: string;
  reportCode?: string;
  version?: string;
  sourceFile?: string;
  compiledFile?: string;
  versionFile?: string;
  dependencies?: ExportResultData['dependencies'];
  errorMessage?: string;
};

// Types for Import API
export type ImportRequest = {
  sourceDirectory?: string; // Optional - backend uses default location if not provided
};

export type ImportItem = {
  type: string;
  filename: string;
  status?: 'success' | 'error';
  error?: string;
};

export type ImportResult = {
  success: boolean;
  summary?: string;
  successCount?: number;
  errorCount?: number;
  successes?: ImportItem[];
  errors?: ImportItem[];
  errorMessage?: string;
};

// Types for Package Info
export type PackageDependencySummary = {
  categories?: number;
  indicators?: number;
  themes?: number;
  sections?: number;
  library?: number;
  ageCategories?: number;
  ageGroups?: number;
  etlSources?: number;
  etlMonitors?: number;
};

export type PackageInfo = {
  name: string;
  version: string;
  description?: string;
  exportedAt?: string;
  exportedBy?: string;
  size: number;
  status: 'valid' | 'invalid';
  dependencies?: PackageDependencySummary;
  path?: string;
};

// API Functions
export async function exportReport(
  request: ExportRequest,
  signal?: AbortSignal,
): Promise<ExportResult> {
  const response = await omrsPost<BackendResponse<ExportResultData>>(EXPORT_RESOURCE, request, signal);
  return {
    success: response.success,
    message: response.message,
    ...response.data,
    errorMessage: response.success ? undefined : response.message,
  };
}

export async function exportAllReports(
  version: string,
  destination?: string,
  signal?: AbortSignal,
): Promise<ExportResult> {
  const response = await omrsPost<BackendResponse<ExportResultData>>(EXPORT_ALL_RESOURCE, { version, destination }, signal);
  return {
    success: response.success,
    message: response.message,
    ...response.data,
    errorMessage: response.success ? undefined : response.message,
  };
}

export async function exportBulk(
  entityTypes: string[],
  version: string,
  destination?: string,
  signal?: AbortSignal,
): Promise<ExportResult> {
  const response = await omrsPost<BackendResponse<ExportResultData>>(EXPORT_BULK_RESOURCE, { entityTypes, version, destination }, signal);
  return {
    success: response.success,
    message: response.message,
    ...response.data,
    errorMessage: response.success ? undefined : response.message,
  };
}

export async function importPackage(
  request: ImportRequest,
  signal?: AbortSignal,
): Promise<ImportResult> {
  return omrsPost<ImportResult>(IMPORT_RESOURCE, request, signal);
}

export async function validatePackage(
  path: string,
  signal?: AbortSignal,
): Promise<{ valid: boolean; error?: string }> {
  // This endpoint might need to be implemented on the backend
  // For now, return a placeholder
  return omrsGet<{ valid: boolean; error?: string }>(
    `/reportbuilder/validate-package?path=${encodeURIComponent(path)}`,
    signal,
  );
}

export async function getAvailablePackages(
  params?: { q?: string; status?: string; startIndex?: number; limit?: number },
  signal?: AbortSignal,
): Promise<PackageInfo[]> {
  const queryParams = new URLSearchParams();
  if (params?.q) {
    queryParams.set('q', params.q);
  }
  if (params?.status) {
    queryParams.set('status', params.status);
  }
  if (params?.startIndex !== undefined) {
    queryParams.set('startIndex', params.startIndex.toString());
  }
  if (params?.limit !== undefined) {
    queryParams.set('limit', params.limit.toString());
  }

  const queryString = queryParams.toString();
  const url = `/ws/rest/v1/reportbuilder/packages${queryString ? `?${queryString}` : ''}`;

  const response = await omrsGet<{ results: PackageInfo[] }>(url, signal);
  return response.results || [];
}

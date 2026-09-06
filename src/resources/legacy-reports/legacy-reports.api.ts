import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

import { guardRejection } from '../../utils/api-error.utils';
import { omrsGet, omrsPost } from '../openmrs-api';

const RESOURCE = '/reportbuilder/legacy';

export type LegacyReportDto = {
  uuid: string;
  key: string;
  name: string;
  description?: string;
  status: string;
  parameters?: ParameterConfig[];
  datasets?: DatasetRefConfig[];
  designs?: DesignRefConfig[];
  jsonTemplateConfig?: Record<string, unknown>;
  valid?: boolean;
  errors?: string[];
};

export type ParameterConfig = {
  name: string;
  label?: string;
  type?: string;
  defaultValue?: unknown;
};

export type DatasetRefConfig = {
  key: string;
  name: string;
};

export type DesignRefConfig = {
  uuid?: string;
  name?: string;
  type?: string;
};

export type UploadLegacyReportResponse = {
  success: boolean;
  error?: string;
  filename?: string;
  reportUuid?: string;
  reportName?: string;
  reportKey?: string;
  description?: string;
  status?: string;
  parameters?: ParameterConfig[];
  datasets?: DatasetRefConfig[];
  designs?: DesignRefConfig[];
  jsonTemplateConfig?: Record<string, unknown>;
  tempFilePath?: string;
  valid?: boolean;
  errors?: string[];
};

export type ImportLegacyReportResponse = {
  success: boolean;
  error?: string;
  reportName?: string;
  reportDefinitionUuid?: string;
  message?: string;
};

export type ValidateLegacyReportResponse = {
  success: boolean;
  valid?: boolean;
  error?: string;
  reportUuid?: string;
  reportName?: string;
  reportKey?: string;
  description?: string;
  status?: string;
  parametersCount?: number;
  datasetsCount?: number;
  designsCount?: number;
  hasJsonTemplateConfig?: boolean;
};

export type ListLegacyReportsParams = {
  q?: string;
  includeRetired?: boolean;
  v?: 'default' | 'full';
};

export async function listLegacyReports(
  params?: ListLegacyReportsParams,
  signal?: AbortSignal,
): Promise<LegacyReportDto[]> {
  const data = await omrsGet<{ results?: LegacyReportDto[] }>(RESOURCE, signal);
  return data.results || [];
}

export async function getLegacyReport(
  uuid: string,
  signal?: AbortSignal,
): Promise<LegacyReportDto> {
  return omrsGet<LegacyReportDto>(`${RESOURCE}/${encodeURIComponent(uuid)}`, signal);
}

export async function uploadLegacyReport(
  file: File,
  signal?: AbortSignal,
): Promise<UploadLegacyReportResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const url = `${restBaseUrl}${RESOURCE}/upload`;

  const response = await guardRejection(
    openmrsFetch(url, {
      method: 'POST',
      body: formData,
      signal,
    }),
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.data;
}

export async function importLegacyReport(
  tempFilePath: string,
  reportName: string,
  signal?: AbortSignal,
): Promise<ImportLegacyReportResponse> {
  return omrsPost<ImportLegacyReportResponse>(`${RESOURCE}/import`, {
    tempFilePath,
    reportName,
  }, signal);
}

export async function validateLegacyReport(
  jsonContent: string,
  signal?: AbortSignal,
): Promise<ValidateLegacyReportResponse> {
  return omrsPost<ValidateLegacyReportResponse>(`${RESOURCE}/validate`, {
    jsonContent,
  }, signal);
}

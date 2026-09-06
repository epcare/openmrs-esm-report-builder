/**
 * ETL Monitor Endpoint Test API
 * Server-side endpoint testing with SSRF protection
 */

import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { omrsPost } from '../openmrs-api';

/**
 * Endpoint test request configuration
 */
export interface EndpointTestRequest {
  endpoint: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    auth: {
      type: 'NONE' | 'OPENMRS' | 'BASIC' | 'API_KEY' | 'BEARER_TOKEN';
      useSession?: boolean;
      username?: string;
      password?: string;
      headerName?: string;
      apiKey?: string;
      token?: string;
    };
  };
  timeoutSeconds?: number;
  requestBody?: any;
}

/**
 * Sanitized secret keys that should never appear in test responses
 */
const SECRET_KEYS = [
  'password',
  'secret',
  'token',
  'authorization',
  'cookie',
  'session',
  'sessionid',
  'jsessionid',
  'apikey',
  'api_key',
  'apikey',
  'auth',
  'credentials',
  'private',
  'key',
];

/**
 * Check if a key might be a secret
 */
function isSecretKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SECRET_KEYS.some(secret => lowerKey.includes(secret));
}

/**
 * Sanitize response by removing potential secrets
 */
function sanitizeResponse(data: any, depth = 0): any {
  if (depth > 10) return data; // Prevent infinite recursion

  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponse(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (isSecretKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeResponse(value, depth + 1);
      } else if (typeof value === 'string' && value.length > 1000) {
        // Truncate very long strings that might contain tokens
        sanitized[key] = value.substring(0, 1000) + '...[TRUNCATED]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Truncate response data to prevent excessive memory usage
 */
function truncateResponse(data: any, maxFields = 50, maxDepth = 5): any {
  if (maxDepth <= 0) return '[MAX_DEPTH_REACHED]';

  if (Array.isArray(data)) {
    // Limit array size
    const limited = data.slice(0, 100);
    return limited.map(item => truncateResponse(item, maxFields, maxDepth - 1));
  }

  if (typeof data === 'object' && data !== null) {
    const entries = Object.entries(data);
    const limited = entries.slice(0, maxFields);
    const result: any = {};
    for (const [key, value] of limited) {
      result[key] = truncateResponse(value, maxFields, maxDepth - 1);
    }
    return result;
  }

  return data;
}

/**
 * Endpoint test result
 */
export interface EndpointTestResult {
  success: boolean;
  httpStatus?: number;
  durationMs?: number;
  contentType?: string;
  contentLength?: number;
  error?: string;
  errorCode?: string;
  data?: any;
  sanitizedData?: any;
  testedAt: string;
  headers?: Record<string, string>;
  warnings?: string[];
}

/**
 * Test endpoint connection using server-side test service
 *
 * This sends a request to the backend which:
 * 1. Validates the URL (SSRF protection)
 * 2. Makes the request in the OpenMRS server context
 * 3. Enforces timeout
 * 4. Sanitizes the response (removes credentials)
 * 5. Returns the result
 *
 * @param testRequest The endpoint configuration to test
 * @param signal Optional abort signal
 * @returns Test result with response data or error
 */
export async function testEndpointConnection(
  testRequest: EndpointTestRequest,
  signal?: AbortSignal
): Promise<EndpointTestResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  // Validate request
  if (!testRequest.endpoint?.url) {
    return {
      success: false,
      error: 'URL is required',
      testedAt: new Date().toISOString(),
    };
  }

  // Check for unsafe URL schemes (client-side validation, server also validates)
  const url = testRequest.endpoint.url.toLowerCase();
  const unsafeSchemes = ['file://', 'ftp://', 'jar://', 'data:', 'javascript:', 'vbscript:'];
  for (const scheme of unsafeSchemes) {
    if (url.startsWith(scheme)) {
      return {
        success: false,
        error: `Unsafe URL scheme: ${scheme}`,
        errorCode: 'UNSAFE_URL',
        testedAt: new Date().toISOString(),
      };
    }
  }

  try {
    // Call backend test endpoint
    const response = await omrsPost<{ result: EndpointTestResult }>(
      '/reportbuilder/etlmonitor/test',
      testRequest,
      signal
    );

    Date.now() - startTime;

    if (response.result) {
      // Add client-side warnings if needed
      if (response.result.durationMs && response.result.durationMs > 5000) {
        warnings.push('Response time is slow (>5s)');
      }

      return {
        ...response.result,
        warnings: warnings.length > 0 ? warnings : response.result.warnings,
      };
    }

    return {
      success: false,
      error: 'Invalid response from test service',
      testedAt: new Date().toISOString(),
    };

  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    // Handle different error types
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request was cancelled',
        errorCode: 'ABORTED',
        durationMs,
        testedAt: new Date().toISOString(),
      };
    }

    if (error?.response?.status === 403) {
      return {
        // PrivilegeError (from the omrs* helpers) already carries a user-friendly message.
        error:
          error?.message ??
          'Permission denied. You may not have the required privileges to test endpoints.',
        errorCode: 'FORBIDDEN',
        success: false,
        durationMs,
        testedAt: new Date().toISOString(),
      };
    }

    if (error?.response?.status === 404) {
      return {
        success: false,
        error: 'Test endpoint not found. The reportbuilder module may not be properly installed.',
        errorCode: 'NOT_FOUND',
        durationMs,
        testedAt: new Date().toISOString(),
      };
    }

    return {
      success: false,
      error: error?.message || 'Connection test failed',
      errorCode: error?.code || 'CONNECTION_ERROR',
      durationMs,
      testedAt: new Date().toISOString(),
    };
  }
}

/**
 * Fallback: Client-side endpoint test (for development/testing only)
 *
 * WARNING: This bypasses SSRF protection and should only be used
 * when the backend endpoint is not available (development environments).
 *
 * @param testRequest The endpoint configuration to test
 * @param signal Optional abort signal
 * @returns Test result with response data or error
 */
export async function testEndpointConnectionClientSide(
  testRequest: EndpointTestRequest,
  signal?: AbortSignal
): Promise<EndpointTestResult> {
  const startTime = Date.now();
  const warnings: string[] = [];

  if (!testRequest.endpoint?.url) {
    return {
      success: false,
      error: 'URL is required',
      testedAt: new Date().toISOString(),
    };
  }

  // Construct the full URL
  let url = testRequest.endpoint.url;
  if (url.startsWith('/')) {
    url = `${restBaseUrl}${url}`;
  }

  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add authentication
  const auth = testRequest.endpoint.auth;
  if (auth.type === 'BASIC' && auth.username && auth.password) {
    headers['Authorization'] = `Basic ${btoa(`${auth.username}:${auth.password}`)}`;
  } else if (auth.type === 'BEARER_TOKEN' && auth.token) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  } else if (auth.type === 'API_KEY' && auth.headerName && auth.apiKey) {
    headers[auth.headerName] = auth.apiKey;
  }
  // OPENMRS auth is handled by openmrsFetch

  try {
    const response = await openmrsFetch<any>(url, {
      method: testRequest.endpoint.method || 'GET',
      headers,
      body: testRequest.requestBody ? JSON.stringify(testRequest.requestBody) : undefined,
      signal,
    });

    const durationMs = Date.now() - startTime;
    const rawData = response.data;

    // Sanitize the response
    const sanitizedData = sanitizeResponse(truncateResponse(rawData));

    if (durationMs > 5000) {
      warnings.push('Response time is slow (>5s)');
    }

    return {
      success: true,
      httpStatus: response.status || 200,
      durationMs,
      contentType: response.headers?.get('content-type') || undefined,
      contentLength: JSON.stringify(rawData).length,
      data: sanitizedData,
      sanitizedData,
      testedAt: new Date().toISOString(),
      warnings,
    };

  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request was cancelled',
        errorCode: 'ABORTED',
        durationMs,
        testedAt: new Date().toISOString(),
      };
    }

    return {
      success: false,
      error: error.message || 'Connection test failed',
      errorCode: error.code || 'CONNECTION_ERROR',
      durationMs,
      testedAt: new Date().toISOString(),
    };
  }
}

/**
 * Detect if response is JSON
 */
export function isJsonResponse(contentType?: string): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes('application/json');
}

/**
 * Get a human-readable content type label
 */
export function getContentTypeLabel(contentType?: string): string {
  if (!contentType) return 'Unknown';

  if (contentType.includes('application/json')) return 'JSON';
  if (contentType.includes('application/xml')) return 'XML';
  if (contentType.includes('text/html')) return 'HTML';
  if (contentType.includes('text/plain')) return 'Text';
  if (contentType.includes('application/octet-stream')) return 'Binary';

  return contentType.split(';')[0];
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

/**
 * Format content size for display
 */
export function formatContentSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Get HTTP status label
 */
export function getHttpStatusLabel(status?: number): string {
  if (!status) return '—';

  if (status >= 200 && status < 300) return `${status} OK`;
  if (status >= 300 && status < 400) return `${status} Redirect`;
  if (status >= 400 && status < 500) return `${status} Client Error`;
  if (status >= 500) return `${status} Server Error`;

  return `${status}`;
}

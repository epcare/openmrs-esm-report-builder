/**
 * Endpoint Configuration Normalizer
 * Handles conversion between legacy and v2 API endpoint configurations
 */

import type {
  ApiEndpoint,
  AuthType,
} from '../../types/etl-monitor';

/**
 * Normalized endpoint configuration
 * Uses consistent structure across all configuration versions
 */
export interface NormalizedEndpointConfig {
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
  timeout?: number;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  requestBody?: any;
}

/**
 * Configuration format detection result
 */
export interface ConfigDetectionResult {
  version: 'v1-legacy' | 'v1-apiEndpoint' | 'v2';
  hasApiEndpoint: boolean;
  hasApiUrl: boolean;
  authFormat: 'nested' | 'flat' | 'mixed';
  issues: string[];
}

/**
 * Detect the configuration format version
 */
export function detectConfigFormat(config: any): ConfigDetectionResult {
  const result: ConfigDetectionResult = {
    version: 'v2',
    hasApiEndpoint: false,
    hasApiUrl: false,
    authFormat: 'nested',
    issues: [],
  };

  if (!config || typeof config !== 'object') {
    result.version = 'v1-legacy';
    result.issues.push('Invalid or empty configuration');
    return result;
  }

  // Check for apiEndpoint (v1+ and v2)
  if ('apiEndpoint' in config) {
    result.hasApiEndpoint = true;
    const endpoint = config.apiEndpoint;

    if (!endpoint || typeof endpoint !== 'object') {
      result.issues.push('apiEndpoint is not an object');
      return result;
    }

    // Check for v2 nested auth structure
    if ('auth' in endpoint && endpoint.auth && typeof endpoint.auth === 'object') {
      if ('type' in endpoint.auth) {
        result.version = 'v2';
        result.authFormat = 'nested';
        return result;
      }
    }

    // Check for v1 flat auth structure
    if ('authType' in endpoint || 'authConfig' in endpoint) {
      result.version = 'v1-apiEndpoint';
      result.authFormat = 'flat';
      return result;
    }

    result.issues.push('apiEndpoint lacks auth configuration');
  }

  // Check for apiUrl (legacy v1)
  if ('apiUrl' in config) {
    result.hasApiUrl = true;
    result.version = 'v1-legacy';
    result.authFormat = 'flat';
  }

  // Default to v2 if schemaVersion is present
  if (config.schemaVersion === 2) {
    result.version = 'v2';
  }

  return result;
}

/**
 * Normalize authentication configuration to v2 format
 */
export function normalizeAuthConfig(config: any): NormalizedEndpointConfig['auth'] {
  if (!config) {
    return { type: 'NONE' };
  }

  // V2 format: auth.type, auth.useSession
  if (config.auth && typeof config.auth === 'object') {
    const auth = config.auth;
    return {
      type: auth.type || 'NONE',
      useSession: normalizeBoolean(auth.useSession),
      username: auth.username,
      password: auth.password,
      headerName: auth.headerName,
      apiKey: auth.apiKey,
      token: auth.token,
    };
  }

  // V1 format: authType, authConfig
  if (config.authType) {
    const authType = config.authType as AuthType;
    const authConfig = config.authConfig || {};

    return {
      type: authType,
      useSession: authType === 'OPENMRS' ? normalizeBoolean(authConfig.useSession) : undefined,
      username: authConfig.username,
      password: authConfig.password,
      headerName: authConfig.headerName,
      apiKey: authConfig.apiKey,
      token: authConfig.token,
    };
  }

  // Legacy format: authentication string
  if (config.authentication) {
    return {
      type: config.authentication === 'OPENMRS' ? 'OPENMRS' : 'NONE',
      useSession: config.authentication === 'OPENMRS' ? true : undefined,
    };
  }

  return { type: 'NONE' };
}

/**
 * Normalize a boolean value that might be stored as a string
 */
export function normalizeBoolean(value: any): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return undefined;
}

/**
 * Normalize HTTP method to uppercase
 */
export function normalizeMethod(method?: string): 'GET' | 'POST' | 'PUT' | 'DELETE' {
  if (!method) return 'GET';
  const upper = method.toUpperCase();
  if (['GET', 'POST', 'PUT', 'DELETE'].includes(upper)) {
    return upper as 'GET' | 'POST' | 'PUT' | 'DELETE';
  }
  return 'GET';
}

/**
 * Sanitize URL by decoding HTML entities in query strings
 * Converts &amp; to &, etc.
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  // Only decode in query strings (after ?)
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) return url;

  const baseUrl = url.substring(0, queryIndex);
  const queryString = url.substring(queryIndex);

  // Decode HTML entities in query string
  const decoded = queryString
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return baseUrl + decoded;
}

/**
 * Validate URL structure
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const sanitized = sanitizeUrl(url);

  // Check for unsafe schemes
  const unsafeSchemes = ['file://', 'ftp://', 'jar://', 'data:', 'javascript:', 'vbscript:'];
  for (const scheme of unsafeSchemes) {
    if (sanitized.toLowerCase().startsWith(scheme)) {
      return { valid: false, error: `Unsafe URL scheme: ${scheme}` };
    }
  }

  // Validate URL format for absolute URLs
  if (sanitized.includes('://')) {
    try {
      new URL(sanitized);
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  } else if (!sanitized.startsWith('/')) {
    // Relative URLs must start with /
    return { valid: false, error: 'Relative URLs must start with /' };
  }

  return { valid: true };
}

/**
 * Normalize endpoint configuration to v2 format
 */
export function normalizeEndpointConfig(config: any): NormalizedEndpointConfig {
  const detection = detectConfigFormat(config);

  const normalized: NormalizedEndpointConfig = {
    url: '',
    method: 'GET',
    auth: { type: 'NONE' },
  };

  // Extract URL
  if (detection.hasApiEndpoint && config.apiEndpoint) {
    normalized.url = sanitizeUrl(config.apiEndpoint.url || '');
    normalized.method = normalizeMethod(config.apiEndpoint.method);
    normalized.auth = normalizeAuthConfig(config.apiEndpoint);
    normalized.headers = config.apiEndpoint.headers;
    normalized.queryParams = config.apiEndpoint.queryParams;
    normalized.requestBody = config.apiEndpoint.requestBody;
  } else if (detection.hasApiUrl) {
    normalized.url = sanitizeUrl(config.apiUrl || '');
    normalized.method = normalizeMethod(config.httpMethod);
    normalized.auth = {
      type: config.authentication || 'NONE',
      useSession: config.authentication === 'OPENMRS' ? true : undefined,
    };
  }

  return normalized;
}

/**
 * Convert normalized config back to API endpoint format
 */
export function toApiEndpointFormat(normalized: NormalizedEndpointConfig): ApiEndpoint {
  const endpoint: ApiEndpoint = {
    url: normalized.url,
    method: normalized.method,
    authType: normalized.auth.type as AuthType,
  };

  // Build auth config based on type
  if (normalized.auth.type !== 'NONE') {
    endpoint.authConfig = {};

    if (normalized.auth.type === 'BASIC') {
      endpoint.authConfig.username = normalized.auth.username;
      endpoint.authConfig.password = normalized.auth.password;
    } else if (normalized.auth.type === 'API_KEY') {
      endpoint.authConfig.headerName = normalized.auth.headerName;
      endpoint.authConfig.apiKey = normalized.auth.apiKey;
    } else if (normalized.auth.type === 'BEARER_TOKEN') {
      endpoint.authConfig.token = normalized.auth.token;
    } else if (normalized.auth.type === 'OPENMRS') {
      endpoint.authConfig.useSession = normalized.auth.useSession ? 'true' : 'false';
    }
  }

  if (normalized.headers) {
    endpoint.headers = normalized.headers;
  }

  if (normalized.queryParams) {
    endpoint.queryParams = normalized.queryParams;
  }

  if (normalized.requestBody) {
    endpoint.requestBody = normalized.requestBody;
  }

  return endpoint;
}

/**
 * Validate normalized endpoint configuration
 */
export function validateEndpointConfig(config: NormalizedEndpointConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate URL
  const urlValidation = validateUrl(config.url);
  if (!urlValidation.valid) {
    errors.push(urlValidation.error || 'Invalid URL');
  }

  // Validate auth configuration
  if (config.auth.type === 'BASIC') {
    if (!config.auth.username) {
      errors.push('Username is required for Basic authentication');
    }
    if (!config.auth.password) {
      warnings.push('Password is missing for Basic authentication');
    }
  } else if (config.auth.type === 'API_KEY') {
    if (!config.auth.headerName) {
      errors.push('Header name is required for API Key authentication');
    }
    if (!config.auth.apiKey) {
      warnings.push('API Key is missing');
    }
  } else if (config.auth.type === 'BEARER_TOKEN') {
    if (!config.auth.token) {
      warnings.push('Bearer token is missing');
    }
  }

  // Validate timeout
  if (config.timeout !== undefined) {
    if (config.timeout < 1 || config.timeout > 300) {
      errors.push('Timeout must be between 1 and 300 seconds');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Merge multiple endpoint configs (last one wins for conflicts)
 */
export function mergeEndpointConfigs(...configs: Partial<NormalizedEndpointConfig>[]): NormalizedEndpointConfig {
  const merged: NormalizedEndpointConfig = {
    url: '',
    method: 'GET',
    auth: { type: 'NONE' },
  };

  for (const config of configs) {
    if (config.url) merged.url = config.url;
    if (config.method) merged.method = config.method;
    if (config.auth) merged.auth = { ...merged.auth, ...config.auth };
    if (config.timeout) merged.timeout = config.timeout;
    if (config.headers) merged.headers = { ...merged.headers, ...config.headers };
    if (config.queryParams) merged.queryParams = { ...merged.queryParams, ...config.queryParams };
    if (config.requestBody) merged.requestBody = config.requestBody;
  }

  return merged;
}

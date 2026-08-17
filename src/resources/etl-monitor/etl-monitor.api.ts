import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { omrsDelete, omrsGet, omrsPost } from '../openmrs-api';
import type {
    ETLMonitorDto,
    SaveETLMonitorPayload,
    MonitorDataResponse,
} from '../../types/etl-monitor/etl-monitor.types';

type RestList<T> = { results?: T[] } & Record<string, any>;

function unwrapRestList<T>(data: RestList<T> | T[] | undefined): T[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Array.isArray(data.results) ? data.results : [];
}

const RESOURCE = '/reportbuilder/etl-monitor';

/**
 * List all ETL monitors
 */
export async function listETLMonitors(q?: string, signal?: AbortSignal): Promise<ETLMonitorDto[]> {
    const qs = new URLSearchParams();
    qs.set('v', 'full');
    if (q?.trim()) qs.set('q', q.trim());

    const data = await omrsGet<RestList<ETLMonitorDto> | ETLMonitorDto[] | undefined>(
        `${RESOURCE}?${qs.toString()}`,
        signal,
    );

    return unwrapRestList(data).filter((x) => Boolean(x?.uuid));
}

/**
 * List active ETL monitors
 */
export async function listActiveETLMonitors(signal?: AbortSignal): Promise<ETLMonitorDto[]> {
    const qs = new URLSearchParams();
    qs.set('v', 'full');
    qs.set('activeOnly', 'true');

    const data = await omrsGet<RestList<ETLMonitorDto> | ETLMonitorDto[] | undefined>(
        `${RESOURCE}?${qs.toString()}`,
        signal,
    );

    return unwrapRestList(data).filter((x) => Boolean(x?.uuid));
}

/**
 * Get ETL monitors by category
 */
export async function getETLMonitorsByCategory(category: string, signal?: AbortSignal): Promise<ETLMonitorDto[]> {
    const qs = new URLSearchParams();
    qs.set('v', 'full');
    qs.set('category', category);

    const data = await omrsGet<RestList<ETLMonitorDto> | ETLMonitorDto[] | undefined>(
        `${RESOURCE}?${qs.toString()}`,
        signal,
    );

    return unwrapRestList(data).filter((x) => Boolean(x?.uuid));
}

/**
 * Get a single ETL monitor by UUID
 */
export async function getETLMonitor(uuid: string, signal?: AbortSignal): Promise<ETLMonitorDto> {
    const qs = new URLSearchParams();
    qs.set('v', 'full');

    return omrsGet<ETLMonitorDto>(`${RESOURCE}/${encodeURIComponent(uuid)}?${qs.toString()}`, signal);
}

/**
 * Create a new ETL monitor
 */
export async function createETLMonitor(payload: SaveETLMonitorPayload, signal?: AbortSignal) {
    return omrsPost<ETLMonitorDto>(RESOURCE, payload, signal);
}

/**
 * Update an existing ETL monitor
 */
export async function updateETLMonitor(uuid: string, payload: SaveETLMonitorPayload, signal?: AbortSignal) {
    return omrsPost<ETLMonitorDto>(`${RESOURCE}/${encodeURIComponent(uuid)}`, payload, signal);
}

/**
 * Delete/retire an ETL monitor
 */
export async function deleteETLMonitor(
    uuid: string,
    reason = 'Retired from Report Builder Admin',
    signal?: AbortSignal,
) {
    const qs = new URLSearchParams();
    qs.set('reason', reason);
    return omrsDelete(`${RESOURCE}/${encodeURIComponent(uuid)}?${qs.toString()}`, signal);
}

/**
 * Extract value from object using a simple JSONPath-like expression
 * Supports: $.field, $.field.nested, $[0].field
 */
function extractValue(obj: any, jsonPath: string): any {
    if (!jsonPath || !obj) return undefined;

    // Remove leading $. if present
    const path = jsonPath.startsWith('$.') ? jsonPath.slice(2) : jsonPath;

    // Split by . but handle array notation [0]
    const parts = path.split('.').flatMap(p => {
        const arrayMatch = p.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
            return [arrayMatch[1], parseInt(arrayMatch[2], 10)];
        }
        return [p];
    });

    let current = obj;
    for (const part of parts) {
        if (current == null) return undefined;
        current = current[part];
    }

    return current;
}

/**
 * Transform raw API response using display configuration
 * Converts structured JSON into array of {key, value} objects
 */
function transformApiResponse(rawResponse: any, displayConfigJson?: string): Array<{
    key: string;
    header: string;
    value: any;
    displayValue?: string;
    rawValue?: any;
}> {
    if (!rawResponse) return [];

    // If no display config, try to return array-friendly structure
    if (!displayConfigJson) {
        if (Array.isArray(rawResponse)) {
            return rawResponse;
        }
        // Convert object to array of key-value pairs
        return Object.entries(rawResponse).map(([key, value]) => ({
            key,
            header: key,
            value,
        }));
    }

    try {
        const config = JSON.parse(displayConfigJson);
        const columns = config.columns || [];

        return columns.map((col: any) => {
            const value = extractValue(rawResponse, col.jsonPath);
            return {
                key: col.key,
                header: col.header,
                value: value ?? col.defaultValue,
                displayValue: col.format ? applyFormat(value, col.format) : undefined,
                rawValue: value,
            };
        });
    } catch (e) {
        console.error('Failed to parse display config JSON', e);
        return [];
    }
}

/**
 * Apply format string to a value
 */
function applyFormat(value: any, format: string): string {
    if (value == null) return '';

    // Handle common format patterns
    if (format.includes('%')) {
        return String(Math.round(Number(value) || 0)) + '%';
    }
    if (format.includes('s')) {
        return String(value) + 's';
    }
    if (format === '0.0') {
        return String(Math.round(Number(value) * 10) / 10);
    }

    return String(value);
}

/**
 * Fetch data from the external ETL endpoint
 * Uses OpenMRS's openmrsFetch which handles authentication automatically
 */
export async function fetchMonitorData(uuid: string, signal?: AbortSignal): Promise<MonitorDataResponse> {
    // First, get the monitor configuration
    const monitor = await getETLMonitor(uuid, signal);

    if (!monitor || !monitor.configJson) {
        throw new Error('Monitor configuration not found');
    }

    // Parse the config to get the ETL endpoint details
    const config = JSON.parse(monitor.configJson);
    const apiEndpoint = config.apiEndpoint;

    if (!apiEndpoint || !apiEndpoint.url) {
        throw new Error('ETL endpoint URL not configured');
    }

    // Construct the URL - if relative, prepend with OpenMRS REST base
    let url = apiEndpoint.url;
    if (url.startsWith('/')) {
        // Prepend with restBaseUrl (/ws/rest/v1) for relative URLs
        url = `${restBaseUrl}${url}`;
    }

    // Prepare fetch options for openmrsFetch
    const headers: Record<string, string> = {};

    // Add request body for POST requests
    const body = apiEndpoint.method === 'POST' && apiEndpoint.requestBody
        ? JSON.stringify(apiEndpoint.requestBody)
        : undefined;

    // Add any custom headers from config
    if (apiEndpoint.headers) {
        Object.entries(apiEndpoint.headers).forEach(([key, value]) => {
            headers[key] = String(value);
        });
    }

    // Add authentication headers (except for OPENMRS which is handled by openmrsFetch)
    if (apiEndpoint.authType === 'BASIC' && apiEndpoint.authConfig) {
        const credentials = btoa(`${apiEndpoint.authConfig.username}:${apiEndpoint.authConfig.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
    } else if (apiEndpoint.authType === 'BEARER_TOKEN' && apiEndpoint.authConfig?.token) {
        headers['Authorization'] = `Bearer ${apiEndpoint.authConfig.token}`;
    } else if (apiEndpoint.authType === 'API_KEY' && apiEndpoint.authConfig) {
        const { headerName, apiKey } = apiEndpoint.authConfig;
        if (headerName && apiKey) {
            headers[headerName] = apiKey;
        }
    }

    // Use openmrsFetch which handles OpenMRS session authentication automatically
    const response = await openmrsFetch<any>(url, {
        method: apiEndpoint.method || 'GET',
        headers,
        body,
        signal,
    });

    // Transform the API response using display configuration
    const transformedData = transformApiResponse(response.data, monitor.displayConfigJson);

    // Return in the expected format
    return {
        uuid: monitor.uuid,
        code: monitor.code || '',
        timestamp: new Date().toISOString(),
        success: true,
        data: transformedData,
        rawResponse: response.data,
    };
}

/**
 * Test connection to the external ETL endpoint
 * Uses openmrsFetch which handles authentication automatically
 */
export async function testMonitorConnection(uuid: string, signal?: AbortSignal): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    responseTime?: number;
}> {
    const startTime = Date.now();

    try {
        // First, get the monitor configuration
        const monitor = await getETLMonitor(uuid, signal);

        if (!monitor || !monitor.configJson) {
            return {
                success: false,
                error: 'Monitor configuration not found',
                responseTime: Date.now() - startTime,
            };
        }

        // Parse the config to get the ETL endpoint details
        const config = JSON.parse(monitor.configJson);
        const apiEndpoint = config.apiEndpoint;

        if (!apiEndpoint || !apiEndpoint.url) {
            return {
                success: false,
                error: 'ETL endpoint URL not configured',
                responseTime: Date.now() - startTime,
            };
        }

        // Construct the URL - if relative, prepend with OpenMRS REST base
        let url = apiEndpoint.url;
        if (url.startsWith('/')) {
            // Prepend with restBaseUrl (/ws/rest/v1) for relative URLs
            url = `${restBaseUrl}${url}`;
        }

        // Prepare fetch options for openmrsFetch
        const headers: Record<string, string> = {};

        // Add request body for POST requests
        const body = apiEndpoint.method === 'POST' && apiEndpoint.requestBody
            ? JSON.stringify(apiEndpoint.requestBody)
            : undefined;

        // Add any custom headers from config
        if (apiEndpoint.headers) {
            Object.entries(apiEndpoint.headers).forEach(([key, value]) => {
                headers[key] = String(value);
            });
        }

        // Add authentication headers (except for OPENMRS which is handled by openmrsFetch)
        if (apiEndpoint.authType === 'BASIC' && apiEndpoint.authConfig) {
            const credentials = btoa(`${apiEndpoint.authConfig.username}:${apiEndpoint.authConfig.password}`);
            headers['Authorization'] = `Basic ${credentials}`;
        } else if (apiEndpoint.authType === 'BEARER_TOKEN' && apiEndpoint.authConfig?.token) {
            headers['Authorization'] = `Bearer ${apiEndpoint.authConfig.token}`;
        } else if (apiEndpoint.authType === 'API_KEY' && apiEndpoint.authConfig) {
            const { headerName, apiKey } = apiEndpoint.authConfig;
            if (headerName && apiKey) {
                headers[headerName] = apiKey;
            }
        }

        // Use openmrsFetch which handles OpenMRS session authentication automatically
        await openmrsFetch<any>(url, {
            method: apiEndpoint.method || 'GET',
            headers,
            body,
            signal,
        });
        const responseTime = Date.now() - startTime;

        return {
            success: true,
            message: 'Connection successful',
            responseTime,
        };

    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Connection failed',
            responseTime: Date.now() - startTime,
        };
    }
}

// Re-export endpoint test functions
export {
    testEndpointConnection,
    testEndpointConnectionClientSide,
    isJsonResponse,
    getContentTypeLabel,
    formatDuration,
    formatContentSize,
    getHttpStatusLabel,
    type EndpointTestRequest,
    type EndpointTestResult,
} from './etl-monitor-test.api';

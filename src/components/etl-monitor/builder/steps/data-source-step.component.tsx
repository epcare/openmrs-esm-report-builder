/**
 * Data Source Step Component
 * Step 2 of the ETL Monitor Builder
 *
 * Fields: API URL, HTTP Method, Authentication, Test Endpoint
 */

import React, { useState } from 'react';
import {
  TextInput,
  Select,
  SelectItem,
  Button,
  Stack,
  InlineNotification,
  FormGroup,
  Tag,
} from '@carbon/react';
import { CheckmarkFilled, Copy, Play } from '@carbon/icons-react';
import { useBuilderContext, useUpdateBuilderState } from '../etl-monitor-builder-context';
import { testEndpointConnectionClientSide } from '../../../../resources/etl-monitor/etl-monitor-test.api';
import type { BuilderAuthType, HttpMethod, DetectedSchema, DetectedField, SemanticDataType } from '../../../../types/etl-monitor/etl-monitor-builder.types';
import styles from './data-source-step.scss';

/**
 * HTTP method options
 */
const HTTP_METHODS: Array<{ value: HttpMethod; label: string }> = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
];

/**
 * Authentication type options
 */
const AUTH_TYPES: Array<{ value: BuilderAuthType; label: string; description: string }> = [
  { value: 'NONE', label: 'None', description: 'No authentication required' },
  { value: 'OPENMRS', label: 'OpenMRS Session', description: 'The monitor will use your current OpenMRS session' },
  { value: 'BASIC', label: 'Basic Auth', description: 'Username and password' },
  { value: 'API_KEY', label: 'API Key', description: 'Custom header with API key' },
  { value: 'BEARER_TOKEN', label: 'Bearer Token', description: 'OAuth bearer token' },
];

/**
 * Detect the type of a value
 */
function detectValueType(value: any): SemanticDataType {
  if (value === null || value === undefined) return 'TEXT';

  const type = typeof value;

  if (type === 'boolean') return 'BOOLEAN';
  if (type === 'number') {
    return Number.isInteger(value) ? 'INTEGER' : 'DECIMAL';
  }
  if (type === 'string') {
    // Check for specific patterns
    const upperValue = value.toUpperCase().trim();

    // Timestamp patterns
    if (
      /^\d{13}$/.test(value) || // Unix timestamp in milliseconds
      /^\d{10}$/.test(value) || // Unix timestamp in seconds
      /GMT|UTC|EAT|EST|PST/.test(value) || // Timezone abbreviations
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) || // ISO format
      /^\d{4}-\d{2}-\d{2}/.test(value) // Date format
    ) {
      return 'TIMESTAMP';
    }

    // Status patterns
    if (
      /^(UP|DOWN|ON|OFF|ACTIVE|INACTIVE|SUCCESS|FAILURE|ERROR|WARNING|INFO|CRITICAL|READY|PENDING|RUNNING|STOPPED|COMPLETED|FAILED|STARTED)$/i.test(upperValue)
    ) {
      return 'STATUS';
    }

    // Percentage patterns
    if (/^\d+%?$/.test(value) || /percentage|percent|ratio|rate/i.test(value)) {
      return 'PERCENTAGE';
    }

    // Duration patterns
    if (/^\d+\s*(seconds?|mins?|hours?|days?|h|m|s)$/.test(value) || /^\d+:\d{2}$/.test(value)) {
      return 'DURATION';
    }

    // Date patterns (without time)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      return 'DATE';
    }

    // Time patterns
    if (/^\d{2}:\d{2}:\d{2}$/.test(value) || /^\d{2}:\d{2}$/.test(value)) {
      return 'TIME';
    }

    return 'TEXT';
  }

  return 'TEXT';
}

/**
 * Infer type from field name
 */
function inferTypeFromFieldName(fieldName: string): SemanticDataType | null {
  const lowerName = fieldName.toLowerCase();

  if (lowerName.includes('status') || lowerName.includes('state') || lowerName.includes('health')) {
    return 'STATUS';
  }
  if (lowerName.includes('progress') || lowerName.includes('percentage') || lowerName.includes('percent')) {
    return 'PERCENTAGE';
  }
  if (lowerName.includes('timestamp') || lowerName.includes('date') || lowerName.includes('time') || lowerName.includes('created') || lowerName.includes('updated')) {
    return 'TIMESTAMP';
  }
  if (lowerName.includes('duration') || lowerName.includes('elapsed') || lowerName.includes('runtime')) {
    return 'DURATION';
  }
  if (lowerName.includes('count') || lowerName.includes('total') || lowerName.includes('number') || lowerName.includes('amount')) {
    return 'NUMBER';
  }
  if (lowerName.includes('enabled') || lowerName.includes('active') || lowerName.includes('visible')) {
    return 'BOOLEAN';
  }

  return null;
}

/**
 * Analyze JSON response and detect fields
 */
function analyzeResponseSchema(data: any, path: string = '$'): DetectedSchema {
  if (!data || typeof data !== 'object') {
    return {
      rootPath: '$',
      isArray: false,
      fields: [],
      rawSample: data,
      detectedAt: new Date().toISOString(),
    };
  }

  const fields: DetectedField[] = [];

  // Check if this is an array
  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      // Array of objects - analyze first item
      return analyzeResponseSchema(data[0], `${path}[0]`);
    }
    return {
      rootPath: path,
      arrayPath: path,
      isArray: true,
      fields: [],
      rawSample: data,
      detectedAt: new Date().toISOString(),
    };
  }

  // Object - analyze each property
  for (const [key, value] of Object.entries(data)) {
    if (value === null || typeof value === 'function' || typeof value === 'symbol') {
      continue;
    }

    const fieldPath = `${path}.${key}`;
    const detectedType = detectValueType(value);
    const inferredType = inferTypeFromFieldName(key);
    const suggestedType = inferredType || detectedType;

    const field: DetectedField = {
      name: key,
      path: fieldPath,
      type: detectedType,
      suggestedType: suggestedType !== detectedType ? suggestedType : undefined,
      sampleValue: typeof value === 'object' ? '[Object/Array]' : value,
      description: `Detected field: ${key}`,
    };

    fields.push(field);

    // Recursively analyze nested objects
    if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      const nestedSchema = analyzeResponseSchema(value, fieldPath);
      fields.push(...nestedSchema.fields);
    }
  }

  return {
    rootPath: path,
    isArray: false,
    fields,
    rawSample: data,
    detectedAt: new Date().toISOString(),
  };
}

/**
 * Get recommended component type based on detected fields
 */
function getRecommendedComponentType(fields: DetectedField[]): 'STATUS_CARD' | 'SUMMARY_CARD' | 'DATA_TABLE' | 'PROGRESS' | undefined {
  const hasStatus = fields.some(f => f.type === 'STATUS' || f.suggestedType === 'STATUS');
  const hasPercentage = fields.some(f => f.type === 'PERCENTAGE' || f.suggestedType === 'PERCENTAGE');

  if (hasStatus && fields.length <= 3) {
    return 'STATUS_CARD';
  }
  if (hasPercentage && hasStatus) {
    return 'PROGRESS';
  }
  if (fields.length >= 4) {
    return 'DATA_TABLE';
  }
  if (fields.length >= 2) {
    return 'SUMMARY_CARD';
  }

  return undefined;
}

/**
 * Authentication configuration form
 */
interface AuthConfigFormProps {
  authType: BuilderAuthType;
  authConfig: any;
  onChange: (config: any) => void;
}

function AuthConfigForm({ authType, authConfig, onChange }: AuthConfigFormProps) {
  if (authType === 'NONE') {
    return (
      <div className={styles['data-source-step__auth-description']}>
        No authentication will be used for this endpoint.
      </div>
    );
  }

  if (authType === 'OPENMRS') {
    return (
      <div className={styles['data-source-step__auth-description']}>
        The monitor will use your current OpenMRS session.
      </div>
    );
  }

  if (authType === 'BASIC') {
    return (
      <Stack gap={4}>
        <TextInput
          id="auth-username"
          labelText="Username"
          value={authConfig.username || ''}
          onChange={(e) => onChange({ ...authConfig, username: e.target.value })}
          placeholder="Enter username"
        />
        <TextInput
          id="auth-password"
          labelText="Password"
          type="password"
          value={authConfig.password || ''}
          onChange={(e) => onChange({ ...authConfig, password: e.target.value })}
          placeholder="Enter password"
        />
      </Stack>
    );
  }

  if (authType === 'API_KEY') {
    return (
      <Stack gap={4}>
        <TextInput
          id="auth-header-name"
          labelText="Header Name"
          value={authConfig.headerName || 'X-API-Key'}
          onChange={(e) => onChange({ ...authConfig, headerName: e.target.value })}
          placeholder="e.g., X-API-Key"
        />
        <TextInput
          id="auth-api-key"
          labelText="API Key"
          value={authConfig.apiKey || ''}
          onChange={(e) => onChange({ ...authConfig, apiKey: e.target.value })}
          placeholder="Enter API key"
        />
      </Stack>
    );
  }

  if (authType === 'BEARER_TOKEN') {
    return (
      <TextInput
        id="auth-token"
        labelText="Bearer Token"
        value={authConfig.token || ''}
        onChange={(e) => onChange({ ...authConfig, token: e.target.value })}
        placeholder="Enter bearer token"
      />
    );
  }

  return null;
}

/**
 * Data Source Step Component
 */
export default function DataSourceStep() {
  const { state } = useBuilderContext();
  const updateState = useUpdateBuilderState();

  const { endpoint, testResult, detectedSchema } = state;

  // Ensure auth structure exists for safety
  const safeEndpoint = React.useMemo(() => ({
    ...endpoint,
    auth: endpoint.auth || { type: 'NONE' },
  }), [endpoint]);

  // UI state
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  /**
   * Handle endpoint configuration change
   */
  const handleEndpointChange = (field: string, value: any) => {
    updateState({
      endpoint: { ...safeEndpoint, [field]: value },
    });
  };

  /**
   * Handle auth type change
   */
  const handleAuthTypeChange = (authType: BuilderAuthType) => {
    const defaultAuth: any = { type: authType };

    if (authType === 'OPENMRS') {
      defaultAuth.useSession = true;
    } else if (authType === 'API_KEY') {
      defaultAuth.headerName = 'X-API-Key';
    }

    updateState({
      endpoint: {
        ...safeEndpoint,
        auth: defaultAuth,
      },
    });
  };

  /**
   * Handle auth config change
   */
  const handleAuthConfigChange = (authConfig: any) => {
    updateState({
      endpoint: {
        ...safeEndpoint,
        auth: { ...safeEndpoint.auth, ...authConfig },
      },
    });
  };

  /**
   * Test the endpoint
   */
  const handleTestEndpoint = async () => {
    // Validate URL first
    if (!safeEndpoint.url || safeEndpoint.url.trim() === '') {
      setTestError('API URL is required');
      return;
    }

    if (!safeEndpoint.url.startsWith('/')) {
      setTestError('URL must start with /');
      return;
    }

    setIsTesting(true);
    setTestError(null);

    try {
      // Use the OpenMRS framework's endpoint test function
      const result = await testEndpointConnectionClientSide({
        endpoint: {
          url: safeEndpoint.url,
          method: safeEndpoint.method,
          auth: safeEndpoint.auth,
        },
      });

      // Update state with test result
      const detectedSchema = result.data ? analyzeResponseSchema(result.data) : undefined;
      if (detectedSchema && detectedSchema.fields.length > 0) {
        const recommendedComponent = getRecommendedComponentType(detectedSchema.fields);
        detectedSchema.recommendedComponent = recommendedComponent;
      }

      updateState({
        testResult: {
          success: result.success,
          httpStatus: result.httpStatus,
          durationMs: result.durationMs,
          contentType: result.contentType,
          error: result.error,
          data: result.data,
          testedAt: result.testedAt,
        },
        detectedSchema,
      });

      if (!result.success) {
        setTestError(result.error || 'Endpoint test failed');
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to test endpoint';
      setTestError(errorMsg);
      updateState({
        testResult: {
          success: false,
          error: errorMsg,
          testedAt: new Date().toISOString(),
        },
      });
    } finally {
      setIsTesting(false);
    }
  };

  /**
   * Check if endpoint has been successfully tested
   */
  const hasSuccessfulTest = testResult?.success === true;

  /**
   * Format time ago
   */
  const getTimeAgo = (timestamp?: string) => {
    if (!timestamp) return '';
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = Math.floor((now - then) / 1000 / 60); // minutes

    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} minute${diff > 1 ? 's' : ''} ago`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className={styles['data-source-step']}>
      {/* Section Header */}
      <div className={styles['data-source-step__header']}>
        <h2>Data Source</h2>
        <p className={styles['data-source-step__description']}>
          Configure the API endpoint that will provide data for this monitor.
        </p>
      </div>

      {/* Test Error Notification */}
      {testError && (
        <InlineNotification
          kind="error"
          title="Endpoint request failed"
          subtitle={testError}
          onClose={() => setTestError(null)}
          lowContrast
          style={{ marginBottom: '1rem' }}
        />
      )}

      <FormGroup legendText="">
        <Stack gap={5}>
          {/* API URL */}
          <TextInput
            id="api-url"
            labelText="API Endpoint *"
            placeholder="e.g., /ugandareportsetl/health"
            value={safeEndpoint.url}
            onChange={(e) => handleEndpointChange('url', e.target.value)}
            helperText="Relative URL path to the API endpoint"
            invalid={!!testError && !safeEndpoint.url}
            invalidText="API URL is required"
          />

          {/* HTTP Method */}
          <Select
            id="http-method"
            labelText="HTTP Method *"
            value={safeEndpoint.method}
            onChange={(e) => handleEndpointChange('method', e.target.value as HttpMethod)}
          >
            {HTTP_METHODS.map((method) => (
              <SelectItem key={method.value} value={method.value} text={method.label} />
            ))}
          </Select>

          {/* Authentication Type */}
          <Select
            id="auth-type"
            labelText="Authentication *"
            value={safeEndpoint.auth.type}
            onChange={(e) => handleAuthTypeChange(e.target.value as BuilderAuthType)}
          >
            {AUTH_TYPES.map((auth) => (
              <SelectItem
                key={auth.value}
                value={auth.value}
                text={auth.label}
              />
            ))}
          </Select>

          {/* Authentication Configuration */}
          <div className={styles['data-source-step__auth-config']}>
            <AuthConfigForm
              authType={safeEndpoint.auth.type}
              authConfig={safeEndpoint.auth}
              onChange={handleAuthConfigChange}
            />
          </div>

          {/* Test Endpoint Button */}
          <div className={styles['data-source-step__actions']}>
            <Button
              kind="primary"
              renderIcon={Play}
              onClick={handleTestEndpoint}
              disabled={isTesting || !safeEndpoint.url}
            >
              {isTesting ? 'Testing Endpoint…' : 'Test Endpoint'}
            </Button>
          </div>

          {/* Test Result */}
          {hasSuccessfulTest && (
            <div className={styles['data-source-step__test-result']}>
              <div className={styles['data-source-step__test-header']}>
                <CheckmarkFilled size={16} />
                <span>Endpoint responded successfully</span>
              </div>
              <div className={styles['data-source-step__test-details']}>
                <span>HTTP {testResult.httpStatus}</span>
                <span>•</span>
                <span>{testResult.durationMs} ms</span>
                <span>•</span>
                <span>{testResult.contentType}</span>
              </div>
              <div className={styles['data-source-step__test-time']}>
                Tested {getTimeAgo(testResult.testedAt)}
              </div>
            </div>
          )}

          {/* Response Preview */}
          {testResult?.data && (
            <div className={styles['data-source-step__response-preview']}>
              <div className={styles['data-source-step__response-header']}>
                <h4>Response Preview</h4>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Copy}
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(testResult.data, null, 2))}
                >
                  Copy
                </Button>
              </div>
              <pre className={styles['data-source-step__response-code']}>
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Detected Fields */}
          {detectedSchema && detectedSchema.fields.length > 0 && (
            <div className={styles['data-source-step__detected-fields']}>
              <div className={styles['data-source-step__detected-header']}>
                <h4>Detected Fields</h4>
                <span className={styles['data-source-step__detected-count']}>
                  {detectedSchema.fields.length} fields detected
                </span>
              </div>
              <table className={styles['data-source-step__fields-table']}>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Type</th>
                    <th>Suggested Label</th>
                  </tr>
                </thead>
                <tbody>
                  {detectedSchema.fields.map((field, index) => (
                    <tr key={index}>
                      <td>
                        <code>{field.name}</code>
                      </td>
                      <td>
                        <Tag type={field.type === 'STATUS' ? 'green' : 'gray'}>
                          {field.type}
                        </Tag>
                      </td>
                      <td>{field.description || field.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Stack>
      </FormGroup>
    </div>
  );
}

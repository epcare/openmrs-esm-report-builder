/**
 * Design Selection Step Component
 * Step 3 of the ETL Monitor Builder
 *
 * Select the display component type with visual previews
 */

import React from 'react';
import {
  InlineNotification,
  FormGroup,
  Tag,
} from '@carbon/react';
import { Information, Dashboard as DashboardIcon } from '@carbon/icons-react';
import { useBuilderContext, useUpdateBuilderState } from '../etl-monitor-builder-context';
import type { MonitorComponentType } from '../../../../types/etl-monitor/etl-monitor-v2.types';
import styles from './design-step.scss';

/**
 * Component type configuration with metadata
 */
interface ComponentTypeConfig {
  type: MonitorComponentType;
  label: string;
  description: string;
  icon: string;
  recommendedFor: string[];
  requiredFieldTypes: string[];
  preview: {
    title: string;
    fields: Array<{ label: string; value: string | number; type?: string }>;
  };
}

/**
 * Component type configurations
 */
const COMPONENT_TYPES: ComponentTypeConfig[] = [
  {
    type: 'STATUS_CARD',
    label: 'Status Card',
    description: 'Display a single status with optional metadata. Best for health checks, service status, or state indicators.',
    icon: 'Status',
    recommendedFor: ['status', 'health', 'state', 'check'],
    requiredFieldTypes: ['STATUS'],
    preview: {
      title: 'Module Health',
      fields: [
        { label: 'Status', value: 'UP', type: 'STATUS' },
        { label: 'Last Updated', value: '2 mins ago' },
      ],
    },
  },
  {
    type: 'SUMMARY_CARD',
    label: 'Summary Card',
    description: 'Display multiple key metrics in a compact card format. Best for dashboards and overviews.',
    icon: 'Summary',
    recommendedFor: ['summary', 'overview', 'metrics', 'stats'],
    requiredFieldTypes: [],
    preview: {
      title: 'Data Sync Status',
      fields: [
        { label: 'Total Records', value: 1247 },
        { label: 'Synced Today', value: 856 },
        { label: 'Failed', value: 3 },
      ],
    },
  },
  {
    type: 'PROGRESS',
    label: 'Progress Indicator',
    description: 'Show progress percentage with optional stage information. Best for ETL jobs, data imports, or long-running tasks.',
    icon: 'Progress',
    recommendedFor: ['progress', 'completion', 'percentage', 'stage'],
    requiredFieldTypes: ['PERCENTAGE'],
    preview: {
      title: 'ETL Progress',
      fields: [
        { label: 'Progress', value: 67, type: 'PERCENTAGE' },
        { label: 'Stage', value: 'Processing' },
        { label: 'Estimated Time', value: '5 mins' },
      ],
    },
  },
  {
    type: 'DATA_TABLE',
    label: 'Data Table',
    description: 'Display tabular data with sortable columns. Best for lists, logs, or structured records.',
    icon: 'Table',
    recommendedFor: ['list', 'table', 'records', 'log'],
    requiredFieldTypes: [],
    preview: {
      title: 'Recent Runs',
      fields: [
        { label: 'Date', value: '2024-01-15' },
        { label: 'Status', value: 'COMPLETED' },
        { label: 'Duration', value: '45s' },
      ],
    },
  },
  {
    type: 'ERROR_LOG',
    label: 'Error Log',
    description: 'Display errors and exceptions with severity indicators. Best for monitoring failures and issues.',
    icon: 'Error',
    recommendedFor: ['error', 'exception', 'failure', 'issue'],
    requiredFieldTypes: [],
    preview: {
      title: 'Recent Errors',
      fields: [
        { label: 'Error', value: 'Connection timeout' },
        { label: 'Severity', value: 'HIGH', type: 'STATUS' },
        { label: 'Time', value: '10:45 AM' },
      ],
    },
  },
  {
    type: 'TIME_SERIES',
    label: 'Time Series Chart',
    description: 'Display trends over time with line or bar charts. Best for metrics, performance data, or historical data.',
    icon: 'Chart',
    recommendedFor: ['trend', 'history', 'metric', 'chart'],
    requiredFieldTypes: [],
    preview: {
      title: 'Processing Time',
      fields: [
        { label: 'Average', value: '2.3s' },
        { label: 'Max', value: '5.1s' },
        { label: 'Trend', value: '↑ 12%' },
      ],
    },
  },
  {
    type: 'METRICS_GRID',
    label: 'Metrics Grid',
    description: 'Display multiple related metrics in a grid layout. Best for dashboards with many KPIs.',
    icon: 'Grid',
    recommendedFor: ['metrics', 'kpi', 'grid', 'multiple'],
    requiredFieldTypes: [],
    preview: {
      title: 'System Metrics',
      fields: [
        { label: 'CPU', value: '45%' },
        { label: 'Memory', value: '62%' },
        { label: 'Disk', value: '78%' },
      ],
    },
  },
];

/**
 * Component card preview component
 */
interface ComponentCardProps {
  config: ComponentTypeConfig;
  selected: boolean;
  recommended: boolean;
  onSelect: () => void;
}

/**
 * Get preview class modifier based on component type
 */
function getPreviewClassModifier(type: MonitorComponentType): string {
  const modifiers: Partial<Record<MonitorComponentType, string>> = {
    STATUS_CARD: styles['component-preview'],
    SUMMARY_CARD: styles['component-preview--grid'],
    PROGRESS: styles['component-preview'],
    DATA_TABLE: styles['component-preview--table'],
    TABLE: styles['component-preview--table'],
    ERROR_LOG: styles['component-preview--table'],
    TIME_SERIES: styles['component-preview--chart'],
    METRICS_GRID: styles['component-preview--grid'],
    DETAILS: styles['component-preview'],
  };
  return modifiers[type] || styles['component-preview'];
}

function ComponentCard({ config, selected, recommended, onSelect }: ComponentCardProps) {
  return (
    <div
      className={[
        styles['component-card'],
        selected && styles['component-card--selected'],
        recommended && styles['component-card--recommended'],
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {recommended && (
        <div className={styles['component-card__badge']}>
          <Tag type="purple" size="sm">
            Recommended
          </Tag>
        </div>
      )}

      <div className={styles['component-card__preview']}>
        <div className={getPreviewClassModifier(config.type)}>
          <div className={styles['component-preview__header']}>
            <DashboardIcon size={16} />
            <span>{config.preview.title}</span>
          </div>
          <div className={styles['component-preview__fields']}>
            {config.preview.fields.map((field, index) => (
              <div key={index} className={styles['component-preview__field']}>
                <span className={styles['component-preview__field-label']}>{field.label}:</span>
                <span
                  className={[
                    styles['component-preview__field-value'],
                    field.type === 'STATUS' && styles['component-preview__field-value--status'],
                    field.type === 'PERCENTAGE' && styles['component-preview__field-value--percentage'],
                    field.label?.toLowerCase().includes('trend') && styles['component-preview__field-value--trend'],
                    field.label?.toLowerCase().includes('error') && styles['component-preview__field-value--error'],
                    field.label?.toLowerCase().includes('severity') && styles['component-preview__field-value--warning'],
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {field.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles['component-card__content']}>
        <h4 className={styles['component-card__title']}>
          {config.icon && <span className={styles['component-card__icon']}>{config.icon}</span>}
          {config.label}
        </h4>
        <p className={styles['component-card__description']}>{config.description}</p>

        {config.requiredFieldTypes.length > 0 && (
          <div className={styles['component-card__requirements']}>
            <span className={styles['component-card__requirements-label']}>Requires:</span>
            {config.requiredFieldTypes.map((type) => (
              <Tag key={type} type="gray" size="sm">
                {type}
              </Tag>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className={styles['component-card__selected']}>
          <div className={styles['component-card__selected-indicator']} />
        </div>
      )}
    </div>
  );
}

/**
 * Design Selection Step Component
 */
export default function DesignStep() {
  const { state } = useBuilderContext();
  const updateState = useUpdateBuilderState();

  const { componentType, detectedSchema } = state;

  /**
   * Get recommended component type from detected schema
   */
  const getRecommendedComponent = (): MonitorComponentType | null => {
    if (!detectedSchema?.recommendedComponent) {
      return null;
    }
    return detectedSchema.recommendedComponent;
  };

  /**
   * Check if a component type is recommended
   */
  const isRecommended = (type: MonitorComponentType): boolean => {
    const recommended = getRecommendedComponent();
    if (recommended) {
      return type === recommended;
    }

    // Fallback to keyword matching if no explicit recommendation
    if (!detectedSchema) return false;

    const lowerFields = detectedSchema.fields.map((f) => f.name.toLowerCase());
    const config = COMPONENT_TYPES.find((c) => c.type === type);

    return (
      config?.recommendedFor.some((keyword) =>
        lowerFields.some((field) => field.includes(keyword))
      ) || false
    );
  };

  /**
   * Handle component type selection
   */
  const handleSelectComponent = (type: MonitorComponentType) => {
    updateState({ componentType: type });
  };

  const recommendedComponent = getRecommendedComponent();
  const hasSchema = !!detectedSchema && detectedSchema.fields.length > 0;

  return (
    <div className={styles['design-step']}>
      <div className={styles['design-step__header']}>
        <h2>Design Selection</h2>
        <p className={styles['design-step__description']}>
          Choose how your monitor should be displayed. The recommendation is based on your endpoint response structure.
        </p>
      </div>

      {/* Recommendation Notice */}
      {hasSchema && recommendedComponent && (
        <InlineNotification
          kind="info"
          title="Component Recommended"
          subtitle={`Based on your endpoint response, we recommend using the ${recommendedComponent} component type.`}
          lowContrast
          style={{ marginBottom: '1rem' }}
          hideCloseButton
        />
      )}

      {/* Schema Warning */}
      {!hasSchema && (
        <InlineNotification
          kind="warning"
          title="No Schema Detected"
          subtitle="Test your endpoint first to get a component recommendation based on your data structure."
          lowContrast
          style={{ marginBottom: '1rem' }}
          hideCloseButton
        />
      )}

      <FormGroup legendText="Select a component type">
        <div className={styles['design-step__grid']}>
          {COMPONENT_TYPES.map((config) => (
            <ComponentCard
              key={config.type}
              config={config}
              selected={componentType === config.type}
              recommended={isRecommended(config.type)}
              onSelect={() => handleSelectComponent(config.type)}
            />
          ))}
        </div>
      </FormGroup>

      {/* Selection Summary */}
      {componentType && (
        <>
          <div className={styles['design-step__summary']}>
            <div className={styles['design-step__summary-content']}>
              <h4>
                <Information size={16} />
                Selected: {COMPONENT_TYPES.find((c) => c.type === componentType)?.label}
              </h4>
              <p>{COMPONENT_TYPES.find((c) => c.type === componentType)?.description}</p>
            </div>
          </div>

          {/* Why This is Recommended */}
          {hasSchema && recommendedComponent && componentType === recommendedComponent && (
            <div className={styles['design-step__why-recommended']}>
              <div className={styles['design-step__why-recommended-header']}>
                <Information size={16} />
                <h5>Why this is recommended</h5>
              </div>
              <div className={styles['design-step__why-recommended-content']}>
                <p>
                  Based on your endpoint response, we detected{' '}
                  <strong>{detectedSchema.fields.length} fields</strong> including{' '}
                  <strong>
                    {detectedSchema.fields
                      .filter((f) => f.type === 'STATUS' || f.suggestedType === 'STATUS')
                      .map((f) => f.name)
                      .join(', ') || 'status-like fields'}
                  </strong>
                  .
                </p>
                <p>
                  The <strong>{COMPONENT_TYPES.find((c) => c.type === componentType)?.label}</strong> component is ideal for
                  displaying this type of data because it provides a clear visual indicator of health or status along
                  with supporting metadata.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Helper Text */}
      <div className={styles['design-step__help']}>
        <p className={styles['design-step__help-text']}>
          <strong>Tip:</strong> You can change the component type later if needed. Each component type has specific
          field requirements that will be configured in the next step.
        </p>
      </div>
    </div>
  );
}

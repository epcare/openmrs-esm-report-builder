/**
 * Design Selection Step Component
 * Step 3 of the ETL Monitor Builder
 *
 * Reference: docs/image-series-monitor/widgets/cardsimages.png
 * ("ETL Monitor - Visualization Cards" sheet)
 *
 * Each option card renders the REAL component (MonitorRenderer) with a
 * per-type sample, shows its REQUIRES chip, and supports
 * default / hover / selected / disabled states.
 */

import React from 'react';
import { InlineNotification } from '@carbon/react';
import { Information, Star, Checkmark } from '@carbon/icons-react';
import { useBuilderContext, useUpdateBuilderState } from '../etl-monitor-builder-context';
import type { MonitorComponentType } from '../../../../types/etl-monitor/etl-monitor-v2.types';
import { MonitorRenderer } from '../../renderers/MonitorRenderer';
import { getDesignSample } from './design-samples';
import { DESIGN_TYPES, type DesignTypeConfig } from '../design-registry';
import styles from './design-step.scss';

/**
 * Live sample preview for each design option.
 * Renders the REAL MonitorRenderer (same components as the dashboard and
 * preview) with per-type sample config/data — no separate thumbnail styling.
 */
function DesignSamplePreview({ type }: { type: MonitorComponentType }) {
  const sample = getDesignSample(type);
  return <MonitorRenderer config={sample.config} data={sample.data} loading={false} error={null} />;
}

/**
 * Check whether a picker entry matches the currently selected type
 * (TABLE also matches its legacy DATA_TABLE alias)
 */
function matchesSelection(config: DesignTypeConfig, current?: MonitorComponentType): boolean {
  if (!current) return false;
  return current === config.type || (config.aliases?.includes(current) ?? false);
}

/**
 * Component card (reference: Visualization Cards sheet)
 * States: default / hover / selected (check circle) / disabled (dashed, dimmed)
 */
interface ComponentCardProps {
  config: DesignTypeConfig;
  selected: boolean;
  disabled: boolean;
  recommended: boolean;
  onSelect: () => void;
}

function ComponentCard({ config, selected, disabled, recommended, onSelect }: ComponentCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      className={[
        styles['component-card'],
        selected && styles['component-card--selected'],
        disabled && styles['component-card--disabled'],
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={disabled ? undefined : onSelect}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onKeyDown={handleKeyDown}
    >
      {selected && (
        <span className={styles['component-card__check']}>
          <Checkmark size={14} />
        </span>
      )}
      {recommended && !selected && (
        <span className={styles['component-card__star']} title="Recommended">
          <Star size={11} />
        </span>
      )}

      <div className={styles['component-card__head']}>
        <span
          className={styles['component-card__icon']}
          style={{ backgroundColor: `${config.accent}1A`, color: config.accent }}
        >
          {config.icon}
        </span>
        <h4 className={styles['component-card__title']}>{config.label}</h4>
      </div>

      <p className={styles['component-card__description']}>{config.description}</p>

      <div className={styles['component-card__preview']}>
        <div className={styles['component-card__sample']}>
          <DesignSamplePreview type={config.type} />
        </div>
      </div>

      <div className={styles['component-card__footer']}>
        <span className={styles['component-card__requires-label']}>Requires:</span>
        <span className={styles['component-card__requires-chip']}>{config.requires}</span>
      </div>
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
  const isRecommended = (config: DesignTypeConfig): boolean => {
    const recommended = getRecommendedComponent();
    if (recommended) {
      return recommended === config.type || (config.aliases?.includes(recommended) ?? false);
    }

    // Fallback to keyword matching if no explicit recommendation
    if (!detectedSchema) return false;

    const lowerFields = detectedSchema.fields.map((f) => f.name.toLowerCase());

    return (
      config.recommendedFor.some((keyword) =>
        lowerFields.some((field) => field.includes(keyword))
      ) || false
    );
  };

  /**
   * A card is disabled when the detected schema lacks the semantic field
   * types the design requires (sheet: Disabled state)
   */
  const isDisabled = (config: DesignTypeConfig): boolean => {
    if (!detectedSchema || detectedSchema.fields.length === 0) return false;
    return config.requiredFieldTypes.some(
      (type) =>
        !detectedSchema.fields.some(
          (f) => f.type === type || f.suggestedType === type
        )
    );
  };

  /**
   * Human-readable reason for the recommendation
   */
  const getRecommendationReason = (): string => {
    if (!detectedSchema) return '';

    const statusField = detectedSchema.fields.find(
      (f) => f.type === 'STATUS' || f.suggestedType === 'STATUS'
    );
    if (statusField) {
      return 'This response contains a status-like field and supporting properties.';
    }
    if (detectedSchema.isArray) {
      return 'This response returns a list of records.';
    }
    const count = detectedSchema.fields.length;
    return `This response contains ${count} field${count === 1 ? '' : 's'} that suit this component.`;
  };

  /**
   * Handle component type selection (normalizes legacy aliases)
   */
  const handleSelectComponent = (config: DesignTypeConfig) => {
    updateState({ componentType: config.type });
  };

  const recommendedComponent = getRecommendedComponent();
  const hasSchema = !!detectedSchema && detectedSchema.fields.length > 0;
  const selectedConfig = DESIGN_TYPES.find((c) => matchesSelection(c, componentType));
  const recommendedConfig = recommendedComponent
    ? DESIGN_TYPES.find(
        (c) => c.type === recommendedComponent || (c.aliases?.includes(recommendedComponent) ?? false)
      )
    : undefined;

  return (
    <div className={styles['design-step']}>
      <div className={styles['design-step__header']}>
        <h2>Choose a design</h2>
        <p className={styles['design-step__description']}>
          Select how this monitor should be visualized on the dashboard.
        </p>
      </div>

      {/* Recommendation banner */}
      {hasSchema && recommendedConfig && (
        <div className={styles['design-step__recommendation']}>
          <Star size={16} />
          <p>
            <strong>Recommended: {recommendedConfig.label}</strong>
            {' — '}
            {getRecommendationReason()}
          </p>
        </div>
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

      <div role="group" aria-label="Select a component type">
        <div className={styles['design-step__grid']}>
          {DESIGN_TYPES.map((config) => (
            <ComponentCard
              key={config.type}
              config={config}
              selected={matchesSelection(config, componentType)}
              disabled={isDisabled(config)}
              recommended={isRecommended(config)}
              onSelect={() => handleSelectComponent(config)}
            />
          ))}
        </div>
      </div>

      {/* Selection Summary */}
      {selectedConfig && (
        <div className={styles['design-step__summary']}>
          <div className={styles['design-step__summary-content']}>
            <h4>
              <Information size={16} />
              Selected: {selectedConfig.label}
            </h4>
            <p>{selectedConfig.description}</p>
          </div>
        </div>
      )}

      {/* Why This is Recommended */}
      {hasSchema && recommendedConfig && matchesSelection(recommendedConfig, componentType) && (
        <div className={styles['design-step__why-recommended']}>
          <div className={styles['design-step__why-recommended-header']}>
            <Information size={16} />
            <h5>Why this is recommended</h5>
          </div>
          <div className={styles['design-step__why-recommended-content']}>
            <p>
              Your endpoint returns a status field along with{' '}
              {detectedSchema.fields
                .filter((f) => f.type !== 'STATUS' && f.suggestedType !== 'STATUS')
                .slice(0, 3)
                .map((f) => f.name)
                .join(', ') || 'supporting properties'}
              .
            </p>
            <p>
              The <strong>{selectedConfig?.label}</strong> is the best way to highlight the overall
              status at a glance, with key context shown below.
            </p>
          </div>
        </div>
      )}

      {/* Helper Text */}
      <div className={styles['design-step__help']}>
        <p className={styles['design-step__help-text']}>
          <strong>Tip:</strong> You can change the design or settings later. Your data and mappings
          will be preserved.
        </p>
      </div>
    </div>
  );
}

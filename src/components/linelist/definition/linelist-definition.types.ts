/**
 * Indicator-based Population Configuration Types
 *
 * Allows using indicator definitions (which have prebuilt query logic)
 * for linelist population configuration instead of raw SQL.
 */

import type { IndicatorCondition } from '../../indicators/types/indicator-types';
import type { DataThemeConfig } from '../../indicators/types/data-theme-config.types';

/**
 * Population configuration mode
 */
export type PopulationConfigMode = 'SQL' | 'INDICATOR' | 'HYBRID';

/**
 * Indicator-based population configuration
 * Stores the indicator and its condition values
 */
export type IndicatorPopulationConfig = {
  /**
   * Unique identifier for this population rule
   */
  id: string;

  /**
   * The indicator to use for population definition
   */
  indicatorUuid: string;

  /**
   * Display name for this population rule
   */
  name: string;

  /**
   * Snapshot of indicator details (for display without fetching)
   */
  indicator?: {
    uuid: string;
    name: string;
    description?: string;
    code?: string;
  };

  /**
   * Indicator condition values (matches indicator's theme conditions)
   * These are the values selected by the user
   */
  conditions: IndicatorCondition[];

  /**
   * Optional: Custom SQL overrides/extensions
   * For hybrid mode where you want indicator logic + custom SQL
   */
  customSql?: string;

  /**
   * Logical operator when combining with other population rules
   */
  logicalOperator?: 'AND' | 'OR';

  /**
   * Whether to negate this population rule (exclude matching patients)
   */
  negate?: boolean;
};

/**
 * Population configuration that can use SQL, Indicators, or both
 */
export type PopulationConfiguration = {
  /**
   * Current mode
   */
  mode: PopulationConfigMode;

  /**
   * Raw SQL (for SQL mode or as fallback)
   */
  sql?: string;

  /**
   * Indicator-based population rules
   * Multiple indicators can be combined with AND/OR logic
   */
  indicatorRules?: IndicatorPopulationConfig[];

  /**
   * Snapshot of theme config used for indicator conditions
   */
  themeConfig?: DataThemeConfig;
};

/**
 * Converts indicator population config to linelist cohort SQL
 */
export interface IndicatorToSqlConverter {
  /**
   * Convert a single indicator rule to SQL
   */
  convertIndicatorRule(rule: IndicatorPopulationConfig, themeConfig: DataThemeConfig): string;

  /**
   * Combine multiple indicator rules into a single SQL query
   */
  combineRules(rules: IndicatorPopulationConfig[], themeConfig: DataThemeConfig): string;
}

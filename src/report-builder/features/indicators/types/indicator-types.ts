import type { DataThemeConfig, ThemeCondition } from './data-theme-config.types';

/**
 * What the indicator builder saves/uses.
 * Keep it flexible because you already have a backend model.
 */

export type IndicatorKind = 'BASE' | 'FINAL';

export type IndicatorConditionValue =
    | string
    | number
    | Array<string | number>
    | { start?: string; end?: string }
    | null;

export type IndicatorCondition = {
  key: string; // matches ThemeCondition.key
  operator?: ThemeCondition['operator'];
  valueType?: ThemeCondition['valueType'];

  /**
   * Actual chosen value(s).
   * - concept search returns ids/uuids depending on your handler config
   */
  value: IndicatorConditionValue;
};

export type BaseIndicatorDraft = {
  uuid?: string;
  name: string;
  description?: string;
  code?: string;

  kind: IndicatorKind;

  /**
   * The selected data theme
   */
  themeUuid: string;

  /**
   * Optional snapshot of theme config at save time (good for debugging / auditing)
   */
  themeConfig?: DataThemeConfig;

  /**
   * User-picked conditions (values), keys should match theme config conditions
   */
  conditions?: IndicatorCondition[];

  /**
   * Optional SQL preview used by UI
   */
  sqlPreview?: string;
};
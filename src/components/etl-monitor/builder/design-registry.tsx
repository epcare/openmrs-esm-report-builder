/**
 * Design Type Registry
 * Single source of truth for the visualization card configs (labels, icons,
 * accent colors, REQUIRES chips), shared by the Design step and the Preview
 * step so both reflect the same card identity.
 * Reference: docs/image-series-monitor/widgets/cardsimages.png
 */

import React from 'react';
import {
  Security,
  ChartBar,
  ChartLine,
  Renew,
  DataTable,
  Document,
  Dashboard,
  Time,
  Warning,
} from '@carbon/icons-react';
import type { MonitorComponentType } from '../../../types/etl-monitor/etl-monitor-v2.types';

export interface DesignTypeConfig {
  type: MonitorComponentType;
  /** Additional (legacy) type names that map to this design */
  aliases?: MonitorComponentType[];
  label: string;
  description: string;
  icon: React.ReactNode;
  /** Accent color from the Color & Icon System (cardsimages.png) */
  accent: string;
  /** Text for the REQUIRES chip */
  requires: string;
  /** Semantic field types that must exist in the detected schema for the card to be enabled */
  requiredFieldTypes: string[];
  recommendedFor: string[];
}

export const DESIGN_TYPES: DesignTypeConfig[] = [
  {
    type: 'STATUS_CARD',
    label: 'Status Card',
    description: 'Best for showing the health or availability of a system.',
    icon: <Security size={18} />,
    accent: '#1A7F37',
    requires: 'STATUS',
    requiredFieldTypes: ['STATUS'],
    recommendedFor: ['status', 'health', 'state', 'check'],
  },
  {
    type: 'METRICS_GRID',
    label: 'Metric Card',
    description: 'Best for key numeric metrics at a glance.',
    icon: <ChartBar size={18} />,
    accent: '#8A3FFC',
    requires: 'NONE',
    requiredFieldTypes: [],
    recommendedFor: ['metrics', 'kpi', 'grid', 'multiple'],
  },
  {
    type: 'PROGRESS',
    label: 'Progress Card',
    description: 'Best for showing progress of the current execution.',
    icon: <Renew size={18} />,
    accent: '#0F62FE',
    requires: 'PERCENTAGE',
    requiredFieldTypes: ['PERCENTAGE'],
    recommendedFor: ['progress', 'completion', 'percentage', 'stage'],
  },
  {
    type: 'TABLE',
    aliases: ['DATA_TABLE'],
    label: 'Table Card',
    description: 'Best for lists of executions or records.',
    icon: <DataTable size={18} />,
    accent: '#FA4D56',
    requires: 'TABLE',
    requiredFieldTypes: [],
    recommendedFor: ['list', 'table', 'records', 'log'],
  },
  {
    type: 'DETAILS',
    label: 'Details Card',
    description: 'Best for showing all available fields and properties.',
    icon: <Document size={18} />,
    accent: '#1192E8',
    requires: 'DETAILS',
    requiredFieldTypes: [],
    recommendedFor: ['detail', 'property', 'field', 'config', 'schedule', 'info'],
  },
  {
    type: 'SUMMARY_CARD',
    label: 'Summary Card',
    description: 'Best for stacked highlights with status badges.',
    icon: <Dashboard size={18} />,
    accent: '#525252',
    requires: 'SUMMARY',
    requiredFieldTypes: [],
    recommendedFor: ['summary', 'overview', 'stats'],
  },
  {
    type: 'LOG',
    label: 'Log / Timeline Card',
    description: 'Best for showing events or execution logs.',
    icon: <Time size={18} />,
    accent: '#0762FE',
    requires: 'LOG',
    requiredFieldTypes: [],
    recommendedFor: ['event', 'timeline', 'activity', 'history'],
  },
  {
    type: 'ERROR_LOG',
    label: 'Error Log Card',
    description: 'Best for monitoring failures and issues.',
    icon: <Warning size={18} />,
    accent: '#DA1E28',
    requires: 'LOG',
    requiredFieldTypes: [],
    recommendedFor: ['error', 'exception', 'failure', 'issue'],
  },
  {
    type: 'TIME_SERIES',
    label: 'Time Series Chart',
    description: 'Best for metrics, performance data, or historical trends.',
    icon: <ChartLine size={18} />,
    accent: '#8A3FFC',
    requires: 'NONE',
    requiredFieldTypes: [],
    recommendedFor: ['trend', 'history', 'metric', 'chart'],
  },
];

/**
 * Get the design config for a component type (aliases included)
 */
export function getDesignConfig(type?: MonitorComponentType): DesignTypeConfig | undefined {
  if (!type) return undefined;
  return DESIGN_TYPES.find((c) => c.type === type || (c.aliases?.includes(type) ?? false));
}

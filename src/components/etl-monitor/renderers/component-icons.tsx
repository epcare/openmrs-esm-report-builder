/**
 * Shared icon-name → Carbon icon map for componentConfig.icons
 * (metric tiles, time-series headers, etc.)
 */

import React from 'react';
import {
  Document,
  Timer,
  ChartLine,
  Time,
  Grid,
  ChartBar,
  Badge,
  Calendar,
} from '@carbon/icons-react';

type IconComponent = React.ComponentType<{ size?: number | string }>;

export const TILE_ICONS: Record<string, IconComponent> = {
  document: Document,
  timer: Timer,
  trend: ChartLine,
  clock: Time,
  grid: Grid,
  chart: ChartBar,
  badge: Badge,
  calendar: Calendar,
};

export function getTileIcon(name?: string): IconComponent | undefined {
  return name ? TILE_ICONS[name] : undefined;
}

/**
 * Dashboard Grid
 * Places widget slots on a Carbon grid using each slot's resolved
 * ResponsiveSpan (sm 0-4, md 0-8, lg 0-16; 0 = hidden at that breakpoint,
 * mapped to span={false} — Carbon rejects numeric 0).
 */

import React from 'react';
import { Column, Grid } from '@carbon/react';
import type { ResolvedWidgetSlot } from '../../../types/dashboard/dashboard.types';
import styles from '../dashboards.scss';

interface DashboardGridProps {
  slots: ResolvedWidgetSlot[];
  renderSlot: (slot: ResolvedWidgetSlot, position: number) => React.ReactNode;
}

function columnSpan(value?: number): number | false {
  if (!value || value <= 0) return false;
  return value;
}

export function DashboardGrid({ slots, renderSlot }: DashboardGridProps) {
  // Number only the slots that actually render (UNSUPPORTED slots are skipped)
  const rendered = slots.filter((slot) => slot.status !== 'UNSUPPORTED');

  return (
    <Grid className={styles['dashboard-grid']} condensed>
      {slots.map((slot) => {
        if (slot.status === 'UNSUPPORTED') return null;
        const position = rendered.indexOf(slot) + 1;
        return (
          <Column
            key={slot.slotKey}
            sm={columnSpan(slot.span.sm)}
            md={columnSpan(slot.span.md)}
            lg={columnSpan(slot.span.lg)}
            className={styles['dashboard-grid__cell']}
          >
            {renderSlot(slot, position)}
          </Column>
        );
      })}
    </Grid>
  );
}

export default DashboardGrid;

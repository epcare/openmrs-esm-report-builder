/**
 * Dashboard Section
 * One resolved dashboard section: header (label + count), optional
 * collapsed accordion (config.sections[].collapsed), and the slot grid.
 */

import React from 'react';
import { Accordion, AccordionItem } from '@carbon/react';
import type { ResolvedDashboardSection } from '../../../types/dashboard/dashboard.types';
import DashboardGrid from './DashboardGrid';
import styles from '../dashboards.scss';

interface DashboardSectionProps {
  section: ResolvedDashboardSection;
  renderSlot: (slot: ResolvedDashboardSection['slots'][number], position: number) => React.ReactNode;
}

export function DashboardSection({ section, renderSlot }: DashboardSectionProps) {
  const body = (
    <DashboardGrid slots={section.slots} renderSlot={renderSlot} />
  );

  return (
    <section  className={styles['dashboard-renderer']}>
      {section.collapsed ? (
        <Accordion className={styles['dashboard-section__accordion']}>
          <AccordionItem title={`${section.label} (${section.slots.length})`}>
            {body}
          </AccordionItem>
        </Accordion>
      ) : (
        <>
          <div className={styles['dashboard-section__header']}>
            <h3 className={styles['dashboard-section__label']}>{section.label}</h3>
            <span className={styles['dashboard-section__count']}>
              {section.slots.length} {section.slots.length === 1 ? 'widget' : 'widgets'}
            </span>
          </div>
          {body}
        </>
      )}
    </section>
  );
}

export default DashboardSection;

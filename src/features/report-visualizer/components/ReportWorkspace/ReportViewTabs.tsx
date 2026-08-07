/**
 * Report View Tabs Component
 *
 * Content switcher for selecting between different view modes.
 * Shows available views based on report capabilities.
 *
 * Phase 3.2: View tabs (Table|Pivot|Chart|Report Layout)
 */
import React from 'react';
import { ContentSwitcher, Switch } from '@carbon/react';
import {
  Table as TableIcon,
  CrossTab,
  ChartBar as ChartIcon,
  Document,
} from '@carbon/react/icons';

import type { ReportCapabilities, ReportViewType } from '../../types';

interface ReportViewTabsProps {
  capabilities: ReportCapabilities;
  activeView: ReportViewType;
  onViewChange: (view: ReportViewType) => void;
  disabled?: boolean;
}

const ReportViewTabs: React.FC<ReportViewTabsProps> = ({
  capabilities,
  activeView,
  onViewChange,
  disabled,
}) => {
  // Build available views based on capabilities
  const views = [
    ...(capabilities.table ? [{ label: 'Table', value: 'TABLE' as ReportViewType, icon: TableIcon }] : []),
    ...(capabilities.pivot ? [{ label: 'Pivot', value: 'PIVOT' as ReportViewType, icon: CrossTab }] : []),
    ...(capabilities.chart ? [{ label: 'Chart', value: 'CHART' as ReportViewType, icon: ChartIcon }] : []),
    ...(capabilities.reportLayout ? [{ label: 'Report Layout', value: 'REPORT_LAYOUT' as ReportViewType, icon: Document }] : []),
  ];

  if (views.length === 0) {
    return null;
  }

  // Find the current view index
  const selectedIndex = views.findIndex((v) => v.value === activeView);

  return (
    <ContentSwitcher
      selectedIndex={selectedIndex}
      onChange={(event) => {
        // event.name is the selected switch's name (which is the view value like 'TABLE')
        const selectedView = views.find((v) => v.value === event.name);
        if (selectedView) {
          onViewChange(selectedView.value);
        }
      }}
      size="sm"
    >
      {views.map((view) => (
        <Switch
          key={view.value}
          name={view.value}
          text={view.label}
          disabled={disabled}
        />
      ))}
    </ContentSwitcher>
  );
};

export default ReportViewTabs;

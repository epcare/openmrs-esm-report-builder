/**
 * Report Explorer Panel - Left Panel
 *
 * Collapsible left panel for report discovery and parameter configuration.
 * Integrates all Phase 2 components: search, category filter, tag filter, report list, parameters, run button.
 * Shows icon rail when collapsed (Phase 4).
 *
 * Adapts collapse pattern from linelist-builder-workspace.component.tsx (lines 1448-1514)
 */
import React from 'react';
import { Button } from '@carbon/react';
import { ChevronLeft } from '@carbon/react/icons';
import styles from '../../report-visualizer.scss';

import ReportSearch from './ReportSearch';
import ReportCategoryFilter from './ReportCategoryFilter';
import ReportTagFilter from './ReportTagFilter';
import ReportList from './ReportList';
import RuntimeParameterForm from './RuntimeParameterForm';
import RunReportButton from './RunReportButton';
import ReportExplorerRail from './ReportExplorerRail';

import type { ReportLibraryItem, ReportCategoryDto } from '../../types';
import type { LinelistParameter } from '../../../../types/linelist-types';

interface ReportExplorerPanelProps {
  collapsed: boolean;
  width: number;
  onCollapse: () => void;
  onExpand: () => void;
  // Report data
  categories: ReportCategoryDto[];
  availableTags: string[];
  reports: ReportLibraryItem[];
  // Current state
  searchQuery: string;
  selectedCategory?: string;
  selectedTags: string[];
  selectedReportUuid?: string;
  // Parameters
  reportParameters: LinelistParameter[];
  parameterValues: Record<string, any>;
  parameterErrors: Record<string, string>;
  // Handlers
  onSearchChange: (value: string) => void;
  onCategoryChange: (category?: string) => void;
  onTagsChange: (tags: string[]) => void;
  onReportSelect: (report: ReportLibraryItem) => void;
  onParameterChange: (values: Record<string, any>) => void;
  onParametersReset: () => void;
  onRunReport: () => void;
  // UI state
  loading?: boolean;
  runningReport?: boolean;
}

const ReportExplorerPanel: React.FC<ReportExplorerPanelProps> = ({
  collapsed,
  width,
  onCollapse,
  onExpand,
  categories,
  availableTags,
  reports,
  searchQuery,
  selectedCategory,
  selectedTags,
  selectedReportUuid,
  reportParameters,
  parameterValues,
  parameterErrors,
  onSearchChange,
  onCategoryChange,
  onTagsChange,
  onReportSelect,
  onParameterChange,
  onParametersReset,
  onRunReport,
  loading,
  runningReport,
}) => {
  // Determine badge counts for rail
  const searchActive = searchQuery.trim().length > 0;
  const categoryCount = categories.length;
  const selectedTagCount = selectedTags.length;
  const matchingReportCount = reports.length;

  // Check parameter types for rail icons
  const hasDateParams = reportParameters.some(p => p.type === 'DATE' || p.type === 'DATETIME');
  const hasLocationParams = reportParameters.some(p => p.type === 'LOCATION');
  const hasOtherParams = reportParameters.some(p =>
    !['DATE', 'DATETIME', 'LOCATION'].includes(p.type)
  );
  const hasSelectedReport = !!selectedReportUuid;

  // Show rail when collapsed
  if (collapsed) {
    return (
      <ReportExplorerRail
        onExpand={onExpand}
        onRunReport={onRunReport}
        searchActive={searchActive}
        categoryCount={categoryCount}
        selectedTagCount={selectedTagCount}
        matchingReportCount={matchingReportCount}
        hasDateParams={hasDateParams}
        hasLocationParams={hasLocationParams}
        hasOtherParams={hasOtherParams}
        hasSelectedReport={hasSelectedReport}
      />
    );
  }

  return (
    <aside
      className={`${styles.explorerPanel}`}
      style={{ width }}
    >
      {/* Panel Header - adapted from linelist-builder-workspace */}
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Report Explorer</h3>
        <Button
          kind="ghost"
          size="sm"
          hasIconOnly
          renderIcon={ChevronLeft}
          iconDescription="Hide report explorer"
          onClick={onCollapse}
        />
      </div>

      {/* Panel Content - Phase 2 components */}
      <div className={styles.panelContent}>
        {/* Compact Filter Section - fixed at top */}
        <div className={styles.filterSection} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e0e0e0' }}>
          {/* Search */}
          <ReportSearch
            value={searchQuery}
            onChange={onSearchChange}
            disabled={loading}
          />

          {/* Category Filter */}
          <ReportCategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={onCategoryChange}
            disabled={loading}
          />

          {/* Tag Filter */}
          {availableTags.length > 0 && (
            <ReportTagFilter
              availableTags={availableTags}
              selectedTags={selectedTags}
              onChange={onTagsChange}
              disabled={loading}
            />
          )}
        </div>

        {/* Parameters Section - shown when report is selected */}
        {selectedReportUuid && reportParameters.length > 0 && (
          <div className={styles.parameterSection} style={{ padding: '0.75rem 0', borderBottom: '1px solid #e0e0e0' }}>
            <RuntimeParameterForm
              parameters={reportParameters}
              values={parameterValues}
              errors={parameterErrors}
              onChange={onParameterChange}
              onReset={onParametersReset}
              disabled={runningReport}
            />
            {/* Run Report Button */}
            <div style={{ marginTop: '0.75rem' }}>
              <RunReportButton
                reportSelected={!!selectedReportUuid}
                loading={runningReport}
                onClick={onRunReport}
              />
            </div>
          </div>
        )}

        {/* Report List - takes remaining space and scrolls independently */}
        <div className={styles.reportsListWrapper} style={{ flex: 1, overflow: 'auto', paddingTop: '0.75rem' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
            Reports {reports.length > 0 && `(${reports.length})`}
          </h4>
          <ReportList
            reports={reports}
            selectedReportUuid={selectedReportUuid}
            onSelect={onReportSelect}
            loading={loading}
          />
        </div>
      </div>
    </aside>
  );
};

export default ReportExplorerPanel;

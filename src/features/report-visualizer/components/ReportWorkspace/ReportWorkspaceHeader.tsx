/**
 * Report Workspace Header Component
 *
 * Header for the workspace panel with report title, view tabs, and actions.
 * Integrates ReportViewTabs and ExportMenu.
 *
 * Phase 3.1: Workspace header with view tabs and export
 */
import React from 'react';
import { ButtonSet, Button } from '@carbon/react';
import { SendAlt } from '@carbon/react/icons';

import ReportViewTabs from './ReportViewTabs';
import { ExportMenu } from '../Export';
import type { ReportCapabilities, ReportViewType } from '../../types';

interface ReportWorkspaceHeaderProps {
  reportName: string;
  reportDescription?: string;
  capabilities: ReportCapabilities;
  activeView: ReportViewType;
  onViewChange: (view: ReportViewType) => void;
  onExport: (format: 'CSV' | 'XLSX' | 'PDF') => void;
  onSendToDhis2?: () => void;
  loading?: boolean;
  hasResults?: boolean; // Only show action buttons when report has results
}

const ReportWorkspaceHeader: React.FC<ReportWorkspaceHeaderProps> = ({
  reportName,
  reportDescription,
  capabilities,
  activeView,
  onViewChange,
  onExport,
  onSendToDhis2,
  loading,
  hasResults = false,
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem' }}>
      {/* Left: Report info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#161616' }}>
          {reportName}
        </h3>
        {reportDescription && (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#666' }}>
            {reportDescription}
          </p>
        )}
      </div>

      {/* Center: View tabs */}
      <div style={{ flex: '0 0 auto' }}>
        <ReportViewTabs
          capabilities={capabilities}
          activeView={activeView}
          onViewChange={onViewChange}
          disabled={loading}
        />
      </div>

      {/* Right: Actions - only shown when report has results */}
      {hasResults && (
        <ButtonSet>
          {/* Send to DHIS2 - only shown if capability exists */}
          {onSendToDhis2 && capabilities.sendToDhis2 && (
            <Button
              kind="secondary"
              size="sm"
              renderIcon={SendAlt}
              onClick={onSendToDhis2}
              disabled={loading}
            >
              DHIS2
            </Button>
          )}

          {/* Export menu */}
          <ExportMenu
            onExport={onExport}
            disabled={loading}
            loading={loading}
          />
        </ButtonSet>
      )}
    </div>
  );
};

export default ReportWorkspaceHeader;

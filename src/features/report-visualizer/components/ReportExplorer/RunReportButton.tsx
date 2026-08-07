/**
 * Run Report Button Component
 *
 * Primary action button at the bottom of the explorer panel.
 * Properly labeled "Run report" (not "View report").
 *
 * Phase 2.6: Run report button
 */
import React from 'react';
import { Button } from '@carbon/react';
import { Play, ArrowRight } from '@carbon/react/icons';

interface RunReportButtonProps {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  reportSelected?: boolean;
}

const RunReportButton: React.FC<RunReportButtonProps> = ({
  disabled,
  loading,
  onClick,
  reportSelected,
}) => {
  return (
    <div style={{ padding: '1rem', borderTop: '1px solid #e0e0e0', marginTop: 'auto' }}>
      <Button
        kind="primary"
        size="lg"
        renderIcon={reportSelected ? Play : ArrowRight}
        onClick={onClick}
        disabled={disabled || loading || !reportSelected}
        style={{ width: '100%' }}
      >
        {loading ? 'Running...' : reportSelected ? 'Run report' : 'Select a report'}
      </Button>
    </div>
  );
};

export default RunReportButton;

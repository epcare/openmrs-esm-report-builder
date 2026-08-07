/**
 * Report Explorer Rail Component
 *
 * Icon rail shown when explorer panel is collapsed.
 * Displays icons with badges and tooltips for quick access.
 *
 * Phase 4: Collapsed rail state
 */
import React from 'react';
import {
  Button,
  Tooltip,
  Tag,
} from '@carbon/react';
import {
  ChevronRight,
  Search,
  Folder,
  Tag as TagIcon,
  Document,
  Calendar,
  Location,
  Filter,
  Play,
} from '@carbon/react/icons';
import styles from '../../report-visualizer.scss';

interface ReportExplorerRailProps {
  onExpand: () => void;
  onRunReport?: () => void;
  // State for badges
  searchActive?: boolean;
  categoryCount?: number;
  selectedTagCount?: number;
  matchingReportCount?: number;
  hasDateParams?: boolean;
  hasLocationParams?: boolean;
  hasOtherParams?: boolean;
  hasSelectedReport?: boolean;
}

const RailIcon: React.FC<{
  icon: React.ElementType;
  label: string;
  badge?: number | boolean;
  disabled?: boolean;
  onClick?: () => void;
  isPrimaryAction?: boolean;
}> = ({ icon: Icon, label, badge, disabled, onClick, isPrimaryAction }) => {
  const button = (
    <Button
      kind={isPrimaryAction ? 'primary' : 'ghost'}
      size="sm"
      hasIconOnly
      renderIcon={Icon}
      iconDescription={label}
      onClick={onClick}
      disabled={disabled}
      style={{ margin: '0.25rem 0' }}
    />
  );

  // Show badge if number or if boolean is true
  const showBadge = typeof badge === 'number' ? badge > 0 : badge;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {button}
      {showBadge && (
        <Tag
          size="sm"
          type={isPrimaryAction ? 'green' : 'blue'}
          style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            padding: '0 4px',
            minHeight: '16px',
            fontSize: '0.625rem',
            fontWeight: 600,
          }}
        >
          {typeof badge === 'number' ? badge : ''}
        </Tag>
      )}
    </div>
  );
};

const ReportExplorerRail: React.FC<ReportExplorerRailProps> = ({
  onExpand,
  onRunReport,
  searchActive,
  categoryCount,
  selectedTagCount,
  matchingReportCount,
  hasDateParams,
  hasLocationParams,
  hasOtherParams,
  hasSelectedReport,
}) => {
  return (
    <aside
      className={`${styles.explorerPanel} ${styles.collapsed}`}
      style={{ width: 48, alignItems: 'center', padding: '0.5rem 0' }}
    >
      {/* Expand button - always at top */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
        <Tooltip align="right" direction="right" label="Show report explorer">
          <RailIcon icon={ChevronRight} label="Show report explorer" onClick={onExpand} />
        </Tooltip>

        {/* Search icon - with badge if active */}
        {searchActive !== undefined && (
          <Tooltip
            align="right"
            direction="right"
            label={searchActive ? 'Search active' : 'Search reports'}
          >
            <RailIcon icon={Search} label="Search" badge={searchActive} />
          </Tooltip>
        )}

        {/* Category icon - with badge for count */}
        {categoryCount !== undefined && (
          <Tooltip
            align="right"
            direction="right"
            label={`Category${categoryCount === 1 ? '' : 'ies'}: ${categoryCount}`}
          >
            <RailIcon icon={Folder} label="Category filter" badge={categoryCount} />
          </Tooltip>
        )}

        {/* Tag icon - with badge for selected count */}
        {selectedTagCount !== undefined && selectedTagCount > 0 && (
          <Tooltip
            align="right"
            direction="right"
            label={`${selectedTagCount} tag${selectedTagCount === 1 ? '' : 's'} selected`}
          >
            <RailIcon icon={TagIcon} label="Tag filter" badge={selectedTagCount} />
          </Tooltip>
        )}

        {/* Report icon - with badge for matching count */}
        {matchingReportCount !== undefined && (
          <Tooltip
            align="right"
            direction="right"
            label={`${matchingReportCount} report${matchingReportCount === 1 ? '' : 's'} found`}
          >
            <RailIcon icon={Document} label="Reports" badge={matchingReportCount} />
          </Tooltip>
        )}

        {/* Date params icon - only show if report has date parameters */}
        {hasDateParams && (
          <Tooltip align="right" direction="right" label="Date parameters">
            <RailIcon icon={Calendar} label="Date parameters" badge={true} />
          </Tooltip>
        )}

        {/* Location params icon - only show if report has location parameters */}
        {hasLocationParams && (
          <Tooltip align="right" direction="right" label="Location parameters">
            <RailIcon icon={Location} label="Location parameters" badge={true} />
          </Tooltip>
        )}

        {/* Other params icon - only show if report has other parameters */}
        {hasOtherParams && (
          <Tooltip align="right" direction="right" label="Other parameters">
            <RailIcon icon={Filter} label="Parameters" badge={true} />
          </Tooltip>
        )}

        {/* Spacer before run button */}
        <div style={{ flex: 1 }} />

        {/* Run report button - at bottom */}
        {onRunReport && (
          <Tooltip
            align="right"
            direction="right"
            label={hasSelectedReport ? 'Run report' : 'Select a report first'}
          >
            <RailIcon
              icon={Play}
              label={hasSelectedReport ? 'Run report' : 'Select a report'}
              onClick={onRunReport}
              disabled={!hasSelectedReport}
              isPrimaryAction
            />
          </Tooltip>
        )}
      </div>
    </aside>
  );
};

export default ReportExplorerRail;

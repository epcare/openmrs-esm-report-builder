/**
 * Quick Filters Component
 *
 * Common filter presets for fast navigation through reports.
 * Provides one-click access to frequently used filter combinations.
 *
 * Presets:
 * - All Reports: Clear all filters
 * - Recent: Show recently used reports (placeholder for future)
 * - Favorites: Show favorited reports (placeholder for future)
 * - My Reports: Show user's reports (placeholder for future)
 *
 * Phase 2.5: Quick filter presets
 */
import React from 'react';
import { Button, Tag } from '@carbon/react';
import {
  Renew,
  Star,
  User,
  Time,
} from '@carbon/react/icons';

interface QuickFiltersProps {
  onClearAll: () => void;
  disabled?: boolean;
  hasActiveFilters?: boolean;
}

interface QuickFilter {
  id: string;
  label: string;
  icon: React.ElementType;
  action: 'clear' | 'recent' | 'favorites' | 'mine';
  disabled?: boolean;
}

const QUICK_FILTERS: QuickFilter[] = [
  {
    id: 'all',
    label: 'All Reports',
    icon: Renew,
    action: 'clear',
  },
  {
    id: 'recent',
    label: 'Recent',
    icon: Time,
    action: 'recent',
    disabled: true, // Placeholder for future feature
  },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: Star,
    action: 'favorites',
    disabled: true, // Placeholder for future feature
  },
  {
    id: 'mine',
    label: 'My Reports',
    icon: User,
    action: 'mine',
    disabled: true, // Placeholder for future feature
  },
];

const QuickFilters: React.FC<QuickFiltersProps> = ({
  onClearAll,
  disabled,
  hasActiveFilters = false,
}) => {
  const handleFilterClick = (filter: QuickFilter) => {
    if (filter.disabled || disabled) return;

    switch (filter.action) {
      case 'clear':
        onClearAll();
        break;
      // Other actions are placeholders for future features
      default:
        break;
    }
  };

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        {QUICK_FILTERS.map((filter) => {
          const Icon = filter.icon;
          const isClearAction = filter.action === 'clear';
          const isActive = isClearAction && hasActiveFilters;

          return (
            <Button
              key={filter.id}
              kind={isActive ? 'secondary' : 'ghost'}
              size="sm"
              disabled={disabled || filter.disabled}
              onClick={() => handleFilterClick(filter)}
              style={{
                minWidth: 'auto',
                padding: '0.375rem 0.625rem',
                fontSize: '0.75rem',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <Icon size={14} />
              {filter.label}
              {filter.disabled && (
                <Tag
                  size="sm"
                  type="cool-gray"
                  style={{
                    marginLeft: '0.25rem',
                    fontSize: '0.625rem',
                    padding: '0 4px',
                  }}
                >
                  Soon
                </Tag>
              )}
            </Button>
          );
        })}
      </div>
      {hasActiveFilters && (
        <div
          style={{
            fontSize: '0.7rem',
            color: '#666',
            marginTop: '0.375rem',
            fontStyle: 'italic',
          }}
        >
          Active filters applied • Click "All Reports" to clear
        </div>
      )}
    </div>
  );
};

export default QuickFilters;

/**
 * Report List Component
 *
 * Enhanced list of filtered reports with keyboard navigation, hover states,
 * and improved visual feedback. Supports arrow keys, Enter, and Escape.
 *
 * Improvements:
 * - Keyboard navigation (↑/↓ arrows, Enter to select, Escape to clear)
 * - Hover states with smooth transitions
 * - Better visual hierarchy with selection highlight
 * - Keyboard focus indicator
 * - Empty state with helpful message
 * - Loading skeleton
 *
 * Phase 2.4: Report list display (Enhanced)
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Checkmark, Document, Search } from '@carbon/react/icons';

import type { ReportLibraryItem } from '../../types';

interface ReportListProps {
  reports: ReportLibraryItem[];
  selectedReportUuid?: string;
  onSelect: (report: ReportLibraryItem) => void;
  loading?: boolean;
  searchQuery?: string;
}

const ReportList: React.FC<ReportListProps> = ({
  reports,
  selectedReportUuid,
  onSelect,
  loading,
  searchQuery = '',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (reports.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) => {
          const next = Math.min(prev + 1, reports.length - 1);
          // Scroll into view
          itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        break;

      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          // Scroll into view
          itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
        break;

      case 'Enter':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < reports.length) {
          onSelect(reports[focusedIndex]);
        }
        break;

      case 'Escape':
        event.preventDefault();
        setFocusedIndex(-1);
        break;
    }
  }, [reports, focusedIndex, onSelect]);

  // Reset focused index when reports change
  useEffect(() => {
    setFocusedIndex(-1);
    setHoveredIndex(null);
  }, [reports.length, searchQuery]);

  // Set focused index to selected report when selection changes
  useEffect(() => {
    if (selectedReportUuid) {
      const selectedIndex = reports.findIndex((r) => r.uuid === selectedReportUuid);
      if (selectedIndex >= 0) {
        setFocusedIndex(selectedIndex);
      }
    }
  }, [selectedReportUuid, reports]);

  if (loading) {
    return (
      <div style={{ padding: '1rem' }}>
        {/* Loading skeleton */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              padding: '0.75rem',
              marginBottom: '0.5rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          >
            <div
              style={{
                height: '14px',
                width: '70%',
                backgroundColor: '#e0e0e0',
                borderRadius: '2px',
                marginBottom: '0.5rem',
              }}
            />
            <div
              style={{
                height: '12px',
                width: '40%',
                backgroundColor: '#e0e0e0',
                borderRadius: '2px',
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div
        style={{
          padding: '2rem 1rem',
          textAlign: 'center',
          color: '#666',
        }}
      >
        {searchQuery ? (
          <>
            <Search
              size={32}
              style={{ marginBottom: '0.75rem', opacity: 0.4, color: '#999' }}
            />
            <p style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              No reports match "{searchQuery}"
            </p>
            <p style={{ fontSize: '0.75rem', color: '#999' }}>
              Try adjusting your search or filters
            </p>
          </>
        ) : (
          <>
            <Document
              size={32}
              style={{ marginBottom: '0.75rem', opacity: 0.4 }}
            />
            <p style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              No reports available
            </p>
            <p style={{ fontSize: '0.75rem', color: '#999' }}>
              Select a category to see reports
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Reports"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
    >
      {reports.map((report, index) => {
        const isSelected = report.uuid === selectedReportUuid;
        const isFocused = index === focusedIndex;
        const isHovered = index === hoveredIndex;

        return (
          <div
            key={report.uuid}
            ref={(el) => (itemRefs.current[index] = el)}
            onClick={() => onSelect(report)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            role="option"
            aria-selected={isSelected}
            tabIndex={isFocused ? 0 : -1}
            style={{
              padding: '0.75rem',
              backgroundColor: isSelected
                ? '#e0f2ff'
                : isFocused
                ? '#f4f8ff'
                : isHovered
                ? '#fafafa'
                : '#ffffff',
              border: isSelected
                ? '2px solid #0f62fe'
                : isFocused
                ? '2px solid #8ca3f7'
                : '1px solid #e0e0e0',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease',
              transform: isFocused ? 'translateX(2px)' : 'translateX(0)',
              boxShadow: isFocused
                ? '0 2px 8px rgba(15, 98, 254, 0.15)'
                : isSelected
                ? '0 1px 4px rgba(15, 98, 254, 0.1)'
                : 'none',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: isSelected || isFocused ? 600 : 500,
                  color: '#161616',
                  marginBottom: '0.25rem',
                  fontSize: '0.875rem',
                }}
              >
                {report.name}
              </div>
              {report.code && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#666',
                    display: 'inline-block',
                    padding: '2px 6px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '3px',
                    marginBottom: '0.25rem',
                  }}
                >
                  {report.code}
                </div>
              )}
              {report.description && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#666',
                    marginTop: '0.25rem',
                    lineHeight: '1.4',
                  }}
                >
                  {report.description}
                </div>
              )}
            </div>
            {isSelected && (
              <div
                style={{
                  backgroundColor: '#0f62fe',
                  borderRadius: '50%',
                  padding: '4px',
                  flexShrink: 0,
                  marginLeft: '0.5rem',
                  marginTop: '2px',
                }}
              >
                <Checkmark size={12} style={{ color: '#ffffff' }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ReportList;

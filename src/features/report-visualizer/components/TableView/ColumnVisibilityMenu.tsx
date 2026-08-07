/**
 * Column Visibility Menu Component
 *
 * Button and menu for toggling column visibility in the report table.
 * Shows all columns with checkboxes for visibility control.
 *
 * Phase 7.2: Column visibility menu
 */
import React, { useState, useRef, useEffect } from 'react';
import { Button, Checkbox, Layer } from '@carbon/react';
import { View } from '@carbon/react/icons';

interface ColumnVisibilityMenuProps {
  columns: string[];
  hiddenColumns: Set<string>;
  onToggleColumn: (columnName: string) => void;
  onShowAll?: () => void;
  onHideAll?: () => void;
  disabled?: boolean;
}

const ColumnVisibilityMenu: React.FC<ColumnVisibilityMenuProps> = ({
  columns,
  hiddenColumns,
  onToggleColumn,
  onShowAll,
  onHideAll,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const visibleCount = columns.length - hiddenColumns.size;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (columnName: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    onToggleColumn(columnName);
  };

  const handleShowAll = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onShowAll) {
      onShowAll();
    }
    setIsOpen(false);
  };

  const handleHideAll = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onHideAll) {
      onHideAll();
    }
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Button
        ref={buttonRef}
        kind="ghost"
        size="sm"
        renderIcon={View}
        hasIconOnly
        iconDescription="Column visibility"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        Columns
      </Button>
      {visibleCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: '#0f62fe',
            color: 'white',
            fontSize: '10px',
            minWidth: '16px',
            height: '16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
          }}
        >
          {visibleCount}
        </span>
      )}

      {isOpen && (
        <Layer>
          <div
            ref={menuRef}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              minWidth: '250px',
              maxHeight: '400px',
              overflowY: 'auto',
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '0.5rem' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Column Visibility ({visibleCount} of {columns.length} shown)
              </div>

              {columns.length > 1 && (
                <div style={{ marginBottom: '0.5rem', borderBottom: '1px solid #e0e0e0', paddingBottom: '0.5rem' }}>
                  {onShowAll && (
                    <Button
                      kind="ghost"
                      size="sm"
                      onClick={handleShowAll}
                      style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '0.25rem' }}
                    >
                      Show all
                    </Button>
                  )}
                  {onHideAll && (
                    <Button
                      kind="ghost"
                      size="sm"
                      onClick={handleHideAll}
                      style={{ width: '100%', justifyContent: 'flex-start' }}
                    >
                      Hide all
                    </Button>
                  )}
                </div>
              )}

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {columns.map((columnName) => (
                  <div
                    key={columnName}
                    style={{
                      padding: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      transition: 'background-color 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f3f3';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={(e) => handleToggle(columnName, e)}
                  >
                    <Checkbox
                      id={`col-${columnName}`}
                      checked={!hiddenColumns.has(columnName)}
                      onChange={() => handleToggle(columnName)}
                      labelText={columnName}
                      style={{ margin: 0 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Layer>
      )}
    </div>
  );
};

export default ColumnVisibilityMenu;

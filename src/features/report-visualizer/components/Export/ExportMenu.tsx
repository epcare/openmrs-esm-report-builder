/**
 * Export Menu Component
 *
 * Button and menu for export options (CSV, XLSX, PDF).
 * Reuses export functionality from existing data-visualizer.
 *
 * Phase 3.5: Export menu
 */
import React, { useState, useRef, useEffect } from 'react';
import { Button, Layer } from '@carbon/react';
import { Download } from '@carbon/react/icons';

export type ExportFormat = 'CSV' | 'XLSX' | 'PDF';

interface ExportMenuProps {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  loading?: boolean;
}

const ExportMenu: React.FC<ExportMenuProps> = ({ onExport, disabled, loading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  const handleExport = (format: ExportFormat, event: React.MouseEvent) => {
    event.stopPropagation();
    setIsOpen(false);
    onExport(format);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Button
        ref={buttonRef}
        kind="ghost"
        size="sm"
        renderIcon={Download}
        iconDescription="Export"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || loading}
      >
        Export
      </Button>

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
              minWidth: '200px',
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '0.5rem',
                cursor: 'pointer',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f3f3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={(e) => handleExport('CSV', e)}
            >
              Export as CSV
            </div>
            <div
              style={{
                padding: '0.5rem',
                cursor: 'pointer',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f3f3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={(e) => handleExport('XLSX', e)}
            >
              Export as Excel (XLSX)
            </div>
            <div
              style={{
                padding: '0.5rem',
                cursor: 'pointer',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f3f3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={(e) => handleExport('PDF', e)}
            >
              Export as PDF
            </div>
          </div>
        </Layer>
      )}
    </div>
  );
};

export default ExportMenu;

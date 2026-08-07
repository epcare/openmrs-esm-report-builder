/**
 * Report Search Component
 *
 * Enhanced search input with keyboard shortcut (Ctrl+K / Cmd+K), quick clear,
 * and better visual feedback for filtering reports by name, code, or tag.
 *
 * Improvements:
 * - Global keyboard shortcut (Ctrl+K / Cmd+K)
 * - Visual indicator for active search
 * - Quick clear button when has value
 * - Better placeholder with shortcut hint
 * - Focus ring for accessibility
 *
 * Phase 2.1: Search functionality (Enhanced)
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TextInput, Button } from '@carbon/react';
import { Close, Search as SearchIcon } from '@carbon/react/icons';

interface ReportSearchProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const ReportSearch: React.FC<ReportSearchProps> = ({ value, onChange, disabled }) => {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Create debounced onChange function
  const debouncedOnChange = useMemo(
    () => {
      let timeoutId: NodeJS.Timeout | null = null;
      return (newValue: string) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          onChange(newValue);
        }, 200); // Faster debounce for better responsiveness
      };
    },
    [onChange]
  );

  // Sync local value when prop value changes externally
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Handle keyboard shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  };

  const hasValue = localValue.length > 0;
  const isActive = value.length > 0;

  return (
    <div style={{ position: 'relative' }}>
      <TextInput
        ref={inputRef}
        id="report-search-input"
        labelText=""
        placeholder="Search... (⌘K)"
        value={localValue}
        onChange={handleChange}
        disabled={disabled}
        size="sm"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          borderColor: isActive ? '#0f62fe' : isFocused ? '#0f62fe' : undefined,
          backgroundColor: isActive ? '#f4f8ff' : undefined,
        }}
      />
      {/* Search icon on left */}
      <div
        style={{
          position: 'absolute',
          left: '0.75rem',
          top: '50%',
          transform: 'translateY(-50%)',
          color: isActive ? '#0f62fe' : '#666',
          pointerEvents: 'none',
          transition: 'color 0.15s ease',
        }}
      >
        <SearchIcon size={16} />
      </div>
      {/* Clear button on right - only show when has value */}
      {hasValue && (
        <Button
          kind="ghost"
          size="sm"
          hasIconOnly
          renderIcon={Close}
          iconDescription="Clear search"
          onClick={handleClear}
          style={{
            position: 'absolute',
            right: '0.25rem',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '0.25rem',
            minWidth: 'auto',
            width: '28px',
            height: '28px',
          }}
        />
      )}
      {/* Active indicator */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            left: '0',
            top: '0',
            bottom: '0',
            width: '3px',
            backgroundColor: '#0f62fe',
            borderRadius: '4px 0 0 4px',
          }}
        />
      )}
    </div>
  );
};

export default ReportSearch;

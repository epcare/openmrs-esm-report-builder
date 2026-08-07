/**
 * Report Tag Filter Component
 *
 * Multi-select tag filter for filtering reports by tags.
 * Shows selected tags as removable chips.
 * Uses AND logic: report must match ALL selected tags.
 *
 * Phase 2.3: Tag filtering
 */
import React, { useState, useMemo } from 'react';
import { Tag, ComboBox, Button } from '@carbon/react';
import { Close } from '@carbon/react/icons';

interface ReportTagFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

const ReportTagFilter: React.FC<ReportTagFilterProps> = ({
  availableTags,
  selectedTags,
  onChange,
  disabled,
}) => {
  const [inputValue, setInputValue] = useState('');

  // Convert available tags to ComboBox items format
  const tagItems = useMemo(() => {
    return availableTags
      .filter((tag) => !selectedTags.includes(tag))
      .map((tag) => ({
        id: tag,
        label: tag,
        value: tag,
      }));
  }, [availableTags, selectedTags]);

  // Remove a tag from selection
  const handleRemoveTag = (tagToRemove: string) => {
    onChange(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  // Add a tag from ComboBox
  const handleAddTag = (selectedItem: any) => {
    if (selectedItem && !selectedTags.includes(selectedItem.value)) {
      onChange([...selectedTags, selectedItem.value]);
      setInputValue('');
    }
  };

  return (
    <div>
      {/* Selected tags display */}
      {selectedTags.length > 0 && (
        <div style={{ marginBottom: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {selectedTags.map((tag) => (
            <Tag
              key={tag}
              type="blue"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              {tag}
              <Button
                kind="ghost"
                size="sm"
                hasIconOnly
                renderIcon={Close}
                iconDescription={`Remove ${tag}`}
                onClick={() => handleRemoveTag(tag)}
                style={{ marginLeft: '0.25rem', padding: '0' }}
              />
            </Tag>
          ))}
        </div>
      )}

      {/* Tag selector */}
      <ComboBox
        id="report-tag-filter"
        titleText="Tags"
        placeholder="Add tag filter"
        items={tagItems}
        value={inputValue}
        itemToString={(item: any) => item?.label || ''}
        onChange={({ selectedItem }) => {
          if (selectedItem) {
            handleAddTag(selectedItem);
          }
        }}
        onInputChange={(e: any) => setInputValue(e.target.value || '')}
        disabled={disabled}
        size="sm"
      />
    </div>
  );
};

export default ReportTagFilter;

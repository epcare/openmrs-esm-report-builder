/**
 * Report Category Filter Component
 *
 * Dropdown filter for selecting report categories.
 * First option is "All report categories" to show all reports.
 *
 * Phase 2.2: Category filtering
 */
import React from 'react';
import { Select, SelectItem } from '@carbon/react';

import type { ReportCategoryDto } from '../../types';

interface ReportCategoryFilterProps {
  categories: ReportCategoryDto[];
  selectedCategory?: string;
  onSelect: (category: string | undefined) => void;
  disabled?: boolean;
}

const ReportCategoryFilter: React.FC<ReportCategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelect,
  disabled,
}) => {
  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    // If "All" is selected, pass undefined to clear filter
    onSelect(value === 'all' ? undefined : value);
  };

  return (
    <Select
      id="report-category-filter"
      labelText="Category"
      value={selectedCategory || 'all'}
      onChange={handleCategoryChange}
      disabled={disabled}
      size="sm"
    >
      <SelectItem value="all" text="All report categories" />
      {categories.map((category) => (
        <SelectItem
          key={category.uuid}
          value={category.uuid}
          text={category.display || category.name}
        />
      ))}
    </Select>
  );
};

export default ReportCategoryFilter;

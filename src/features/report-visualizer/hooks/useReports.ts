/**
 * useReports Hook
 *
 * Combines report data fetching with filtering by search, category, and tags.
 * Uses existing useGetReportLibrary hook from data-visualizer.resource.
 *
 * Phase 5.1: Reports hook with filtering
 */
import { useMemo, useCallback } from 'react';
import { useGetReportLibrary } from '../../../components/data-visualizer/data-visualizer.resource';
import type { ReportLibraryItem } from '../types';

/**
 * Extract tags from a report's metaJson
 * Tags should be stored in metaJson as: { "tags": ["tag1", "tag2", ...] }
 */
function extractTagsFromReport(report: ReportLibraryItem): string[] {
  if (!report.metaJson) return [];

  try {
    const meta = JSON.parse(report.metaJson);
    // Support both tags array and tags string (comma-separated)
    if (Array.isArray(meta.tags)) {
      return meta.tags;
    }
    if (typeof meta.tags === 'string') {
      return meta.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Get all unique tags from all reports
 */
function getAllUniqueTags(reports: ReportLibraryItem[]): string[] {
  const tagSet = new Set<string>();
  reports.forEach((report) => {
    const tags = extractTagsFromReport(report);
    tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

interface UseReportsResult {
  reports: ReportLibraryItem[];
  filteredReports: ReportLibraryItem[];
  availableTags: string[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  getReportByUuid: (uuid: string) => ReportLibraryItem | undefined;
}

interface UseReportsOptions {
  searchQuery: string;
  selectedCategory?: string;
  selectedTags: string[];
}

/**
 * Hook for managing report library with filtering
 * @param options - Filter options for reports
 */
export function useReports(options: UseReportsOptions): UseReportsResult {
  const { searchQuery, selectedCategory, selectedTags } = options;

  // Use existing report library hook
  const {
    reportLibrary,
    isLoadingReportLibrary: loading,
    isError,
    mutate: refresh,
  } = useGetReportLibrary();

  // Filter reports based on search, category, and tags
  const filteredReports = useMemo(() => {
    let filtered = reportLibrary ?? [];

    // Filter by search query (name, code, description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((report: ReportLibraryItem) => {
        const name = report.name?.toLowerCase() || '';
        const code = report.code?.toLowerCase() || '';
        const description = report.description?.toLowerCase() || '';
        return name.includes(query) || code.includes(query) || description.includes(query);
      });
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((report: ReportLibraryItem) => {
        return report.category?.uuid === selectedCategory;
      });
    }

    // Filter by tags (AND logic - all selected tags must match)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((report: ReportLibraryItem) => {
        const reportTags = extractTagsFromReport(report);
        return selectedTags.every((tag) => reportTags.includes(tag));
      });
    }

    return filtered;
  }, [reportLibrary, searchQuery, selectedCategory, selectedTags]);

  // Get all unique tags from reports
  const availableTags = useMemo(() => {
    return getAllUniqueTags(reportLibrary ?? []);
  }, [reportLibrary]);

  // Get report by UUID helper
  const getReportByUuid = useCallback(
    (uuid: string): ReportLibraryItem | undefined => {
      return reportLibrary?.find((report: ReportLibraryItem) => report.uuid === uuid);
    },
    [reportLibrary]
  );

  return {
    reports: reportLibrary ?? [],
    filteredReports,
    availableTags,
    loading,
    error: isError ? (isError as Error) : null,
    refresh: () => refresh(),
    getReportByUuid,
  };
}

export default useReports;


export type ReportSectionRef = {
  sectionUuid: string;
  sortOrder: number;
  titleOverride?: string;
  enabled: boolean;
};

export type ReportDefinitionDraft = {
  name: string;
  code: string;
  description: string;
  sections: ReportSectionRef[];
};

export type SectionLibraryItem = {
  uuid: string;
  name: string;
  description?: string;
  code?: string;
  indicatorCount: number;
  disaggregationEnabled: boolean;
  ageCategoryCode?: string | null;
  raw: any;
};

export function createEmptyReportDefinitionDraft(): ReportDefinitionDraft {
  return {
    name: '',
    code: '',
    description: '',
    sections: [],
  };
}

export function parseSectionLibraryItem(section: any): SectionLibraryItem {
  let indicatorCount = 0;
  let disaggregationEnabled = false;
  let ageCategoryCode: string | null | undefined = null;

  try {
    const cfg = section.configJson ? JSON.parse(section.configJson) : null;
    indicatorCount = Array.isArray(cfg?.indicators) ? cfg.indicators.length : 0;
    disaggregationEnabled = Boolean(cfg?.disaggregation && cfg?.disaggregation?.none !== true);
    ageCategoryCode = cfg?.disaggregation?.ageCategoryCode ?? null;
  } catch {
    indicatorCount = 0;
    disaggregationEnabled = false;
    ageCategoryCode = null;
  }

  return {
    uuid: section.uuid,
    name: section.name,
    description: section.description,
    code: section.code,
    indicatorCount,
    disaggregationEnabled,
    ageCategoryCode,
    raw: section,
  };
}

export function sortReportSections<T extends { sortOrder: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

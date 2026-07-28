/**
 * Linelist Builder Workspace - Three-Panel Layout
 *
 * Full-width, three-panel workspace for creating and editing linelist reports.
 * Follows design spec section 6: Screen 3 — Builder workspace.
 *
 * Layout (Desktop 1440px+):
 * - Left: Data Catalogue (280px, resizable)
 * - Middle: Query Configuration (400px, resizable)
 * - Right: Preview (remaining width, minimum 560px)
 *
 * Panels can collapse at smaller desktop widths.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Button,
  ButtonSet,
  InlineNotification,
  Tag,
  TextInput,
  OverflowMenu,
  OverflowMenuItem,
} from '@carbon/react';
import {
  Save,
  Send,
  Document,
  OverflowMenuHorizontal,
  ChevronLeft,
  ChevronRight,
} from '@carbon/react/icons';
import { useNavigate, useParams } from 'react-router-dom';

import type {
  LinelistReportDraft,
  LinelistColumnDraft,
  FilterFieldType,
  FilterOperator,
  DataSourceInfo,
  ColumnSource,
  LinelistSortConfig,
  LinelistDataDefinitionMap,
  PopulationDefinition,
} from '../../../types/linelist-types';
import type { EtlStructure } from '../../../types/etl/etl-types';
import {
  draftToConfig,
  isLinelistDraftReadyToCompile,
  // isLinelistDraftReadyToPublish,
  createEmptyDraft,
  // isLinelistDraftValid,
  validateLinelistDraft,
} from '../../../types/linelist-types';

import {
  createLinelistReport,
  updateLinelistReport,
  configToSavePayload,
  compileLinelistReport,
} from '../../../resources/linelist/linelist-reports.api';
import type { LinelistBuilderMeta } from '../../../resources/linelist/linelist-reports.api';
import type { LinelistReportDto } from '../../../types/linelist-types';
import { listReportCategories, type ReportCategoryDto } from '../../../resources/report-category/report-category.api';
import { listThemes } from '../../../resources/theme/data-theme.api';
import { useDataTheme } from '../../../hooks/theme';
import { useIndicatorsByTheme } from '../../../hooks/indicator';
import type { DataTheme, ThemeField } from '../../../types/theme/data-theme.types';

import DataCatalogue from './data-catalogue.component';
import QueryConfigPanel from '../config/query-config-panel.component';
import MultiDatasourceSelector from './multi-datasource-selector.component';
import type { CatalogueField } from './data-catalogue.component';
import type { CustomSqlColumnConfig } from './custom-sql-column-modal.component';
import styles from './linelist-builder-workspace.scss';
import type { LinelistReportDefinitionConfig } from '../../../types/linelist-types';
import CompileSetupModal, { type CompileSetupResult } from '../../shared/compile-setup-modal.component';

type Props = {};

/**
 * Convert LinelistReportDto to LinelistReportDraft for editing (v2)
 * This function populates the draft with all builder details from the saved report
 */
function reportToDraft(report: LinelistReportDto): LinelistReportDraft {
  console.log('🔴 reportToDraft called with:', report);

  let config: LinelistReportDefinitionConfig | null = null;

  try {
    config = report.configJson ? JSON.parse(report.configJson) : null;
    console.log('Parsed config:', config);
  } catch (e) {
    console.error('Failed to parse report config:', e);
  }

  // Check for valid LINE_LIST config (handle both type and reportType formats)
  const isValidLinelist = config && (
    config.type === 'LINE_LIST' ||
    (config as any).reportType === 'LINE_LIST' ||
    (config as any).reportType === 'LINELIST'
  );

  if (!config || !isValidLinelist) {
    console.warn('Invalid config or type, returning empty draft');
    return createEmptyDraft();
  }

  const now = new Date().toISOString();
  const dataSet = config.dataSetDefinitions?.[0];

  // The compiled backend format stores builder state under a `_builder` key.
  // Fall back to top-level config fields for older/intermediate formats.
  const builderState = (config as any)._builder;

  // === BUILD DATA SOURCES ARRAY ===
  const dataSources: DataSourceInfo[] = [];
  const configDataSources = builderState?.dataSources || config.dataSources;

  if (configDataSources && configDataSources.length > 0) {
    // V2 format (or compiled _builder) - use dataSources array directly
    configDataSources.forEach((ds: any) => {
      dataSources.push({
        uuid: ds.uuid,
        name: ds.name,
        type: ds.type as any,
        role: ds.role as any,
        tables: ds.columns ? Object.keys(ds.columns) : [],
      });
    });
  } else if (config.version === 1 || !config.dataSources) {
    // V1 format - migrate from dataSourceUuid
    const primaryDataSourceUuid = config.dataSourceUuid || '';
    if (primaryDataSourceUuid) {
      dataSources.push({
        uuid: primaryDataSourceUuid,
        name: primaryDataSourceUuid, // Will be resolved by data catalogue
        type: 'ETL',
        role: 'PRIMARY',
        tables: [],
      });
    }

    // Add CORE datasources if columns use them
    if (dataSet?.columns) {
      const hasPersonAttributes = dataSet.columns.some(col =>
        (col.dataDefinition as any)?.type === 'PERSON_ATTRIBUTE'
      );
      const hasIdentifiers = dataSet.columns.some(col =>
        (col.dataDefinition as any)?.type === 'IDENTIFIER'
      );

      if (hasPersonAttributes) {
        dataSources.push({
          uuid: 'person_attributes',
          name: 'Person Attributes',
          type: 'CORE',
          role: 'REFERENCE',
        });
      }

      if (hasIdentifiers) {
        dataSources.push({
          uuid: 'patient_identifiers',
          name: 'Patient Identifiers',
          type: 'CORE',
          role: 'REFERENCE',
        });
      }
    }
  } else {
    // V2 format - use dataSources array directly
    if (config.dataSources && config.dataSources.length > 0) {
      config.dataSources.forEach(ds => {
        dataSources.push({
          uuid: ds.uuid,
          name: ds.name,
          type: ds.type as any,
          role: ds.role as any,
          tables: ds.columns ? Object.keys(ds.columns) : [],
        });
      });
    }
  }

  // Get primary datasource UUID from the migrated dataSources
  const primaryDataSourceUuid = dataSources.find(ds => ds.role === 'PRIMARY')?.uuid || '';

  // === BUILD COLUMN → SOURCE LOOKUP FROM dataSources METADATA ===
  // The V2 contract stores per-column source info inside dataSources[].columns.
  // Build a map: columnName (lowercase) → { dataSource, table, fieldType }
  type SourceLookup = {
    dataSourceUuid: string;
    dataSourceName: string;
    table: string;
    fieldType: string;
  };
  const columnSourceLookup = new Map<string, SourceLookup>();
  (configDataSources as any[]).forEach((ds) => {
    const dsColumns = ds.columns || {};
    Object.values(dsColumns).forEach((colInfo: any) => {
      const lookupKey = (colInfo?.name || '').toLowerCase();
      if (lookupKey) {
        columnSourceLookup.set(lookupKey, {
          dataSourceUuid: ds.uuid,
          dataSourceName: ds.name,
          table: colInfo?.sourceTable || ds.uuid,
          fieldType: colInfo?.type || 'UNKNOWN',
        });
      }
    });
  });

  // Track unique tables used
  const tablesUsed = new Set<string>();

  // === EXTRACT COLUMNS WITH SOURCE INFO ===
  const columns: LinelistColumnDraft[] = [];

  if (dataSet?.columns) {
    dataSet.columns.forEach((col, idx) => {
      const defType = (col.dataDefinition as any)?.type;
      const defConfig = (col.dataDefinition as any)?.config;
      const colNameLower = col.name.toLowerCase();
      const sqlStr = defConfig?.sql || '';
      // Detect custom SQL (a full query, not a simple table.column reference)
      const isCustomSql = /^\s*SELECT\s/i.test(sqlStr) || /:(patientId|client_id)\b/i.test(sqlStr);

      // Determine source based on data definition type
      let source: ColumnSource;

      if (defType === 'PERSON_ATTRIBUTE') {
        source = {
          dataSourceUuid: 'person_attributes',
          dataSourceName: 'Person Attributes',
          table: 'person_attribute',
          field: col.name,
          fieldType: 'PERSON_ATTRIBUTE',
          attributeTypeUuid: defConfig?.attributeTypeUuid,
        };
      } else if (defType === 'IDENTIFIER') {
        source = {
          dataSourceUuid: 'patient_identifiers',
          dataSourceName: 'Patient Identifiers',
          table: 'patient_identifier',
          field: col.name,
          fieldType: 'IDENTIFIER',
          identifierTypeUuid: defConfig?.identifierTypeUuid,
        };
      } else if (defType === 'CALCULATION') {
        // Calculated field (e.g., Age)
        source = {
          dataSourceUuid: primaryDataSourceUuid,
          dataSourceName: primaryDataSourceUuid,
          table: 'calculated',
          field: col.name,
          fieldType: 'CALCULATED',
        };
      } else {
        // SQL column - use the dataSources metadata lookup first, then fall back
        const lookup = columnSourceLookup.get(colNameLower);

        if (lookup && !isCustomSql) {
          // Found in the dataSources metadata
          source = {
            dataSourceUuid: lookup.dataSourceUuid,
            dataSourceName: lookup.dataSourceName,
            table: lookup.table,
            field: col.name,
            fieldType: lookup.fieldType,
          };
          tablesUsed.add(lookup.table);
        } else if (isCustomSql) {
          // Custom SQL column - per-row query with :patientId / :client_id
          source = {
            dataSourceUuid: lookup?.dataSourceUuid || primaryDataSourceUuid || 'custom_sql',
            dataSourceName: lookup?.dataSourceName || 'Custom SQL',
            table: 'custom_sql',
            field: col.name,
            fieldType: 'SQL',
          };
        } else {
          // Simple SQL reference like `table`.`column` - parse it
          const sqlMatch = sqlStr.match(/`?(\w+)`?\.\s*`?(\w+)`?/);
          if (sqlMatch) {
            source = {
              dataSourceUuid: primaryDataSourceUuid,
              dataSourceName: primaryDataSourceUuid,
              table: sqlMatch[1],
              field: sqlMatch[2],
              fieldType: 'DERIVED',
            };
            tablesUsed.add(sqlMatch[1]);
          } else {
            // Fallback
            source = {
              dataSourceUuid: primaryDataSourceUuid,
              dataSourceName: primaryDataSourceUuid,
              table: 'unknown',
              field: col.name,
              fieldType: 'UNKNOWN',
            };
          }
        }
      }

      const columnDraft: LinelistColumnDraft = {
        id: `col-${idx}`,
        name: col.name,
        description: '',
        source,
        dataDefinitionType: (defType || 'SQL') as keyof LinelistDataDefinitionMap,
        dataDefinitionConfig: defConfig || {},
        additionInfo: {
          addedVia: isCustomSql ? 'SQL_BUILDER' : 'IMPORT',
          addedAt: now,
          orderAdded: idx,
        },
        display: {
          width: 150,
          align: defType === 'CALCULATION' ? 'center' : 'left',
          sortable: true,
          filterable: defType !== 'CALCULATION',
          format: defType === 'CALCULATION' ? 'number' : 'text',
        },
        sortOrder: idx,
        repeatResolution: (col as any).repeatResolution,
        transformations: (col as any).transformations || [],
      };

      columns.push(columnDraft);
    });
  }

  // Update data sources with tables used
  dataSources.forEach(ds => {
    if (ds.uuid === primaryDataSourceUuid) {
      ds.tables = Array.from(tablesUsed);
    }
  });

  // === EXTRACT PARAMETERS ===
  const parameters = config.parameters?.map((param, idx) => ({
    id: `param-${idx}`,
    name: param.name,
    label: param.label,
    type: param.type,
    required: param.required || false,
    defaultValue: param.defaultValue || '',
    displayOrder: param.displayOrder || idx,
    config: param.config || {},
  })) || [];

  // === EXTRACT BUILDER METADATA (themeUuid, build method, indicators) ===
  // Builder state lives under `_builder` (compiled format) or at the top level
  // (intermediate format). Read from _builder first, then fall back.
  let themeUuid = builderState?.themeUuid || config.themeUuid || '';
  let buildMethod: PopulationDefinition['buildMethod'] = builderState?.buildMethod || (config as any).buildMethod || 'SQL_BUILDER';
  let indicatorRules: PopulationDefinition['indicatorRules'] = undefined;

  const configIndicatorRules = builderState?.indicatorRules || (config as any).indicatorRules;
  console.log('🔴 configIndicatorRules:', configIndicatorRules);
  if (Array.isArray(configIndicatorRules) && configIndicatorRules.length > 0) {
    indicatorRules = configIndicatorRules.map((rule: any, idx: number) => ({
      id: rule.id || `rule-${idx}`,
      indicatorUuid: rule.indicatorUuid,
      name: rule.name || '',
      conditions: rule.conditions,
      logicalOperator: rule.logicalOperator || 'AND',
      negate: rule.negate || false,
    }));
    console.log('🔴 Loaded indicatorRules from config:', indicatorRules);
  }

  // Fall back to metaJson for themeUuid, buildMethod, and indicator rules if not in config
  if (report.metaJson && (!themeUuid || !indicatorRules || buildMethod === 'SQL_BUILDER')) {
    try {
      const meta = JSON.parse(report.metaJson);
      console.log('🔴 Parsed metaJson:', meta);
      if (!themeUuid) {
        themeUuid = meta.themeUuid || '';
      }
      // Also try to get buildMethod from metaJson as fallback
      if (meta.buildMethod && (meta.buildMethod === 'INDICATOR_BASED' || meta.buildMethod === 'VISUAL_FILTER' || meta.buildMethod === 'SQL_BUILDER')) {
        buildMethod = meta.buildMethod;
        console.log('🔴 Using buildMethod from metaJson:', buildMethod);
      }
      // Also try to get indicator rules from metaJson as fallback
      if (!indicatorRules && Array.isArray(meta.indicatorRules) && meta.indicatorRules.length > 0) {
        indicatorRules = meta.indicatorRules.map((rule: any, idx: number) => ({
          id: rule.id || `rule-${idx}`,
          indicatorUuid: rule.indicatorUuid,
          name: rule.name || '',
          conditions: rule.conditions,
          logicalOperator: rule.logicalOperator || 'AND',
          negate: rule.negate || false,
        }));
        console.log('🔴 Loaded indicatorRules from metaJson:', indicatorRules);
      }
    } catch (e) {
      console.warn('Failed to parse metaJson:', e);
    }
  }

  // === BUILD SORT CONFIG ===
  const sortConfig: LinelistSortConfig[] = [];
  if (config.orderBy) {
    sortConfig.push({
      id: `sort-0`,
      columnId: config.orderBy,
      columnName: config.orderBy,
      direction: config.orderDirection || 'ASC',
      nulls: 'LAST',
      sortOrder: 0,
    });
  }

  // === BUILD POPULATION DEFINITION ===
  const cohortSql = config.baseCohortDefinition?.config?.sql || '';
  const baseDsUuid = dataSources.find(ds => ds.role === 'PRIMARY')?.uuid || primaryDataSourceUuid;
  const population: PopulationDefinition = {
    baseDataSourceUuid: baseDsUuid,
    buildMethod,
    sqlTemplate: cohortSql,
    parameterReferences: extractParameterReferences(cohortSql),
    visualFilter: {
      rootGroup: {
        id: 'root',
        logicalOperator: 'AND',
        conditions: [],
        nestedGroups: [],
      },
      useVisualBuilder: false,
    },
    // Reconstruct indicator rules so they show as selected on edit
    indicatorRules,
    buildHistory: [
      {
        timestamp: now,
        action: 'IMPORTED_FROM_EXISTING',
        description: config.version === 1 ? 'Migrated from V1 format (single datasource)' : 'Imported from existing report definition',
      },
    ],
  };
  console.log('🔴 Final population state:', population);
  console.log('🔴 population.indicatorRules:', population.indicatorRules);
  console.log('🔴 population.buildMethod:', population.buildMethod);

  // === CREATE THE DRAFT ===
  const draft: LinelistReportDraft = {
    version: 2,
    name: report.name || '',
    description: report.description || '',
    code: report.code || '',
    currentPanel: 'basics',
    categoryUuid: config.categoryUuid || '',
    themeUuid,
    rowGrain: config.rowGrain || 'PATIENT',
    templateId: config.templateId || '',
    dataSources,
    population,
    columns,
    parameters,
    sortConfig,
    limit: config.limit,
    // Legacy top-level fields used by the indicator UI and getCohortSql().
    // Keep them in sync with population.* so the existing code paths work.
    populationMode: buildMethod === 'INDICATOR_BASED' ? 'INDICATOR' : 'SQL',
    indicatorRules,
    displaySettings: {
      defaultPageSize: 25,
      freezeFirstColumn: true,
      freezeHeader: true,
      dateDisplayFormat: 'dd MMM yyyy',
      nullDisplayValue: '—',
      maxInteractiveRows: 500,
      maxExportRows: 100000,
      allowedExports: ['CSV', 'XLSX', 'PDF'],
      includeParametersInExportHeader: true,
      includeGeneratedTimestamp: true,
    },
    validation: {
      errors: {},
      warnings: {},
      lastValidated: now,
    },
    metadata: {
      createdAt: now,
      lastModified: now,
      buildMethod: 'EDIT',
      sourceReportUuid: report.uuid,
      version: 2,
      status: 'DRAFT',
    },
  };

  console.log('🟢 Returning draft with builder details:', draft);
  return draft;
}

/**
 * Extract parameter references from SQL
 * Finds patterns like :paramName
 */
function extractParameterReferences(sql: string): string[] {
  const paramRegex = /:(\w+)/g;
  const params = new Set<string>();
  let match;
  while ((match = paramRegex.exec(sql)) !== null) {
    params.add(match[1]);
  }
  return Array.from(params);
}

const LinelistBuilderWorkspace: React.FC<Props> = () => {
  const navigate = useNavigate();
  const { reportId } = useParams();

  // Report state
  const [draft, setDraft] = useState<LinelistReportDraft>(createEmptyDraft());
  const [initialReport, setInitialReport] = useState<LinelistReportDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [compileSuccess, setCompileSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  // Reference data
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [categories, setCategories] = useState<ReportCategoryDto[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [themes, setThemes] = useState<DataTheme[]>([]);

  // Panel state
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [middlePanelCollapsed, setMiddlePanelCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(500);
  const [middlePanelWidth, setMiddlePanelWidth] = useState(500);

  // Resizable state
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingMiddle, setIsResizingMiddle] = useState(false);

  // Preview state
  const [previewRunning, setPreviewRunning] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Available fields from data catalogue (for visual filter builder)
  const [availableFields, setAvailableFields] = useState<Array<{ name: string; label: string; type: FilterFieldType }>>([]);

  // ETL structure for selected data source (for future use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [etlStructure, setEtlStructure] = useState<EtlStructure | null>(null);

  // Theme fields for population filters
  const { config: themeConfig } = useDataTheme(draft.themeUuid);

  // Indicators for population (from selected theme)
  const { indicators } = useIndicatorsByTheme(draft.themeUuid);

  // Compile setup modal state
  const [showCompileSetupModal, setShowCompileSetupModal] = useState(false);

  /**
   * Convert theme fields to filter builder format
   */
  const themeFieldsForPopulation = useMemo(() => {
    if (!themeConfig?.fields) return [];

    return themeConfig.fields.map((field: ThemeField) => {
      // Map theme field type to FilterFieldType
      let filterType: FilterFieldType = 'TEXT';
      switch (field.type) {
        case 'number':
          filterType = 'NUMBER';
          break;
        case 'date':
        case 'datetime':
          filterType = 'DATE';
          break;
        case 'boolean':
          filterType = 'BOOLEAN';
          break;
        case 'coded':
          filterType = 'CODED';
          break;
        default:
          filterType = 'TEXT';
      }

      return {
        name: field.key,
        label: field.label || field.key,
        type: filterType,
      };
    });
  }, [themeConfig]);


  /**
   * Load report for editing
   */
  useEffect(() => {
    if (reportId && reportId !== 'new') {
      setLoading(true);
      setError(null);

      import('../../../resources/linelist/linelist-reports.api')
        .then(({ getLinelistReport }) => getLinelistReport(reportId))
        .then((report: LinelistReportDto) => {
          console.error('🔴 LOADED REPORT:', report?.name, report);
          setInitialReport(report);
          setMode('edit');
          // Convert report to draft
          const draft = reportToDraft(report);
          console.error('🟢 CONVERTED TO DRAFT:', draft);
          setDraft(draft);
        })
        .catch((err) => {
          console.error('Failed to load report:', err);
          setError(err instanceof Error ? err.message : 'Failed to load report');
        })
        .finally(() => setLoading(false));
    } else {
      setMode('create');
      setDraft(createEmptyDraft());
      setLoading(false);
    }
  }, [reportId]);

  /**
   * Load reference data
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, thms] = await Promise.all([
          listReportCategories(),
          listThemes(),
        ]);
        setCategories(cats);
        setThemes(thms);
      } catch (err) {
        console.error('Failed to load reference data:', err);
      }
    };
    loadData();
  }, []);

  /**
   * Handle save draft
   */
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);

    try {
      // Convert indicators array to Map for draftToConfig
      const indicatorsMap = new Map(
        indicators.map(ind => [ind.uuid, ind])
      );
      // Pass indicators map so draftToConfig can generate SQL from indicator rules
      const config = draftToConfig(draft, indicatorsMap);
      // Preserve builder state (indicators, build method) in metaJson so the
      // editor can reconstruct the draft when re-opening for edit.
      const builderMeta: LinelistBuilderMeta = {
        themeUuid: draft.themeUuid,
        buildMethod: draft.population.buildMethod,
        indicatorRules: draft.population.indicatorRules,
      };
      const payload = configToSavePayload(config, draft, builderMeta);

      let result;
      if (mode === 'create') {
        result = await createLinelistReport(payload);
        // Navigate to edit mode after creating a new report
        navigate(`/linelist/edit/${result.uuid}`, { replace: true });
      } else {
        result = await updateLinelistReport(initialReport?.uuid || '', payload);
      }

      setInitialReport(result);
      setDraft(prev => ({ ...prev, unsavedChanges: false }));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save report');
    } finally {
      setSaving(false);
    }
  }, [draft, mode, initialReport, indicators, navigate]);

  /**
   * Handle compile
   * Always shows the compile setup modal for category confirmation/selection
   */
  const handleCompile = useCallback(async () => {
    setCompileError(null);
    setSaveError(null);

    // Always show the modal to allow category confirmation/selection
    setShowCompileSetupModal(true);
  }, []);

  /**
   * Handle navigate back
   */
  const handleBack = useCallback(() => {
    navigate('/linelist');
  }, [navigate]);

  /**
   * Update draft field
   */
  const updateDraft = useCallback((updates: Partial<LinelistReportDraft>) => {
    setDraft(prev => ({ ...prev, ...updates, unsavedChanges: true }));
  }, []);

  /**
   * Handle compile setup modal cancel
   */
  const handleCompileSetupCancel = useCallback(() => {
    setShowCompileSetupModal(false);
  }, []);

  /**
   * Handle compile setup modal confirm
   * This is called after the user selects category in the modal
   */
  const handleCompileSetupConfirm = useCallback(async (result: CompileSetupResult) => {
    setShowCompileSetupModal(false);

    // Create updated draft with new category for validation
    const updatedDraft = { ...draft, categoryUuid: result.categoryUuid };

    // Check validation before saving/compiling
    const errors = validateLinelistDraft(updatedDraft);
    if (Object.keys(errors).length > 0) {
      // Show specific validation errors
      const errorMessages = Object.values(errors).join(', ');
      setSaveError(`Cannot compile: ${errorMessages}`);
      return;
    }

    // Update the draft with selected category
    updateDraft({
      categoryUuid: result.categoryUuid,
    });

    // Save if there are unsaved changes or no initial report
    if (draft.unsavedChanges || !initialReport?.uuid) {
      await handleSave();
    }

    if (!initialReport?.uuid) {
      setCompileError('Cannot compile: Report must be saved first');
      return;
    }

    setCompiling(true);
    setCompileError(null);
    setCompileSuccess(null);

    try {
      const compiledResult = await compileLinelistReport(initialReport.uuid);

      setCompileSuccess(
        compiledResult?.reportDefinitionUuid
          ? `Compiled successfully. Runtime report UUID: ${compiledResult.reportDefinitionUuid}`
          : 'Compiled successfully.'
      );
    } catch (err) {
      setCompileError(err instanceof Error ? err.message : 'Failed to compile report');
    } finally {
      setCompiling(false);
    }
  }, [draft, initialReport?.uuid, handleSave, updateDraft]);

  /**
   * Handle datasources change
   * Updates the dataSources array in the draft
   */
  const handleDataSourcesChange = useCallback((dataSources: DataSourceInfo[]) => {
    updateDraft({ dataSources });
  }, [updateDraft]);

  /**
   * Handle data source table change
   * Updates the primary data source in the dataSources array
   */
  const handleTableChange = useCallback((table: string) => {
    // For now, update the first data source or create a new primary one
    const newDataSources = [...draft.dataSources];
    if (newDataSources.length > 0) {
      newDataSources[0].uuid = table;
      newDataSources[0].name = table;
    } else {
      newDataSources.push({
        uuid: table,
        name: table,
        type: 'ETL',
        role: 'PRIMARY',
      });
    }
    updateDraft({ dataSources: newDataSources });
  }, [updateDraft, draft.dataSources]);

  /**
   * Handle data theme change
   */
  const handleThemeChange = useCallback((themeUuid: string) => {
    updateDraft({ themeUuid });
  }, [updateDraft]);

  /**
   * Get list of selected field IDs for highlighting in catalogue
   * Constructs field IDs based on column type to match catalogue formats:
   * - Person attributes: person-attribute-${uuid}
   * - Patient identifiers: patient-identifier-${uuid}
   * - Calculated fields: openmrs.calc.${name}
   * - CORE/Demographic: openmrs.${table}.${name}
   * - ETL columns: ${table}.${name}
   */
  const selectedFieldIds = useMemo(() => {
    return draft.columns.map((col) => {
      // Person attributes
      if (col.dataDefinitionType === 'PERSON_ATTRIBUTE') {
        return `person-attribute-${col.source.attributeTypeUuid || col.name}`;
      }
      // Patient identifiers
      if (col.dataDefinitionType === 'IDENTIFIER') {
        return `patient-identifier-${col.source.identifierTypeUuid || col.name}`;
      }
      // Calculated fields
      if (col.dataDefinitionType === 'CALCULATION') {
        const calcName = (col.dataDefinitionConfig.calculation || col.name).toLowerCase();
        return `openmrs.calc.${calcName}`;
      }
      // CORE/Demographic fields (person, person_address tables)
      if (col.source.table === 'person' || col.source.table === 'person_address') {
        return `openmrs.${col.source.table}.${col.source.field || col.name}`;
      }
      // Person name fields
      if (col.dataDefinitionType === 'PERSON_NAME') {
        return `openmrs.person.${col.source.field || col.name}`;
      }
      // ETL columns - use data source UUID or table name
      const table = col.source.table || col.source.dataSourceUuid || 'unknown';
      return `${table}.${col.source.field || col.name}`;
    });
  }, [draft.columns]);

  /**
   * Handle removing a column
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRemoveColumn = useCallback((columnId: string) => {
    // Clear any error message
    setSaveError(null);
  }, []);

  /**
   * Run preview
   */
  const handleRunPreview = useCallback(async () => {
    setPreviewRunning(true);
    setPreviewError(null);

    try {
      // TODO: Call preview API
      // const results = await previewLinelistReport(draftToConfig(draft));
      setPreviewData([]); // Mock data
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setPreviewRunning(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Handle adding field from catalogue as column
   */
  const handleAddFieldAsColumn = useCallback((field: CatalogueField) => {
    // Check if column already exists
    if (draft.columns.some((col) => col.name === field.label || col.name === field.name)) {
      setSaveError('This field is already added as a column');
      return;
    }

    // Handle special cases for person attributes and patient identifiers
    const isPersonAttribute = field.id.startsWith('person-attribute-');
    const isPatientIdentifier = field.id.startsWith('patient-identifier-');
    const uuid = field.name; // For API fields, we store the UUID in the name field
    const now = new Date().toISOString();

    let newColumn: LinelistColumnDraft;
    let source: ColumnSource;

    if (isPersonAttribute) {
      // Person Attribute column
      source = {
        dataSourceUuid: 'person_attributes',
        dataSourceName: 'Person Attributes',
        table: 'person_attribute',
        field: field.label,
        fieldType: 'PERSON_ATTRIBUTE',
        attributeTypeUuid: uuid,
      };
      newColumn = {
        id: `col-${Date.now()}`,
        name: field.label,
        description: '',
        source,
        dataDefinitionType: 'PERSON_ATTRIBUTE',
        dataDefinitionConfig: { attributeTypeUuid: uuid },
        additionInfo: {
          addedVia: 'DRAG_DROP',
          addedAt: now,
          orderAdded: draft.columns.length,
        },
        display: {
          width: 150,
          align: 'left',
          sortable: true,
          filterable: true,
          format: 'text',
        },
        sortOrder: draft.columns.length,
        transformations: [],
      };
    } else if (isPatientIdentifier) {
      // Patient Identifier column
      source = {
        dataSourceUuid: 'patient_identifiers',
        dataSourceName: 'Patient Identifiers',
        table: 'patient_identifier',
        field: field.label,
        fieldType: 'IDENTIFIER',
        identifierTypeUuid: uuid,
      };
      newColumn = {
        id: `col-${Date.now()}`,
        name: field.label,
        description: '',
        source,
        dataDefinitionType: 'IDENTIFIER',
        dataDefinitionConfig: { identifierTypeUuid: uuid, preferred: false },
        additionInfo: {
          addedVia: 'DRAG_DROP',
          addedAt: now,
          orderAdded: draft.columns.length,
        },
        display: {
          width: 150,
          align: 'left',
          sortable: true,
          filterable: true,
          format: 'text',
        },
        sortOrder: draft.columns.length,
        repeatResolution: {
          strategy: 'LATEST',
          orderBy: undefined,
          restrictToPeriod: false,
          ignoreVoided: true,
        },
        transformations: [],
      };
    } else if (field.source === 'CALCULATION') {
      // Calculated field
      const primaryDataSource = draft.dataSources.find(ds => ds.role === 'PRIMARY');
      source = {
        dataSourceUuid: primaryDataSource?.uuid || '',
        dataSourceName: primaryDataSource?.name || '',
        table: 'calculated',
        field: field.name,
        fieldType: 'CALCULATED',
      };
      newColumn = {
        id: `col-${Date.now()}`,
        name: field.label || field.name,
        description: '',
        source,
        dataDefinitionType: 'CALCULATION',
        dataDefinitionConfig: { calculation: field.name.toUpperCase(), onDate: true },
        additionInfo: {
          addedVia: 'DRAG_DROP',
          addedAt: now,
          orderAdded: draft.columns.length,
        },
        display: {
          width: 120,
          align: 'center',
          sortable: true,
          filterable: false,
          format: 'number',
        },
        sortOrder: draft.columns.length,
        transformations: [],
      };
    } else {
      // SQL/ETL column
      source = {
        dataSourceUuid: field.dataSourceUuid || field.table,
        dataSourceName: field.dataSourceName || field.table,
        table: field.table,
        field: field.name,
        fieldType: field.type || 'UNKNOWN',
      };
      newColumn = {
        id: `col-${Date.now()}`,
        name: field.label || field.name,
        description: '',
        source,
        dataDefinitionType: 'SQL',
        dataDefinitionConfig: {
          sql: `\`${field.table}\`.\`${field.name}\``, // Default SQL - table.column
        },
        additionInfo: {
          addedVia: 'DRAG_DROP',
          addedAt: now,
          orderAdded: draft.columns.length,
        },
        display: {
          width: 150,
          align: 'left',
          sortable: true,
          filterable: true,
          format: 'text',
        },
        sortOrder: draft.columns.length,
        repeatResolution: field.isRepeated ? {
          strategy: 'LATEST',
          orderBy: undefined,
          restrictToPeriod: false,
          ignoreVoided: true,
        } : undefined,
        transformations: [],
      };
    }

    const updatedColumns = [...draft.columns, newColumn];
    updateDraft({ columns: updatedColumns });
  }, [draft.columns, draft.dataSources, updateDraft]);

  /**
   * Handle adding a custom SQL column from the modal
   * The SQL runs per-row and can reference :client_id / :patient_id
   */
  const handleAddCustomSqlColumn = useCallback((config: CustomSqlColumnConfig) => {
    // Prevent duplicate column names
    if (draft.columns.some((col) => col.name.toLowerCase() === config.name.toLowerCase())) {
      setSaveError('A column with this name already exists');
      return;
    }

    const now = new Date().toISOString();
    const primaryDataSource = draft.dataSources.find(ds => ds.role === 'PRIMARY');

    const newColumn: LinelistColumnDraft = {
      id: `col-${Date.now()}`,
      name: config.name,
      description: config.description || '',
      source: {
        dataSourceUuid: primaryDataSource?.uuid || 'custom_sql',
        dataSourceName: primaryDataSource?.name || 'Custom SQL',
        table: 'custom_sql',
        field: config.name,
        fieldType: 'SQL',
      },
      dataDefinitionType: 'SQL',
      dataDefinitionConfig: {
        sql: config.sql,
      },
      additionInfo: {
        addedVia: 'SQL_BUILDER',
        addedAt: now,
        orderAdded: draft.columns.length,
      },
      display: {
        width: 150,
        align: 'left',
        sortable: true,
        filterable: true,
        format: 'text',
      },
      sortOrder: draft.columns.length,
      repeatResolution: config.repeatResolution ? {
        strategy: 'LATEST',
        orderBy: undefined,
        restrictToPeriod: false,
        ignoreVoided: true,
      } : undefined,
      transformations: [],
    };

    const updatedColumns = [...draft.columns, newColumn];
    updateDraft({ columns: updatedColumns });
  }, [draft.columns, draft.dataSources, updateDraft]);

  /**
   * Handle adding field from catalogue as filter
   */
  const handleAddFieldAsFilter = useCallback((field: CatalogueField) => {
    const newCondition = {
      id: `cond-${Date.now()}`,
      field: field.name,
      fieldLabel: field.label,
      fieldType: field.type,
      operator: getDefaultOperator(field.type),
      value: '',
    };

    const updatedFilter = {
      ...draft.population.visualFilter,
      rootGroup: {
        ...draft.population.visualFilter?.rootGroup,
        conditions: [...(draft.population.visualFilter?.rootGroup?.conditions || []), newCondition],
      },
    };

    updateDraft({ population: { ...draft.population, visualFilter: updatedFilter } });
  }, [draft.population, updateDraft]);

  /**
   * Handle fields available from data catalogue
   * Convert CatalogueField[] to format expected by visual filter builder
   */
  const handleFieldsAvailable = useCallback((fields: CatalogueField[]) => {
    const filterFields = fields.map((f) => ({
      name: f.name,
      label: f.label,
      type: f.type,
    }));
    setAvailableFields(filterFields);
  }, []);

  /**
   * Handle ETL structure detection from data catalogue
   */
  const handleEtlStructureDetected = useCallback((structure: EtlStructure) => {
    setEtlStructure(structure);
  }, []);

  /**
   * Handle panel resize with mouse
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(200, Math.min(500, e.clientX));
        setLeftPanelWidth(newWidth);
      }
      if (isResizingMiddle) {
        const workspaceRect = document.querySelector(`.${styles.workspace}`)?.getBoundingClientRect();
        if (workspaceRect) {
          const leftPanelEnd = leftPanelCollapsed ? 48 : leftPanelWidth;
          const newWidth = Math.max(400, Math.min(700, e.clientX - workspaceRect.left - leftPanelEnd));
          setMiddlePanelWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingMiddle(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
    };

    if (isResizingLeft || isResizingMiddle) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizingLeft, isResizingMiddle, leftPanelWidth, leftPanelCollapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Start resizing left panel
   */
  const startResizeLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  }, []);

  /**
   * Start resizing middle panel
   */
  const startResizeMiddle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingMiddle(true);
  }, []);

/**
 * Get default operator for field type
 */
function getDefaultOperator(fieldType: FilterFieldType): FilterOperator {
  switch (fieldType) {
    case 'TEXT':
      return 'CONTAINS';
    case 'NUMBER':
      return 'EQUALS';
    case 'DATE':
      return 'BETWEEN_DATES';
    case 'CODED':
      return 'IS_ONE_OF';
    case 'BOOLEAN':
      return 'IS_TRUE';
    case 'LOCATION':
      return 'IN_LOCATION';
    default:
      return 'EQUALS';
  }
}

  // Debug: Check what's preventing readiness
  const validationErrors = validateLinelistDraft(draft);
  if (Object.keys(validationErrors).length > 0) {
    console.log('⚠️ Draft validation errors:', validationErrors);
  }
  const isReady = isLinelistDraftReadyToCompile(draft);
  console.log('🔴 Compile button state:', { compiling, hasReportUuid: !!initialReport?.uuid, isReady });

  if (loading) {
    return (
      <div className={styles.workspace}>
        <div className={styles.loading}>Loading report...</div>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            renderIcon={ChevronLeft}
            iconDescription="Back"
            onClick={handleBack}
          />
        </div>
        <div className={styles.headerCenter}>
          <TextInput
            id="report-name"
            labelText=""
            value={draft.name}
            onChange={(e) => updateDraft({ name: e.target.value })}
            placeholder="Report name"
            className={styles.nameInput}
            size="sm"
          />
          <Tag size="sm" type={compileSuccess ? 'green' : 'gray'}>
            {compileSuccess ? 'Compiled' : 'Draft'}
          </Tag>
          {draft.unsavedChanges && (
            <Tag size="sm" type="blue">Unsaved</Tag>
          )}
        </div>
        <div className={styles.headerRight} >
          <ButtonSet>
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Save}
              onClick={handleSave}
              disabled={saving || !draft.unsavedChanges}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              kind="primary"
              size="sm"
              renderIcon={Send}
              onClick={handleCompile}
              disabled={compiling || !initialReport?.uuid}
            >
              {compiling ? 'Compiling...' : 'Compile'}
            </Button>
          </ButtonSet>
          <OverflowMenu size="sm" renderIcon={OverflowMenuHorizontal} align="right">
            <OverflowMenuItem itemText="Save as" />
            <OverflowMenuItem itemText="Export JSON" />
            <OverflowMenuItem itemText="Import JSON" />
            <OverflowMenuItem itemText="Validate" />
            <OverflowMenuItem itemText="View history" />
            <OverflowMenuItem itemText="Retire" />
          </OverflowMenu>
        </div>
      </header>

      {/* Error notifications */}
      {error && (
        <div className={styles.notification}>
          <InlineNotification kind="error" title="Error" subtitle={error} />
        </div>
      )}
      {saveError && (
        <div className={styles.notification}>
          <InlineNotification kind="error" title="Save Error" subtitle={saveError} onClose={() => setSaveError(null)} />
        </div>
      )}
      {compileError && (
        <div className={styles.notification}>
          <InlineNotification kind="error" title="Compile Error" subtitle={compileError} onClose={() => setCompileError(null)} />
        </div>
      )}
      {compileSuccess && (
        <div className={styles.notification}>
          <InlineNotification kind="success" title="Compiled" subtitle={compileSuccess} onClose={() => setCompileSuccess(null)} />
        </div>
      )}

      {/* Compile Setup Modal */}
      <CompileSetupModal
        open={showCompileSetupModal}
        currentCategoryUuid={draft.categoryUuid}
        onConfirm={handleCompileSetupConfirm}
        onClose={handleCompileSetupCancel}
        reportType="linelist"
      />

      {/* Three-Panel Layout */}
      <div className={styles.panels}>
        {/* Left Panel - Data Catalogue */}
        <aside
          className={styles.leftPanel}
          style={{
            width: leftPanelCollapsed ? 48 : leftPanelWidth,
          }}
        >
          <div className={styles.panelHeader}>
            {!leftPanelCollapsed && (
              <>
                <h3 className={styles.panelTitle}>Data Catalogue</h3>
                <Button kind="ghost" size="sm" hasIconOnly renderIcon={ChevronLeft} onClick={() => setLeftPanelCollapsed(true)} />
              </>
            )}
            {leftPanelCollapsed && (
              <Button kind="ghost" size="sm" hasIconOnly renderIcon={ChevronRight} onClick={() => setLeftPanelCollapsed(false)} />
            )}
          </div>

          {!leftPanelCollapsed && (
            <div className={styles.panelContent}>
              <MultiDatasourceSelector
                dataSources={draft.dataSources}
                onChange={handleDataSourcesChange}
                themes={themes.map(t => ({ uuid: t.uuid || '', name: t.name }))}
                themeUuid={draft.themeUuid}
                onThemeChange={handleThemeChange}
                disabled={loading}
              />
              <DataCatalogue
                dataSources={draft.dataSources}
                themeUuid={draft.themeUuid}
                onAddToColumns={handleAddFieldAsColumn}
                onAddToFilters={handleAddFieldAsFilter}
                onTableChange={handleTableChange}
                onFieldsAvailable={handleFieldsAvailable}
                onEtlStructureDetected={handleEtlStructureDetected}
                selectedFields={selectedFieldIds}
                onAddCustomSqlColumn={handleAddCustomSqlColumn}
                idColumnAlias="client_id"
              />
            </div>
          )}
        </aside>

        {/* Resize Handle - Left/Middle */}
        <div
          className={`${styles.resizeHandle} ${styles.resizeHandleLeftMiddle}`}
          onMouseDown={startResizeLeft}
          style={{ cursor: isResizingLeft ? 'col-resize' : 'col-resize' }}
        />

        {/* Middle Panel - Query Configuration */}
        <aside
          className={styles.middlePanel}
          style={{
            width: middlePanelCollapsed ? 48 : middlePanelWidth,
          }}
        >
          <div className={styles.panelHeader}>
            {!middlePanelCollapsed && (
              <>
                <h3 className={styles.panelTitle}>Query Configuration</h3>
                <Button kind="ghost" size="sm" hasIconOnly renderIcon={ChevronRight} onClick={() => setMiddlePanelCollapsed(true)} />
              </>
            )}
            {middlePanelCollapsed && (
              <Button kind="ghost" size="sm" hasIconOnly renderIcon={ChevronLeft} onClick={() => setMiddlePanelCollapsed(false)} />
            )}
          </div>

          {!middlePanelCollapsed && (
            <div className={styles.panelContent}>
              <QueryConfigPanel
                draft={draft}
                onDraftChange={updateDraft}
                availableFields={availableFields}
                populationFields={themeFieldsForPopulation}
                indicators={indicators}
                onRemoveColumn={handleRemoveColumn}
              />
            </div>
          )}
        </aside>

        {/* Resize Handle - Middle/Right */}
        <div
          className={`${styles.resizeHandle} ${styles.resizeHandleMiddleRight}`}
          onMouseDown={startResizeMiddle}
          style={{ cursor: isResizingMiddle ? 'col-resize' : 'col-resize' }}
        />

        {/* Right Panel - Preview */}
        <main className={styles.rightPanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Preview</h3>
            <ButtonSet>
              <Button
                kind="primary"
                size="sm"
                onClick={handleRunPreview}
                disabled={previewRunning}
              >
                {previewRunning ? 'Loading...' : 'Run Preview'}
              </Button>
            </ButtonSet>
          </div>

          <div className={styles.panelContent}>
            {previewError && (
              <InlineNotification kind="error" title="Preview Error" subtitle={previewError} />
            )}

            {!previewData && !previewError && (
              <div className={styles.emptyPreview}>
                <Document size={32} />
                <p>Run a preview to see sample data</p>
              </div>
            )}

            {previewData && previewData.length > 0 && (
              <div className={styles.previewResults}>
                <div className={styles.previewStatus}>
                  <span>Matching rows: —</span>
                  <span>Preview rows: {previewData.length}</span>
                  <span>Query duration: —</span>
                </div>
                {/* Preview table would go here */}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default LinelistBuilderWorkspace;

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
} from '../../../types/linelist-types';
import type { EtlStructure } from '../../../types/etl/etl-types';
import {
  draftToConfig,
  isLinelistDraftReadyToPublish,
  generateLinelistWarnings,
  createEmptyDraft,
} from '../../../types/linelist-types';

import {
  createLinelistReport,
  updateLinelistReport,
  configToSavePayload,
} from '../../../resources/linelist/linelist-reports.api';
import type { LinelistReportDto } from '../../../types/linelist-types';
import { listReportCategories, type ReportCategoryDto } from '../../../resources/report-category/report-category.api';
import { listThemes } from '../../../resources/theme/data-theme.api';
import { useDataTheme } from '../../../hooks/theme';
import { useIndicatorsByTheme } from '../../../hooks/indicator';
import type { DataTheme, ThemeField } from '../../../types/theme/data-theme.types';

import DataCatalogue from './data-catalogue.component';
import QueryConfigPanel from '../config/query-config-panel.component';
import type { CatalogueField } from './data-catalogue.component';
import styles from './linelist-builder-workspace.scss';

type Props = {};

const LinelistBuilderWorkspace: React.FC<Props> = () => {
  const navigate = useNavigate();
  const { reportId } = useParams();

  // Report state
  const [draft, setDraft] = useState<LinelistReportDraft>(createEmptyDraft());
  const [initialReport, setInitialReport] = useState<LinelistReportDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
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
          setInitialReport(report);
          setMode('edit');
          // Convert report to draft
          // setDraft(reportToDraft(report));
        })
        .catch((err) => {
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
      const config = draftToConfig(draft);
      const payload = configToSavePayload(config, draft);

      let result;
      if (mode === 'create') {
        result = await createLinelistReport(payload);
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
  }, [draft, mode, initialReport]);

  /**
   * Handle publish
   */
  const handlePublish = useCallback(async () => {
    if (!isLinelistDraftReadyToPublish(draft)) {
      setSaveError('Cannot publish: Please fix all validation errors');
      return;
    }

    setPublishing(true);
    setSaveError(null);

    try {
      const config = draftToConfig(draft);
      const payload = configToSavePayload(config, {
        name: draft.name,
        description: draft.description,
        code: draft.code,
      });

      const result = await updateLinelistReport(initialReport?.uuid || '', payload);
      setInitialReport(result);
      setDraft(prev => ({ ...prev, status: 'PUBLISHED', unsavedChanges: false }));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to publish report');
    } finally {
      setPublishing(false);
    }
  }, [draft, initialReport]);

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
   * Handle data source table change
   */
  const handleTableChange = useCallback((table: string) => {
    updateDraft({ dataSourceUuid: table });
  }, [updateDraft]);

  /**
   * Handle data theme change
   */
  const handleThemeChange = useCallback((themeUuid: string) => {
    updateDraft({ themeUuid });
  }, [updateDraft]);

  /**
   * Get list of selected field IDs for highlighting in catalogue
   * Uses the field.id format: "table.columnName"
   */
  const selectedFieldIds = useMemo(() => {
    // Match columns by name and construct field IDs
    // The catalogue uses field.id as "table.columnName"
    return draft.columns.map((col) => `${draft.dataSourceUuid || ''}.${col.name}`);
  }, [draft.columns, draft.dataSourceUuid]);

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

    let newColumn: LinelistColumnDraft;

    if (isPersonAttribute) {
      // Person Attribute column
      newColumn = {
        id: `col-${Date.now()}`,
        name: field.label,
        dataDefinitionType: 'PERSON_ATTRIBUTE',
        config: { attributeTypeUuid: uuid },
        sortOrder: draft.columns.length,
        transformations: [],
      };
    } else if (isPatientIdentifier) {
      // Patient Identifier column
      newColumn = {
        id: `col-${Date.now()}`,
        name: field.label,
        dataDefinitionType: 'IDENTIFIER',
        config: { identifierTypeUuid: uuid, preferred: false },
        sortOrder: draft.columns.length,
        transformations: [],
        repeatResolution: {
          strategy: 'LATEST',
          orderBy: undefined,
          restrictToPeriod: false,
          ignoreVoided: true,
        },
      };
    } else if (field.source === 'CALCULATION') {
      // Calculated field
      newColumn = {
        id: `col-${Date.now()}`,
        name: field.label || field.name,
        dataDefinitionType: 'CALCULATION',
        config: { calculation: field.name.toUpperCase(), onDate: true },
        sortOrder: draft.columns.length,
        transformations: [],
      };
    } else {
      // SQL/ETL column
      newColumn = {
        id: `col-${Date.now()}`,
        name: field.label || field.name,
        dataDefinitionType: 'SQL',
        config: {
          sql: `\`${field.table}\`.\`${field.name}\``, // Default SQL - table.column
        },
        sortOrder: draft.columns.length,
        transformations: [],
        repeatResolution: field.isRepeated ? {
          strategy: 'LATEST',
          orderBy: undefined,
          restrictToPeriod: false,
          ignoreVoided: true,
        } : undefined,
      };
    }

    const updatedColumns = [...draft.columns, newColumn];
    updateDraft({ columns: updatedColumns });
  }, [draft.columns, updateDraft]);

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
      ...draft.visualFilter,
      rootGroup: {
        ...draft.visualFilter.rootGroup,
        conditions: [...draft.visualFilter.rootGroup.conditions, newCondition],
      },
    };

    updateDraft({ visualFilter: updatedFilter });
  }, [draft.visualFilter, updateDraft]);

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

  const warnings = generateLinelistWarnings(draft);

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
  const hasWarnings = Object.keys(warnings).length > 0;
  const isReady = isLinelistDraftReadyToPublish(draft);

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
          <Tag size="sm" type={draft.status === 'PUBLISHED' ? 'green' : 'gray'}>
            {draft.status === 'PUBLISHED' ? 'Published' : 'Draft'}
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
              onClick={handlePublish}
              disabled={publishing || !isReady}
            >
              {publishing ? 'Publishing...' : 'Publish'}
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
          <InlineNotification kind="error" title="Save Error" subtitle={saveError} />
        </div>
      )}
      {hasWarnings && (
        <div className={styles.notification}>
          <InlineNotification
            kind="warning"
            title="Warnings"
            subtitle={Object.values(warnings).join('; ')}
            hideCloseButton
          />
        </div>
      )}

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
              <DataCatalogue
                table={draft.dataSourceUuid || ''}
                themeUuid={draft.themeUuid}
                onAddToColumns={handleAddFieldAsColumn}
                onAddToFilters={handleAddFieldAsFilter}
                onTableChange={handleTableChange}
                onThemeChange={handleThemeChange}
                onFieldsAvailable={handleFieldsAvailable}
                onEtlStructureDetected={handleEtlStructureDetected}
                selectedFields={selectedFieldIds}
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

/**
 * Linelist Report Builder Modal
 *
 * Multi-panel modal for creating and editing linelist reports.
 * Follows the same pattern as create-base-indicator-modal.component.tsx
 *
 * Panels:
 * 1. Basics - Name, description, code
 * 2. Cohort - Patient selection SQL query
 * 3. Columns - Column selection and configuration
 * 4. Preview - SQL preview and validation
 * 5. Review - Review and save
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Modal,
  Stack,
  SideNav,
  SideNavItems,
  SideNavLink,
  Content,
  Button,
  ButtonSet,
  InlineNotification,
  ProgressBar,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  DataTable,
  Table,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableBody,
  TableCell,
  Toggle,
} from '@carbon/react';

import type {
  LinelistReportDraft,
  LinelistBuilderPanel,
  LinelistColumnDraft,
  LinelistReportDefinitionConfig,
  LinelistRowGrain,
  LinelistParameterDraft,
  VisualFilterState,
  FilterFieldType,
} from '../../types/linelist-types';
import {
  draftToConfig,
  validateLinelistDraft,
  isLinelistDraftValid,
  isLinelistDraftReadyToPublish,
  generateLinelistWarnings,
} from '../../types/linelist-types';

import {
  createLinelistReport,
  updateLinelistReport,
  configToSavePayload,
} from '../../resources/linelist/linelist-reports.api';
import type { LinelistReportDto } from '../../types/linelist-types';
import { listReportCategories, type ReportCategoryDto } from '../../resources/report-category/report-category.api';
import { listThemes } from '../../resources/theme/data-theme.api';
import type { DataTheme } from '../../types/theme/data-theme.types';
import { useETLTables } from '../../hooks/theme';

import CohortSQLEditor from './cohort-sql-editor.component';
import ColumnSelector from './column-selector.component';
import ColumnCategorySelector from './column-category-selector.component';
import SortConfiguration from './sort-config.component';
import ParameterEditor from './parameter-editor.component';
import DisplayExportSettings from './display-export-settings.component';
import styles from './linelist-report-builder-modal.scss';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  initialReport?: LinelistReportDto | null;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * Default draft state
 */
const defaultDraft: LinelistReportDraft = {
  name: '',
  description: '',
  code: '',
  currentPanel: 'basics',
  categoryUuid: '',
  themeUuid: '',
  dataSourceUuid: '',
  rowGrain: 'PATIENT',
  templateId: '',
  cohortSql: '',
  visualFilter: {
    rootGroup: {
      id: 'root',
      logicalOperator: 'AND',
      conditions: [],
    },
    useVisualBuilder: false,
  },
  columns: [],
  parameters: [],
  dataSetName: 'PATIENT_LIST',
  sortConfig: [],
  limit: 1000,
  errors: {},
};

/**
 * Convert LinelistReportDto to LinelistReportDraft for editing
 */
function reportDtoToDraft(report: LinelistReportDto): LinelistReportDraft {
  let config: LinelistReportDefinitionConfig | null = null;

  try {
    config = report.configJson ? JSON.parse(report.configJson) : null;
  } catch (e) {
    console.error('Failed to parse report config:', e);
  }

  if (!config || config.type !== 'LINE_LIST') {
    // Return default draft for invalid config
    return {
      ...defaultDraft,
      name: report.name || '',
      description: report.description || '',
      code: report.code || '',
    };
  }

  // Extract columns from dataset definitions
  const columns: LinelistColumnDraft[] = [];
  const dataSet = config.dataSetDefinitions?.[0];

  if (dataSet?.columns) {
    dataSet.columns.forEach((col, idx) => {
      columns.push({
        id: `col-${idx}`,
        name: col.name,
        dataDefinitionType: (col.dataDefinition as any).type || 'SQL',
        config: (col.dataDefinition as any).config || {},
        sortOrder: idx,
        repeatResolution: (col as any).repeatResolution,
      });
    });
  }

  // Extract parameters from config
  const parameters: LinelistParameterDraft[] = [];
  if (config.parameters && config.parameters.length > 0) {
    config.parameters.forEach((param, idx) => {
      parameters.push({
        id: `param-${idx}`,
        name: param.name,
        label: param.label,
        type: param.type,
        required: param.required || false,
        defaultValue: (param as any).defaultValue || '',
        displayOrder: (param as any).displayOrder || idx,
        config: (param as any).config || {},
      });
    });
  }

  return {
    ...defaultDraft,
    name: report.name || '',
    description: report.description || '',
    code: report.code || '',
    categoryUuid: (config as any).categoryUuid || '',
    themeUuid: (config as any).themeUuid || report.metaJson ? (JSON.parse(report.metaJson || '{}') as any).themeUuid || '' : '',
    dataSourceUuid: (config as any).dataSourceUuid || '',
    rowGrain: (config as any).rowGrain || 'PATIENT',
    templateId: (config as any).templateId || '',
    cohortSql: config.baseCohortDefinition?.config?.sql || '',
    columns,
    parameters,
    dataSetName: dataSet?.name || 'PATIENT_LIST',
    sortConfig: config.orderBy
      ? [
          {
            id: `sort-0`,
            columnId: config.orderBy,
            columnName: config.orderBy,
            direction: config.orderDirection || 'ASC',
            nulls: 'LAST',
            sortOrder: 0,
          },
        ]
      : [],
    limit: config.limit,
  };
}

export default function LinelistReportBuilderModal({ open, mode, initialReport, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<LinelistReportDraft>(defaultDraft);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [panelValidation, setPanelValidation] = useState<Record<string, boolean>>({});

  // Data for dropdowns
  const [categories, setCategories] = useState<ReportCategoryDto[]>([]);
  const [themes, setThemes] = useState<DataTheme[]>([]);
  const { tables } = useETLTables(open);

  // Load categories and themes on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, thms] = await Promise.all([
          listReportCategories(),
          listThemes(),
        ]);
        setCategories(cats);
        setThemes(thms);
      } catch (error) {
        console.error('Failed to load reference data:', error);
      }
    };
    loadData();
  }, []);

  // Initialize draft when opening
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialReport) {
        setDraft(reportDtoToDraft(initialReport));
      } else {
        setDraft({ ...defaultDraft });
      }
      setSaveError(null);
      setPanelValidation({});
    }
  }, [open, mode, initialReport]);

  /**
   * Update draft field
   */
  const updateDraft = useCallback((updates: Partial<LinelistReportDraft>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  }, []);

  /**
   * Navigate to panel
   */
  const goToPanel = useCallback((panel: LinelistBuilderPanel) => {
    setDraft((prev) => ({ ...prev, currentPanel: panel }));
  }, []);

  /**
   * Validate current panel
   */
  const validatePanel = useCallback((panel: LinelistBuilderPanel): boolean => {
    const errors = validateLinelistDraft(draft);

    let valid = true;

    switch (panel) {
      case 'basics':
        valid = !errors.name && !errors.categoryUuid && !errors.themeUuid && !errors.dataSourceUuid && !errors.rowGrain;
        break;
      case 'cohort':
        valid = !errors.cohortSql;
        break;
      case 'columns':
        valid = !errors.columns;
        break;
      default:
        valid = true;
    }

    setPanelValidation((prev) => ({ ...prev, [panel]: valid }));
    return valid;
  }, [draft]);

  /**
   * Check if can advance to next panel
   */
  const canAdvance = useCallback(() => {
    return validatePanel(draft.currentPanel);
  }, [draft.currentPanel, validatePanel]);

  /**
   * Go to next panel
   */
  const goToNextPanel = useCallback(() => {
    if (!canAdvance()) return;

    const panels: LinelistBuilderPanel[] = ['basics', 'cohort', 'columns', 'sort', 'parameters', 'display-export', 'preview', 'review'];
    const currentIndex = panels.indexOf(draft.currentPanel);

    if (currentIndex < panels.length - 1) {
      goToPanel(panels[currentIndex + 1]);
    }
  }, [draft.currentPanel, canAdvance, goToPanel]);

  /**
   * Go to previous panel
   */
  const goToPrevPanel = useCallback(() => {
    const panels: LinelistBuilderPanel[] = ['basics', 'cohort', 'columns', 'sort', 'parameters', 'display-export', 'preview', 'review'];
    const currentIndex = panels.indexOf(draft.currentPanel);

    if (currentIndex > 0) {
      goToPanel(panels[currentIndex - 1]);
    }
  }, [draft.currentPanel, goToPanel]);

  /**
   * Save the report
   */
  const handleSave = useCallback(async () => {
    if (!isLinelistDraftValid(draft)) {
      setSaveError('Please fix all validation errors before saving');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const config = draftToConfig(draft);
      const payload = configToSavePayload(config, {
        name: draft.name,
        description: draft.description,
        code: draft.code,
      });

      if (mode === 'create') {
        await createLinelistReport(payload);
      } else {
        await updateLinelistReport(initialReport?.uuid || '', payload);
      }

      onSaved();
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save report');
    } finally {
      setSaving(false);
    }
  }, [draft, mode, initialReport, onSaved, onClose]);

  /**
   * Get panel step number
   */
  const getPanelStep = useCallback((panel: LinelistBuilderPanel): number => {
    const panels: LinelistBuilderPanel[] = ['basics', 'cohort', 'columns', 'sort', 'parameters', 'display-export', 'preview', 'review'];
    return panels.indexOf(panel) + 1;
  }, []);

  /**
   * Get total steps
   */
  const totalSteps = 8;

  /**
   * Render panel content
   */
  const renderPanel = () => {
    const errors = validateLinelistDraft(draft);

    switch (draft.currentPanel) {
      case 'basics':
        return (
          <BasicsPanel
            draft={draft}
            onChange={updateDraft}
            error={errors.name}
            categories={categories}
            themes={themes}
            tables={tables}
          />
        );

      case 'cohort':
        return (
          <CohortPanel
            draft={draft}
            onChange={updateDraft}
            error={errors.cohortSql}
          />
        );

      case 'columns':
        return (
          <ColumnsPanel
            draft={draft}
            onChange={updateDraft}
            error={errors.columns}
          />
        );

      case 'sort':
        return (
          <SortPanel
            draft={draft}
            onChange={updateDraft}
          />
        );

      case 'parameters':
        return (
          <ParametersPanel
            draft={draft}
            onChange={updateDraft}
          />
        );

      case 'display-export':
        return (
          <DisplayExportPanel
            draft={draft}
            onChange={updateDraft}
          />
        );

      case 'preview':
        return (
          <PreviewPanel
            draft={draft}
          />
        );

      case 'review':
        return (
          <ReviewPanel
            draft={draft}
            onEdit={goToPanel}
            isValid={isLinelistDraftValid(draft)}
            categories={categories}
            themes={themes}
          />
        );

      default:
        return null;
    }
  };

  if (!open) return null;

  const currentStep = getPanelStep(draft.currentPanel);
  const canGoNext = canAdvance();
  const canGoPrev = currentStep > 1;
  const isLastPanel = draft.currentPanel === 'review';

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading={mode === 'create' ? 'Create Linelist Report' : 'Edit Linelist Report'}
      modalLabel="Report Builder"
      size="lg"
      className={styles.modal}
      preventCloseOnClickOutside={saving}
    >
      <ProgressBar
        value={currentStep}
        max={totalSteps}
        label={`Step ${currentStep} of ${totalSteps}`}
        className={styles.progressBar}
      />

      <div className={styles.content}>
        {/* Side Navigation */}
        <SideNav className={styles.sideNav}>
          <SideNavItems>
            <SideNavLink
              onClick={() => goToPanel('basics')}
              isActive={draft.currentPanel === 'basics'}
              renderIcon={panelValidation.basics === false ? undefined : undefined}
            >
              Basics
            </SideNavLink>
            <SideNavLink
              onClick={() => goToPanel('cohort')}
              isActive={draft.currentPanel === 'cohort'}
            >
              Cohort SQL
            </SideNavLink>
            <SideNavLink
              onClick={() => goToPanel('columns')}
              isActive={draft.currentPanel === 'columns'}
            >
              Columns
            </SideNavLink>
            <SideNavLink
              onClick={() => goToPanel('sort')}
              isActive={draft.currentPanel === 'sort'}
            >
              Sort
            </SideNavLink>
            <SideNavLink
              onClick={() => goToPanel('parameters')}
              isActive={draft.currentPanel === 'parameters'}
            >
              Parameters
            </SideNavLink>
            <SideNavLink
              onClick={() => goToPanel('display-export')}
              isActive={draft.currentPanel === 'display-export'}
            >
              Display & Export
            </SideNavLink>
            <SideNavLink
              onClick={() => goToPanel('preview')}
              isActive={draft.currentPanel === 'preview'}
            >
              Preview
            </SideNavLink>
            <SideNavLink
              onClick={() => goToPanel('review')}
              isActive={draft.currentPanel === 'review'}
            >
              Review
            </SideNavLink>
          </SideNavItems>
        </SideNav>

        {/* Main Content */}
        <Content className={styles.panelContent}>
          {saveError && (
            <InlineNotification
              kind="error"
              title="Save Error"
              subtitle={saveError}
              onClose={() => setSaveError(null)}
              className={styles.notification}
            />
          )}

          {renderPanel()}
        </Content>
      </div>

      {/* Footer Actions */}
      <ButtonSet className={styles.footer}>
        <Button kind="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          kind="ghost"
          onClick={goToPrevPanel}
          disabled={!canGoPrev || saving}
        >
          Previous
        </Button>
        {isLastPanel ? (
          <Button
            kind="primary"
            onClick={handleSave}
            disabled={!isLinelistDraftValid(draft) || saving}
          >
            {saving ? 'Saving...' : (mode === 'create' ? 'Create Report' : 'Save Changes')}
          </Button>
        ) : (
          <Button
            kind="primary"
            onClick={goToNextPanel}
            disabled={!canGoNext || saving}
          >
            Next
          </Button>
        )}
      </ButtonSet>
    </Modal>
  );
}

/**
 * Basics Panel
 */
interface BasicsPanelProps {
  draft: LinelistReportDraft;
  onChange: (updates: Partial<LinelistReportDraft>) => void;
  error?: string;
  categories: ReportCategoryDto[];
  themes: DataTheme[];
  tables: string[];
}

function BasicsPanel({
  draft,
  onChange,
  error,
  categories,
  themes,
  tables,
}: BasicsPanelProps) {
  const rowGrainOptions: Array<{ value: LinelistRowGrain; label: string; description: string }> = [
    { value: 'PATIENT', label: 'Patient', description: 'One row per patient' },
    { value: 'ENCOUNTER', label: 'Encounter', description: 'One row per encounter/visit' },
    { value: 'OBSERVATION', label: 'Observation/Lab Result', description: 'One row per observation or test' },
    { value: 'PROGRAM_ENROLLMENT', label: 'Program Enrollment', description: 'One row per program enrollment' },
    { value: 'APPOINTMENT', label: 'Appointment', description: 'One row per appointment' },
    { value: 'ORDER', label: 'Order', description: 'One row per order' },
  ];

  const templateOptions = [
    { value: '', label: 'Blank Report' },
    { value: 'appointment-list', label: 'Appointment List' },
    { value: 'patient-demographic', label: 'Patient Demographic List' },
    { value: 'missed-appointment', label: 'Missed Appointment List' },
    { value: 'laboratory-result', label: 'Laboratory Result List' },
  ];

  return (
    <Stack gap={4}>
      <h2 className={styles.panelTitle}>Basic Information</h2>
      <p className={styles.panelDescription}>
        Enter the basic information for your linelist report. This information will be displayed in
        the report library.
      </p>

      <TextInput
        id="linelist-name"
        labelText="Report Name *"
        placeholder="e.g., Patients on ART"
        value={draft.name}
        onChange={(e) => onChange({ name: (e.target as HTMLInputElement).value })}
        invalid={!!error}
        invalidText={error}
      />

      <TextInput
        id="linelist-code"
        labelText="Code (optional)"
        placeholder="e.g., ART_PATIENTS"
        value={draft.code}
        onChange={(e) => onChange({ code: (e.target as HTMLInputElement).value })}
      />

      <TextArea
        id="linelist-description"
        labelText="Description (optional)"
        placeholder="Describe what this linelist report shows..."
        value={draft.description}
        onChange={(e) => onChange({ description: (e.target as HTMLTextAreaElement).value })}
        rows={3}
      />

      <Select
        id="linelist-category"
        labelText="Category *"
        value={draft.categoryUuid}
        onChange={(e) => onChange({ categoryUuid: (e.target as HTMLSelectElement).value })}
        invalid={!!draft.errors.categoryUuid}
        invalidText={draft.errors.categoryUuid}
      >
        <SelectItem value="" text="Select a category" />
        {categories.map((cat) => (
          <SelectItem key={cat.uuid} value={cat.uuid} text={cat.name} />
        ))}
      </Select>

      <Select
        id="linelist-theme"
        labelText="Data Theme *"
        value={draft.themeUuid}
        onChange={(e) => onChange({ themeUuid: (e.target as HTMLSelectElement).value })}
        invalid={!!draft.errors.themeUuid}
        invalidText={draft.errors.themeUuid}
        helperText="Select the data theme that defines available fields"
      >
        <SelectItem value="" text="Select a data theme" />
        {themes.map((theme) => (
          <SelectItem key={theme.uuid || theme.code} value={theme.uuid || ''} text={theme.name} />
        ))}
      </Select>

      <Select
        id="linelist-source"
        labelText="Data Source *"
        value={draft.dataSourceUuid}
        onChange={(e) => onChange({ dataSourceUuid: (e.target as HTMLSelectElement).value })}
        invalid={!!draft.errors.dataSourceUuid}
        invalidText={draft.errors.dataSourceUuid}
        helperText="Select the ETL data source table"
      >
        <SelectItem value="" text="Select a data source" />
        {tables.map((table) => (
          <SelectItem key={table} value={table} text={table} />
        ))}
      </Select>

      <Select
        id="linelist-row-grain"
        labelText="One Row Represents *"
        value={draft.rowGrain}
        onChange={(e) => onChange({ rowGrain: (e.target as HTMLSelectElement).value as LinelistRowGrain })}
        invalid={!!draft.errors.rowGrain}
        invalidText={draft.errors.rowGrain}
        helperText="What each row in the report represents"
      >
        {rowGrainOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            text={option.label}
            title={option.description}
          />
        ))}
      </Select>

      <Select
        id="linelist-template"
        labelText="Template (optional)"
        value={draft.templateId}
        onChange={(e) => onChange({ templateId: (e.target as HTMLSelectElement).value })}
        helperText="Start with a pre-configured template"
      >
        {templateOptions.map((option) => (
          <SelectItem key={option.value} value={option.value} text={option.label} />
        ))}
      </Select>

      <TextInput
        id="linelist-dataset-name"
        labelText="Dataset Name"
        value={draft.dataSetName}
        onChange={(e) => onChange({ dataSetName: (e.target as HTMLInputElement).value })}
        helperText="The name for the dataset in the report output"
      />
    </Stack>
  );
}

/**
 * Cohort Panel
 */
function CohortPanel({
  draft,
  onChange,
  error,
}: {
  draft: LinelistReportDraft;
  onChange: (updates: Partial<LinelistReportDraft>) => void;
  error?: string;
}) {
  // Initialize visual filter if not present
  const visualFilter = draft.visualFilter || {
    rootGroup: {
      id: 'root',
      logicalOperator: 'AND',
      conditions: [],
    },
    useVisualBuilder: false,
  };

  // Available fields for the visual filter builder
  // In a real implementation, this would come from the ETL schema
  const availableFields: Array<{ name: string; label: string; type: FilterFieldType }> = [
    { name: 'appointment_date', label: 'Appointment Date', type: 'DATE' },
    { name: 'gender', label: 'Gender', type: 'CODED' },
    { name: 'age', label: 'Age', type: 'NUMBER' },
    { name: 'voided', label: 'Voided', type: 'BOOLEAN' },
    { name: 'location_id', label: 'Facility', type: 'LOCATION' },
    { name: 'given_name', label: 'First Name', type: 'TEXT' },
    { name: 'family_name', label: 'Last Name', type: 'TEXT' },
  ];

  const handleVisualFilterChange = (newVisualFilter: VisualFilterState) => {
    onChange({ visualFilter: newVisualFilter });
  };

  return (
    <Stack gap={4}>
      <h2 className={styles.panelTitle}>Patient Selection</h2>
      <p className={styles.panelDescription}>
        Define the SQL query that selects patients for this linelist report. The query should return
        distinct patient IDs and use the :startDate and :endDate parameters.
      </p>

      <CohortSQLEditor
        sql={draft.cohortSql}
        onChange={(sql) => onChange({ cohortSql: sql })}
        error={error}
        visualFilter={visualFilter}
        onVisualFilterChange={handleVisualFilterChange}
        availableFields={availableFields}
      />
    </Stack>
  );
}

/**
 * Columns Panel
 */
function ColumnsPanel({
  draft,
  onChange,
  error,
}: {
  draft: LinelistReportDraft;
  onChange: (updates: Partial<LinelistReportDraft>) => void;
  error?: string;
}) {
  const [useCategorySelector, setUseCategorySelector] = useState(true);

  return (
    <Stack gap={4}>
      <div className={styles.panelHeaderRow}>
        <div>
          <h2 className={styles.panelTitle}>Report Columns</h2>
          <p className={styles.panelDescription}>
            Select and configure the columns to include in your linelist report. These columns will be
            displayed for each patient returned by your cohort query.
          </p>
        </div>
        <Toggle
          id="use-category-selector"
          labelText="Use category selector"
          labelA="Advanced"
          labelB="Simple"
          toggled={useCategorySelector}
          onToggle={setUseCategorySelector}
          className={styles.categoryToggle}
        />
      </div>

      {useCategorySelector ? (
        <ColumnCategorySelector
          columns={draft.columns}
          onChange={(columns) => onChange({ columns })}
          error={error}
        />
      ) : (
        <ColumnSelector
          columns={draft.columns}
          onChange={(columns) => onChange({ columns })}
          error={error}
        />
      )}
    </Stack>
  );
}

/**
 * Sort Panel
 */
function SortPanel({
  draft,
  onChange,
}: {
  draft: LinelistReportDraft;
  onChange: (updates: Partial<LinelistReportDraft>) => void;
}) {
  return (
    <Stack gap={4}>
      <h2 className={styles.panelTitle}>Sort Configuration</h2>
      <p className={styles.panelDescription}>
        Define how rows should be ordered in your linelist report. Sort rules are applied in priority
        order from top to bottom.
      </p>

      <SortConfiguration
        sortConfig={draft.sortConfig || []}
        columns={draft.columns || []}
        onChange={(sortConfig) => onChange({ sortConfig })}
        disabled={false}
      />
    </Stack>
  );
}

/**
 * Parameters Panel
 */
function ParametersPanel({
  draft,
  onChange,
}: {
  draft: LinelistReportDraft;
  onChange: (updates: Partial<LinelistReportDraft>) => void;
}) {
  return (
    <Stack gap={4}>
      <h2 className={styles.panelTitle}>Report Parameters</h2>
      <p className={styles.panelDescription}>
        Define runtime parameters for your linelist report. Parameters allow users to customize
        report output when running the report (e.g., date range, location, program).
      </p>

      <ParameterEditor
        parameters={draft.parameters || []}
        onChange={(parameters) => onChange({ parameters })}
        disabled={false}
      />
    </Stack>
  );
}

/**
 * Display & Export Panel
 */
function DisplayExportPanel({
  draft,
  onChange,
}: {
  draft: LinelistReportDraft;
  onChange: (updates: Partial<LinelistReportDraft>) => void;
}) {
  return (
    <Stack gap={4}>
      <h2 className={styles.panelTitle}>Display & Export Settings</h2>
      <p className={styles.panelDescription}>
        Configure how your linelist report is displayed in the browser and exported.
      </p>

      <DisplayExportSettings
        draft={draft}
        onChange={onChange}
        disabled={false}
      />
    </Stack>
  );
}

/**
 * Preview Panel
 */
interface PreviewPanelProps {
  draft: LinelistReportDraft;
}

function PreviewPanel({ draft }: PreviewPanelProps) {
  const [sampleSize, setSampleSize] = useState<number>(25);
  const [showJson, setShowJson] = useState<boolean>(false);

  const config = draftToConfig(draft);
  const warnings = generateLinelistWarnings(draft);
  const hasWarnings = Object.keys(warnings).length > 0;
  const columns = draft.columns;

  // Generate mock data for preview (in real implementation, this would come from API)
  const mockRows = useMemo(() => {
    if (columns.length === 0) return [];
    const rows = [];
    for (let i = 0; i < Math.min(sampleSize, 5); i++) {
      const row: Record<string, string> = {};
      columns.forEach((col) => {
        row[col.name] = `[${col.name}]`; // Placeholder value
      });
      rows.push(row);
    }
    return rows;
  }, [columns, sampleSize]);

  const sampleSizeOptions = [25, 50, 100, 500];

  return (
    <Stack gap={4}>
      <h2 className={styles.panelTitle}>Report Preview</h2>
      <p className={styles.panelDescription}>
        Preview how your linelist report will look with the current configuration.
      </p>

      {/* Preview toolbar */}
      <div className={styles.previewToolbar}>
        <ButtonSet>
          <Button
            kind="primary"
            size="sm"
            onClick={() => {/* TODO: Implement preview API call */}}
            disabled={columns.length === 0}
          >
            Run Preview
          </Button>
          <Button
            kind="ghost"
            size="sm"
            onClick={() => setShowJson(!showJson)}
          >
            {showJson ? 'Hide' : 'Show'} JSON
          </Button>
        </ButtonSet>

        <Select
          id="sample-size"
          labelText="Sample Size"
          size="sm"
          value={String(sampleSize)}
          onChange={(e) => setSampleSize(Number((e.target as HTMLSelectElement).value))}
        >
          {sampleSizeOptions.map((size) => (
            <SelectItem key={size} value={String(size)} text={`${size} rows`} />
          ))}
        </Select>
      </div>

      {/* Status area */}
      <div className={styles.previewStatus}>
        <span>Columns: {columns.length}</span>
        <span>Sample size: {sampleSize}</span>
        <span>Row grain: {draft.rowGrain?.replace('_', ' ') || '-'}</span>
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <InlineNotification
          kind="warning"
          title="Preview Warnings"
          subtitle={Object.values(warnings).join('; ')}
          lowContrast
        />
      )}

      {/* Empty state */}
      {columns.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No columns defined. Add columns in the Columns panel to see a preview.</p>
        </div>
      ) : (
        /* Data table preview */
        <DataTable
          rows={mockRows.map((row, idx) => ({ id: idx, ...row }))}
          headers={columns.map((col) => ({ key: col.name, header: col.name }))}
        >
          {({ headers, rows }) => (
            <TableContainer className={styles.previewTableContainer}>
              <Table>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader key={header.key}>{header.header}</TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      {columns.map((col) => (
                        <TableCell key={col.name}>{(row as any)[col.name]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}

      {/* JSON preview (collapsible) */}
      {showJson && (
        <div className={styles.sqlPreview}>
          <h4>Generated Configuration</h4>
          <pre className={styles.jsonPreview}>{JSON.stringify(config, null, 2)}</pre>
        </div>
      )}
    </Stack>
  );
}

/**
 * Review Panel
 */
interface ReviewPanelProps {
  draft: LinelistReportDraft;
  onEdit: (panel: LinelistBuilderPanel) => void;
  isValid: boolean;
  categories: ReportCategoryDto[];
  themes: DataTheme[];
}

function ReviewPanel({
  draft,
  onEdit,
  isValid,
  categories,
  themes,
}: ReviewPanelProps) {
  const warnings = generateLinelistWarnings(draft);
  const isReadyToPublish = isLinelistDraftReadyToPublish(draft);

  // Helper to get display names
  const getCategoryName = () => categories.find((c) => c.uuid === draft.categoryUuid)?.name || '-';
  const getThemeName = () => themes.find((t) => t.uuid === draft.themeUuid)?.name || '-';
  const getDataSourceName = () => draft.dataSourceUuid || '-';
  const getRowGrainName = () => draft.rowGrain?.replace('_', ' ') || '-';

  const hasWarnings = Object.keys(warnings).length > 0;

  return (
    <Stack gap={4}>
      <h2 className={styles.panelTitle}>Review & Save</h2>
      <p className={styles.panelDescription}>
        Review your linelist report configuration and save when ready.
      </p>

      <div className={styles.reviewGrid}>
        <ReviewItem label="Report Name" value={draft.name} onEdit={() => onEdit('basics')} />
        <ReviewItem label="Code" value={draft.code || '-'} onEdit={() => onEdit('basics')} />
        <ReviewItem
          label="Description"
          value={draft.description || '-'}
          onEdit={() => onEdit('basics')}
        />
        <ReviewItem label="Category" value={getCategoryName()} onEdit={() => onEdit('basics')} />
        <ReviewItem label="Data Theme" value={getThemeName()} onEdit={() => onEdit('basics')} />
        <ReviewItem label="Data Source" value={getDataSourceName()} onEdit={() => onEdit('basics')} />
        <ReviewItem label="Row Grain" value={getRowGrainName()} onEdit={() => onEdit('basics')} />
        <ReviewItem
          label="Dataset Name"
          value={draft.dataSetName}
          onEdit={() => onEdit('basics')}
        />
        <ReviewItem
          label="Columns"
          value={`${draft.columns.length} column(s)`}
          onEdit={() => onEdit('columns')}
        />
        <ReviewItem label="Row Limit" value={draft.limit?.toString() || '-'} onEdit={() => onEdit('basics')} />
      </div>

      {!isValid && (
        <InlineNotification
          kind="error"
          title="Validation Errors"
          subtitle="Please fix all validation errors before saving."
          lowContrast
        />
      )}

      {isValid && !isReadyToPublish && (
        <InlineNotification
          kind="warning"
          title="Not Ready to Publish"
          subtitle="Report has validation issues that must be resolved before publishing."
          lowContrast
        />
      )}

      {isValid && isReadyToPublish && (
        <InlineNotification
          kind="success"
          title="Ready to Publish"
          subtitle="Your linelist report configuration is complete and valid."
          lowContrast
        />
      )}

      {hasWarnings && (
        <InlineNotification
          kind="warning"
          title="Warnings"
          subtitle={Object.values(warnings).join('; ')}
          lowContrast
        />
      )}
    </Stack>
  );
}

/**
 * Review item component
 */
function ReviewItem({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className={styles.reviewItem}>
      <span className={styles.reviewLabel}>{label}:</span>
      <span className={styles.reviewValue}>{value}</span>
      <Button kind="ghost" size="sm" onClick={onEdit}>
        Edit
      </Button>
    </div>
  );
}

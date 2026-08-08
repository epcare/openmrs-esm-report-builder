/**
 * Display & Export Settings Component for Linelist Reports
 *
 * This component allows users to configure display and export settings for their linelist reports.
 * Follows design spec section 8.7: Display and export.
 */

import React, { useState } from 'react';
import {
  Stack,
  TextInput,
  Select,
  SelectItem,
  Toggle,
  NumberInput,
  Tag,
  ButtonSet,
  Button,
} from '@carbon/react';
import type {
  LinelistReportDraft,
} from '../../../../types/linelist-types';
import styles from './display-export-settings.scss';

type ExportFormat = 'CSV' | 'XLSX' | 'PDF';

type DisplayExportSettings = {
  defaultPageSize: number;
  freezeFirstColumn: boolean;
  freezeHeader: boolean;
  showRecordCount: boolean;
  dateDisplayFormat: string;
  nullDisplayValue: string;
  maxInteractiveRows: number;
  maxExportRows: number;
  allowedExports: ExportFormat[];
  includeParametersInExport: boolean;
  includeGeneratedTimestamp: boolean;
};

type Props = {
  draft: LinelistReportDraft;
  onChange: (updates: Partial<LinelistReportDraft>) => void;
  disabled?: boolean;
};

/**
 * Default settings
 */
const DEFAULT_SETTINGS: DisplayExportSettings = {
  defaultPageSize: 25,
  freezeFirstColumn: false,
  freezeHeader: true,
  showRecordCount: true,
  dateDisplayFormat: 'dd MMM yyyy',
  nullDisplayValue: '-',
  maxInteractiveRows: 1000,
  maxExportRows: 10000,
  allowedExports: ['CSV', 'XLSX'],
  includeParametersInExport: true,
  includeGeneratedTimestamp: true,
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];

const EXPORT_FORMATS: Array<{ value: ExportFormat; label: string; description: string }> = [
  { value: 'CSV', label: 'CSV', description: 'Comma-separated values' },
  { value: 'XLSX', label: 'Excel (XLSX)', description: 'Microsoft Excel format' },
  { value: 'PDF', label: 'PDF', description: 'Printable document format' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'dd MMM yyyy', label: 'dd MMM yyyy (e.g., 24 Jan 2026)' },
  { value: 'dd/MM/yyyy', label: 'dd/MM/yyyy (e.g., 24/01/2026)' },
  { value: 'yyyy-MM-dd', label: 'yyyy-MM-dd (e.g., 2026-01-24)' },
  { value: 'MM/dd/yyyy', label: 'MM/dd/yyyy (e.g., 01/24/2026)' },
  { value: 'dd MMM yyyy HH:mm', label: 'dd MMM yyyy HH:mm (e.g., 24 Jan 2026 14:30)' },
];

export default function DisplayExportSettings({ draft, onChange, disabled = false }: Props) {
  // Parse settings from draft or use defaults
  const settings = parseSettings(draft);
  const [exportFormatTags, setExportFormatTags] = useState<React.ReactNode>(renderExportFormatTags(settings.allowedExports));

  /**
   * Parse display/export settings from draft config
   */
  function parseSettings(draft: LinelistReportDraft): DisplayExportSettings {
    return {
      defaultPageSize: (draft as any).defaultPageSize ?? DEFAULT_SETTINGS.defaultPageSize,
      freezeFirstColumn: (draft as any).freezeFirstColumn ?? DEFAULT_SETTINGS.freezeFirstColumn,
      freezeHeader: (draft as any).freezeHeader ?? DEFAULT_SETTINGS.freezeHeader,
      showRecordCount: (draft as any).showRecordCount ?? DEFAULT_SETTINGS.showRecordCount,
      dateDisplayFormat: (draft as any).dateDisplayFormat ?? DEFAULT_SETTINGS.dateDisplayFormat,
      nullDisplayValue: (draft as any).nullDisplayValue ?? DEFAULT_SETTINGS.nullDisplayValue,
      maxInteractiveRows: (draft as any).maxInteractiveRows ?? DEFAULT_SETTINGS.maxInteractiveRows,
      maxExportRows: (draft as any).maxExportRows ?? DEFAULT_SETTINGS.maxExportRows,
      allowedExports: (draft as any).allowedExports ?? DEFAULT_SETTINGS.allowedExports,
      includeParametersInExport:
        (draft as any).includeParametersInExport ?? DEFAULT_SETTINGS.includeParametersInExport,
      includeGeneratedTimestamp:
        (draft as any).includeGeneratedTimestamp ?? DEFAULT_SETTINGS.includeGeneratedTimestamp,
    };
  }

  /**
   * Update a setting
   */
  const updateSetting = <K extends keyof DisplayExportSettings>(key: K, value: DisplayExportSettings[K]) => {
    onChange({ [key]: value } as any);
  };

  /**
   * Render export format tags
   */
  function renderExportFormatTags(formats: ExportFormat[]): React.ReactNode {
    return formats.map((format) => (
      <Tag key={format} type="blue">
        {EXPORT_FORMATS.find((f) => f.value === format)?.label || format}
      </Tag>
    ));
  }

  /**
   * Toggle export format
   */
  const toggleExportFormat = (format: ExportFormat) => {
    const allowed = settings.allowedExports.includes(format)
      ? settings.allowedExports.filter((f) => f !== format)
      : [...settings.allowedExports, format];

    updateSetting('allowedExports', allowed);
    setExportFormatTags(renderExportFormatTags(allowed));
  };

  return (
    <div className={styles.container}>
      <Stack gap={5}>
        {/* Display Settings */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Display Settings</h4>
          <p className={styles.description}>
            Configure how the report is displayed in the browser preview and results view.
          </p>

          <Stack gap={4}>
            {/* Default page size */}
            <Select
              id="default-page-size"
              labelText="Default Page Size"
              value={String(settings.defaultPageSize)}
              onChange={(e) => updateSetting('defaultPageSize', Number((e.target as HTMLSelectElement).value))}
              disabled={disabled}
              helperText="Number of rows to display per page in the results view"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)} text={String(size)} />
              ))}
            </Select>

            {/* Freeze first column */}
            <div>
              <Toggle
                id="freeze-first-column"
                labelText="Freeze First Column"
                toggled={settings.freezeFirstColumn}
                onToggle={(checked) => updateSetting('freezeFirstColumn', checked)}
                disabled={disabled}
              />
              <p className={styles.helperText}>Keep the first column visible when scrolling horizontally</p>
            </div>

            {/* Freeze header */}
            <div>
              <Toggle
                id="freeze-header"
                labelText="Freeze Header"
                toggled={settings.freezeHeader}
                onToggle={(checked) => updateSetting('freezeHeader', checked)}
                disabled={disabled}
              />
              <p className={styles.helperText}>Keep the table header visible when scrolling vertically</p>
            </div>

            {/* Show record count */}
            <div>
              <Toggle
                id="show-record-count"
                labelText="Show Record Count"
                toggled={settings.showRecordCount}
                onToggle={(checked) => updateSetting('showRecordCount', checked)}
                disabled={disabled}
              />
              <p className={styles.helperText}>Display the total number of records in the report header</p>
            </div>

            {/* Maximum interactive rows */}
            <NumberInput
              id="max-interactive-rows"
              label="Maximum Interactive Rows"
              value={settings.maxInteractiveRows}
              onChange={(event) => {
                const value = Number((event.target as HTMLInputElement).value);
                updateSetting('maxInteractiveRows', value);
              }}
              min={100}
              max={100000}
              step={100}
              disabled={disabled}
              helperText="Maximum rows to load in browser preview (higher values may impact performance)"
            />
          </Stack>
        </div>

        {/* Column Formatting */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Column Formatting</h4>
          <p className={styles.description}>
            Configure how column values are displayed.
          </p>

          <Stack gap={4}>
            {/* Date display format */}
            <Select
              id="date-format"
              labelText="Date Display Format"
              value={settings.dateDisplayFormat}
              onChange={(e) => updateSetting('dateDisplayFormat', (e.target as HTMLSelectElement).value)}
              disabled={disabled}
              helperText="Format for displaying date values in the report"
            >
              {DATE_FORMAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} text={option.label} />
              ))}
            </Select>

            {/* Null display value */}
            <TextInput
              id="null-value"
              labelText="Null Display Value"
              placeholder="e.g., -, N/A, Empty"
              value={settings.nullDisplayValue}
              onChange={(e) => updateSetting('nullDisplayValue', (e.target as HTMLInputElement).value)}
              disabled={disabled}
              helperText="Text to display when a column value is null or empty"
            />
          </Stack>
        </div>

        {/* Export Settings */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Export Settings</h4>
          <p className={styles.description}>
            Configure how the report can be exported and what's included in exports.
          </p>

          <Stack gap={4}>
            {/* Allowed export formats */}
            <div>
              <p className={styles.label}>Allowed Export Formats</p>
              <p className={styles.helperText}>
                Select which export formats users can access when running this report
              </p>
              <div className={styles.exportFormats}>
                {EXPORT_FORMATS.map((format) => (
                  <div key={format.value}>
                    <Toggle
                      id={`export-${format.value}`}
                      labelText={format.label}
                      toggled={settings.allowedExports.includes(format.value)}
                      onToggle={() => toggleExportFormat(format.value)}
                      disabled={disabled}
                    />
                    <p className={styles.helperText}>{format.description}</p>
                  </div>
                ))}
              </div>
              <div className={styles.selectedFormats}>
                {settings.allowedExports.length > 0 ? (
                  <>
                    <span className={styles.selectedLabel}>Selected: </span>
                    {exportFormatTags}
                  </>
                ) : (
                  <span className={styles.noSelection}>No export formats selected</span>
                )}
              </div>
            </div>

            {/* Maximum export rows */}
            <NumberInput
              id="max-export-rows"
              label="Maximum Export Rows"
              value={settings.maxExportRows}
              onChange={(event) => {
                const value = Number((event.target as HTMLInputElement).value);
                updateSetting('maxExportRows', value);
              }}
              min={100}
              max={1000000}
              step={1000}
              disabled={disabled}
              helperText="Maximum rows allowed in a single export (for performance and file size limits)"
            />

            {/* Include parameters in export */}
            <div>
              <Toggle
                id="include-parameters"
                labelText="Include Parameters in Export"
                toggled={settings.includeParametersInExport}
                onToggle={(checked) => updateSetting('includeParametersInExport', checked)}
                disabled={disabled}
              />
              <p className={styles.helperText}>Add the report parameters used to the export header</p>
            </div>

            {/* Include generated timestamp */}
            <div>
              <Toggle
                id="include-timestamp"
                labelText="Include Generated Timestamp"
                toggled={settings.includeGeneratedTimestamp}
                onToggle={(checked) => updateSetting('includeGeneratedTimestamp', checked)}
                disabled={disabled}
              />
              <p className={styles.helperText}>Add the date/time when the export was generated to the export header</p>
            </div>
          </Stack>
        </div>

        {/* Quick Presets */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Quick Presets</h4>
          <p className={styles.description}>
            Apply common configuration presets for quick setup.
          </p>

          <ButtonSet>
            <Button
              kind="ghost"
              size="sm"
              onClick={() => {
                updateSetting('defaultPageSize', 25);
                updateSetting('freezeFirstColumn', false);
                updateSetting('freezeHeader', true);
                updateSetting('showRecordCount', true);
                updateSetting('dateDisplayFormat', 'dd MMM yyyy');
                updateSetting('nullDisplayValue', '-');
                updateSetting('maxInteractiveRows', 1000);
                updateSetting('maxExportRows', 10000);
                updateSetting('allowedExports', ['CSV', 'XLSX']);
                updateSetting('includeParametersInExport', true);
                updateSetting('includeGeneratedTimestamp', true);
              }}
              disabled={disabled}
            >
              Standard Report
            </Button>
            <Button
              kind="ghost"
              size="sm"
              onClick={() => {
                updateSetting('defaultPageSize', 50);
                updateSetting('freezeFirstColumn', true);
                updateSetting('freezeHeader', true);
                updateSetting('showRecordCount', true);
                updateSetting('dateDisplayFormat', 'dd/MM/yyyy');
                updateSetting('nullDisplayValue', '-');
                updateSetting('maxInteractiveRows', 5000);
                updateSetting('maxExportRows', 50000);
                updateSetting('allowedExports', ['CSV', 'XLSX', 'PDF']);
                updateSetting('includeParametersInExport', true);
                updateSetting('includeGeneratedTimestamp', true);
              }}
              disabled={disabled}
            >
              Large Dataset
            </Button>
            <Button
              kind="ghost"
              size="sm"
              onClick={() => {
                updateSetting('defaultPageSize', 100);
                updateSetting('freezeFirstColumn', true);
                updateSetting('freezeHeader', true);
                updateSetting('showRecordCount', true);
                updateSetting('dateDisplayFormat', 'dd MMM yyyy HH:mm');
                updateSetting('nullDisplayValue', 'N/A');
                updateSetting('maxInteractiveRows', 10000);
                updateSetting('maxExportRows', 100000);
                updateSetting('allowedExports', ['CSV']);
                updateSetting('includeParametersInExport', true);
                updateSetting('includeGeneratedTimestamp', true);
              }}
              disabled={disabled}
            >
              High Volume Export
            </Button>
          </ButtonSet>
        </div>
      </Stack>
    </div>
  );
}

import React from 'react';
import {
  Button,
  InlineLoading,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  InlineNotification,
} from '@carbon/react';
import { Save, Download } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import Header from '../shared/header/header.component';
import AiAssistButton from '../ai-support/ai-assist-button.component';

import ReportDetail, { type ReportDetailModel } from './panels/report-detail.component';
import ReportDefinitionEditor from './definition/report-definition-editor.component';
import ReportDesignEditor from './design/report-design-editor.component';

import type { ReportDefinitionDraft } from './definition/report-definition.types';
import type { ReportDesignDraft } from './design/report-design.types';
import { createEmptyReportDesignDraft } from './design/report-design.utils';

import {
  createMambaReport,
  updateMambaReport,
  getMambaReport,
  compileMambaReport,
  type MambaReportDto,
} from '../../resources/report/mambareports.api';

type TabKey = 'details' | 'definition' | 'design';
type BuilderMode = 'create' | 'edit';

type ReportFormState = {
  uuid: string;
  name: string;
  description: string;
  code: string;
  sections: ReportDefinitionDraft['sections'];
  design: ReportDesignDraft;
};

function buildEmptyForm(): ReportFormState {
  return {
    uuid: crypto.randomUUID(),
    name: '',
    description: '',
    code: '',
    sections: [],
    design: createEmptyReportDesignDraft(),
  };
}

function slugifyCode(name: string): string {
  return (name || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
}

function parseSavedReportToForm(report: MambaReportDto): ReportFormState {
  let parsed: any = {};
  try {
    parsed = report.configJson ? JSON.parse(report.configJson) : {};
  } catch {
    parsed = {};
  }

  const definition = parsed?.definition ?? {};
  const legacySections = Array.isArray(parsed?.sections) ? parsed.sections : [];
  const design = parsed?.design ?? null;

  return {
    uuid: report.uuid,
    name: report.name ?? parsed?.name ?? '',
    description: report.description ?? parsed?.description ?? '',
    code: report.code ?? parsed?.code ?? '',
    sections: Array.isArray(definition?.sections)
        ? definition.sections
        : legacySections,
    design: design ?? createEmptyReportDesignDraft(),
  };
}

export default function ReportEditorPage() {
  const { t } = useTranslation();
  const { reportId } = useParams();

  const mode: BuilderMode = reportId ? 'edit' : 'create';

  const [tab, setTab] = React.useState<TabKey>('details');
  const [form, setForm] = React.useState<ReportFormState>(() => buildEmptyForm());

  const [savedReport, setSavedReport] = React.useState<MambaReportDto | null>(null);

  const [loading, setLoading] = React.useState(mode === 'edit');
  const [saving, setSaving] = React.useState(false);
  const [compiling, setCompiling] = React.useState(false);

  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState<string | null>(null);
  const [compileError, setCompileError] = React.useState<string | null>(null);
  const [compileSuccess, setCompileSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      if (mode !== 'edit' || !reportId) {
        setForm(buildEmptyForm());
        setSavedReport(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setSaveError(null);
        setCompileError(null);

        const report = await getMambaReport(reportId);
        if (cancelled) return;

        setSavedReport(report);
        setForm(parseSavedReportToForm(report));
      } catch (e: any) {
        if (!cancelled) {
          setSaveError(e?.message ?? 'Failed to load report');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReport();
    return () => {
      cancelled = true;
    };
  }, [mode, reportId]);

  const detailModel: ReportDetailModel = {
    uuid: form.uuid,
    name: form.name,
    description: form.description,
  };

  const definitionDraft: ReportDefinitionDraft = {
    name: form.name,
    description: form.description,
    code: form.code,
    sections: form.sections,
  };

  const designDraft: ReportDesignDraft = form.design;

  const handleDetailChange = React.useCallback((next: ReportDetailModel) => {
    setForm((prev) => ({
      ...prev,
      name: next.name,
      description: next.description,
      uuid: next.uuid,
      code: prev.code?.trim() ? prev.code : slugifyCode(next.name),
    }));
  }, []);

  const handleDefinitionChange = React.useCallback((next: ReportDefinitionDraft) => {
    setForm((prev) => ({
      ...prev,
      code: next.code,
      sections: next.sections,
    }));
  }, []);

  const handleDesignChange = React.useCallback((next: ReportDesignDraft) => {
    setForm((prev) => ({
      ...prev,
      design: next,
    }));
  }, []);

  const handleDraftSave = React.useCallback(async () => {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);
      setCompileError(null);

      const authoringJson = {
        version: 1,
        uuid: savedReport?.uuid ?? form.uuid,
        name: form.name,
        code: form.code || slugifyCode(form.name),
        description: form.description,
        definition: {
          sections: form.sections ?? [],
        },
        design: form.design,
      };

      const payload = {
        name: authoringJson.name,
        description: authoringJson.description,
        code: authoringJson.code,
        configJson: JSON.stringify(authoringJson, null, 2),
      };

      const result =
          mode === 'edit' && (savedReport?.uuid || reportId)
              ? await updateMambaReport((savedReport?.uuid || reportId) as string, payload)
              : await createMambaReport(payload);

      setSavedReport(result);
      setForm((prev) => ({
        ...prev,
        uuid: result.uuid,
        code: result.code ?? prev.code,
      }));
      setSaveSuccess('Draft saved successfully.');
      return result;
    } catch (e: any) {
      setSaveError(e?.message ?? 'Failed to save report draft');
      throw e;
    } finally {
      setSaving(false);
    }
  }, [form, mode, reportId, savedReport?.uuid]);

  const handleCompile = React.useCallback(async () => {
    try {
      setCompiling(true);
      setCompileError(null);
      setCompileSuccess(null);
      setSaveError(null);

      let targetUuid = savedReport?.uuid || reportId || null;

      if (!targetUuid) {
        const saved = await handleDraftSave();
        targetUuid = saved?.uuid ?? null;
      }

      if (!targetUuid) {
        throw new Error('Save the report first before compiling.');
      }

      const result = await compileMambaReport(targetUuid);

      setCompileSuccess(
          result?.reportDefinitionUuid
              ? `Compiled successfully. Runtime report UUID: ${result.reportDefinitionUuid}`
              : 'Compiled successfully.',
      );
    } catch (e: any) {
      setCompileError(e?.message ?? 'Failed to compile report');
    } finally {
      setCompiling(false);
    }
  }, [handleDraftSave, reportId, savedReport?.uuid]);

  const handleCancel = React.useCallback(() => {
    setForm(buildEmptyForm());
    setSavedReport(null);
    setSaveError(null);
    setSaveSuccess(null);
    setCompileError(null);
    setCompileSuccess(null);
    setTab('details');
  }, []);

  const canSave = Boolean(form.name.trim()) && !saving && !loading;
  const canCompile = Boolean((savedReport?.uuid || reportId || form.name.trim()) && !saving && !compiling && !loading);

  return (
      <>
        <Header
            title={t('reportBuilder', 'Report Builder')}
            subtitle={t('reportBuilderSubtitle', 'Create and manage reports as collections of reusable sections.')}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '1rem' }}>
          <div>
            {loading ? <InlineLoading description="Loading report…" /> : null}
            {saving ? <InlineLoading description="Saving draft…" /> : null}
            {compiling ? <InlineLoading description="Compiling report…" /> : null}

            {!loading && !saving && saveError ? (
                <InlineNotification lowContrast kind="error" title="Save failed" subtitle={saveError} />
            ) : null}

            {!loading && !saving && saveSuccess ? (
                <InlineNotification lowContrast kind="success" title="Saved" subtitle={saveSuccess} />
            ) : null}

            {!loading && !compiling && compileError ? (
                <InlineNotification lowContrast kind="error" title="Compile failed" subtitle={compileError} />
            ) : null}

            {!loading && !compiling && compileSuccess ? (
                <InlineNotification lowContrast kind="success" title="Compiled" subtitle={compileSuccess} />
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <AiAssistButton context={{ page: 'Report Builder' }} size="sm" kind="secondary" />

            <Button size="sm" kind="secondary" renderIcon={Download} disabled>
              Export
            </Button>

            <Button size="sm" kind="secondary" onClick={handleCompile} disabled={!canCompile}>
              Compile
            </Button>

            <Button size="sm" kind="primary" renderIcon={Save} onClick={handleDraftSave} disabled={!canSave}>
              Save Draft
            </Button>
          </div>
        </div>

        <Tabs
            selectedIndex={tab === 'details' ? 0 : tab === 'definition' ? 1 : 2}
            onChange={({ selectedIndex }) =>
                setTab(selectedIndex === 0 ? 'details' : selectedIndex === 1 ? 'definition' : 'design')
            }
        >
          <TabList aria-label="Report editor tabs">
            <Tab>Report Details</Tab>
            <Tab>Report Definition</Tab>
            <Tab>Report Design</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <ReportDetail
                  value={detailModel}
                  onChange={handleDetailChange}
                  onSaveDraft={handleDraftSave}
                  isSaving={saving}
                  onCancel={handleCancel}
              />
            </TabPanel>

            <TabPanel>
              <ReportDefinitionEditor
                  value={definitionDraft}
                  onChange={handleDefinitionChange}
              />
            </TabPanel>

            <TabPanel>
              <ReportDesignEditor
                  value={designDraft}
                  onChange={handleDesignChange}
                  definitionDraft={definitionDraft}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>

        <div
            style={{
              marginTop: '1rem',
              padding: '0.9rem 1rem',
              background: '#fff',
              border: '1px solid var(--cds-border-subtle, #e0e0e0)',
              borderRadius: 12,
            }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Current Report Form</div>

          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.85rem' }}>
          {JSON.stringify(
              {
                uuid: form.uuid,
                name: form.name,
                description: form.description,
                code: form.code,
                definition: {
                  sections: form.sections,
                },
                design: form.design,
                mode,
                savedReportUuid: savedReport?.uuid ?? null,
              },
              null,
              2,
          )}
        </pre>
        </div>
      </>
  );
}
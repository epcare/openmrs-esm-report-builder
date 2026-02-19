import React from 'react';
import { Modal, Stack, InlineLoading, TextInput, TextArea, Select, SelectItem } from '@carbon/react';

import { listDataThemes, getDataTheme, type DataThemeDto } from '../../services/theme/data-theme.api';
import type { DataThemeConfig, ThemeCondition } from './types/data-theme-config.types';
import type { BaseIndicatorDraft, IndicatorCondition } from './types/indicator-types';

import ConceptSearchMultiSelect, { type SelectedConcept } from './handler/concept-search-multiselect.component';
import QuestionAnswerConceptSearch from './handler/question-answer-concept-search.component';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (draft: BaseIndicatorDraft) => void;
};

const DEMO_JOIN_TABLE = 'mamba_fact_patients_latest_patient_demographics';

function safeParse<T>(raw: string | undefined | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    const p = JSON.parse(raw);
    return (p ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function normalizeThemeConfig(rawConfigJson: string | undefined | null): DataThemeConfig {
  const base = safeParse<any>(rawConfigJson, {});
  if (base && typeof base === 'object' && base.configJson && typeof base.configJson === 'object') {
    return base.configJson as DataThemeConfig;
  }
  return base as DataThemeConfig;
}

function sqlQuote(v: string) {
  return `'${String(v).replace(/'/g, "''")}'`;
}

function buildSqlPreview(themeCfg: DataThemeConfig) {
  const src = themeCfg.sourceTable;
  const pid = themeCfg.patientIdColumn;
  const dateCol = themeCfg.dateColumn;

  const lines: string[] = [];
  lines.push(`SELECT`);
  lines.push(`  COUNT(*) AS total`);
  lines.push(`FROM ${src} a`);
  lines.push(`JOIN ${DEMO_JOIN_TABLE} mdp`);
  lines.push(`  ON mdp.patient_id = a.${pid}`);
  lines.push(`WHERE a.${dateCol} >= ':startDate'`);
  lines.push(`  AND a.${dateCol} <  ':endDate'`);
  lines.push(`  AND mdp.birthdate IS NOT NULL`);
  lines.push(`  AND mdp.gender IS NOT NULL`);
  lines.push(`;`);

  return lines.join('\n');
}

/** supports encoded QA(questionCol,answerCol) stored in tc.column */
function parseQaEncoded(col: string | undefined | null) {
  const raw = (col ?? '').trim();
  const m = /^QA\(([^,]+),([^)]+)\)$/.exec(raw);
  if (!m) return null;
  return { questionCol: m[1].trim(), answerCol: m[2].trim() };
}

function applyConditionClauses(baseSql: string, themeConditions: ThemeCondition[], picked: IndicatorCondition[]) {
  const sqlLines = baseSql.split('\n');

  const demoBirthIdx = sqlLines.findIndex((l) => l.includes('mdp.birthdate IS NOT NULL'));
  const insertAt = demoBirthIdx > -1 ? demoBirthIdx : sqlLines.length;

  const clauses: string[] = [];

  for (const tc of themeConditions ?? []) {
    const pc = picked.find((x) => x.key === tc.key);
    if (!pc) continue;

    const v = pc.value;
    if (v === null || v === undefined) continue;

    // ✅ NEW: question+answer handler
    if (tc.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH') {
      const qa = parseQaEncoded(tc.column);
      if (!qa) continue;

      const obj = v as any;
      const qVal = obj?.question;
      const aVals = obj?.answers;

      // question
      if (qVal !== null && qVal !== undefined && String(qVal).trim() !== '') {
        const qStr = String(qVal);
        const qIsNumeric = tc.valueType === 'conceptId' || /^[0-9]+$/.test(qStr);
        clauses.push(`  AND a.${qa.questionCol} = ${qIsNumeric ? qStr : sqlQuote(qStr)}`);
      }

      // answers
      if (Array.isArray(aVals) && aVals.length) {
        const arr = aVals
            .map((x: any) => String(x))
            .filter((x: string) => x.trim().length > 0);

        if (arr.length) {
          const isNumericList = tc.valueType === 'conceptId' || arr.every((x: string) => /^[0-9]+$/.test(x));
          const rendered = arr.map((x: string) => (isNumericList ? x : sqlQuote(x))).join(',');
          clauses.push(`  AND a.${qa.answerCol} IN (${rendered})`);
        }
      }

      continue;
    }

    // Existing: array/scalar clauses
    const op = pc.operator ?? tc.operator ?? 'IN';

    if (Array.isArray(v)) {
      const arr = v
          .map((x) => (typeof x === 'number' ? String(x) : String(x)))
          .filter((x) => x.trim().length > 0);

      if (!arr.length) continue;

      const isNumericList = tc.valueType === 'conceptId' || arr.every((x) => /^[0-9]+$/.test(x));
      const rendered = arr.map((x) => (isNumericList ? x : sqlQuote(x))).join(',');

      if (op === 'IN') clauses.push(`  AND a.${tc.column} IN (${rendered})`);
      else if (op === 'NOT_IN') clauses.push(`  AND a.${tc.column} NOT IN (${rendered})`);
      else clauses.push(`  AND a.${tc.column} ${op} (${rendered})`);
    } else if (typeof v === 'object') {
      // range types later
      continue;
    } else {
      const sval = typeof v === 'number' ? String(v) : String(v);
      const isNumeric = tc.valueType === 'conceptId' || /^[0-9]+$/.test(sval);
      const rendered = isNumeric ? sval : sqlQuote(sval);
      clauses.push(`  AND a.${tc.column} ${op} ${rendered}`);
    }
  }

  sqlLines.splice(insertAt, 0, ...clauses);
  return sqlLines.join('\n');
}

export default function CreateBaseIndicatorModal({ open, onClose, onSave }: Props) {
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [description, setDescription] = React.useState('');

  const [themes, setThemes] = React.useState<DataThemeDto[]>([]);
  const [loadingThemes, setLoadingThemes] = React.useState(false);
  const [themesError, setThemesError] = React.useState<string | null>(null);

  const [themeUuid, setThemeUuid] = React.useState('');
  const [themeConfig, setThemeConfig] = React.useState<DataThemeConfig | null>(null);
  const [themeConfigError, setThemeConfigError] = React.useState<string | null>(null);

  const [pickedConditions, setPickedConditions] = React.useState<IndicatorCondition[]>([]);

  // UI state for concept handlers
  const [conceptUi, setConceptUi] = React.useState<Record<string, SelectedConcept[]>>({});
  const [qaConceptUi, setQaConceptUi] = React.useState<Record<string, { question: SelectedConcept | null; answers: SelectedConcept[] }>>(
      {},
  );

  const [sqlPreview, setSqlPreview] = React.useState('');

  React.useEffect(() => {
    if (!open) return;

    setName('');
    setCode('');
    setDescription('');
    setThemeUuid('');
    setThemeConfig(null);
    setThemeConfigError(null);
    setPickedConditions([]);
    setConceptUi({});
    setQaConceptUi({});
    setSqlPreview('');

    const ac = new AbortController();
    setLoadingThemes(true);
    setThemesError(null);
    setThemes([]);

    listDataThemes(undefined, ac.signal)
        .then((data) => setThemes(data ?? []))
        .catch((e) => setThemesError(e?.message ?? 'Failed to load themes'))
        .finally(() => setLoadingThemes(false));

    return () => ac.abort();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    if (!themeUuid) {
      setThemeConfig(null);
      setThemeConfigError(null);
      setPickedConditions([]);
      setConceptUi({});
      setQaConceptUi({});
      setSqlPreview('');
      return;
    }

    const ac = new AbortController();
    setThemeConfigError(null);

    getDataTheme(themeUuid, ac.signal)
        .then((full) => {
          const cfg = normalizeThemeConfig(full.configJson);
          setThemeConfig(cfg);

          const normalized: IndicatorCondition[] = (cfg.conditions ?? []).map((c) => {
            // defaults for known handlers
            if (c.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH') {
              return {
                key: c.key,
                operator: c.operator,
                valueType: c.valueType,
                value: { question: null, answers: [] }, // ✅ object value
              } as any;
            }

            const defaultValue = c.operator === 'IN' || c.operator === 'NOT_IN' ? [] : '';
            return {
              key: c.key,
              operator: c.operator,
              valueType: c.valueType,
              value: defaultValue,
            } as IndicatorCondition;
          });

          setPickedConditions(normalized);

          // init UI maps
          const nextConceptUi: Record<string, SelectedConcept[]> = {};
          const nextQaUi: Record<string, { question: SelectedConcept | null; answers: SelectedConcept[] }> = {};

          for (const c of cfg.conditions ?? []) {
            if (c.handler === 'CONCEPT_SEARCH') nextConceptUi[c.key] = [];
            if (c.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH') nextQaUi[c.key] = { question: null, answers: [] };
          }

          setConceptUi(nextConceptUi);
          setQaConceptUi(nextQaUi);

          const base = buildSqlPreview(cfg);
          const finalSql = applyConditionClauses(base, cfg.conditions ?? [], normalized);
          setSqlPreview(finalSql);
        })
        .catch((e) => setThemeConfigError(e?.message ?? 'Failed to load theme config'));

    return () => ac.abort();
  }, [open, themeUuid]);

  React.useEffect(() => {
    if (!themeConfig) return;
    const base = buildSqlPreview(themeConfig);
    const finalSql = applyConditionClauses(base, themeConfig.conditions ?? [], pickedConditions);
    setSqlPreview(finalSql);
  }, [themeConfig, pickedConditions]);

  const canSave =
      Boolean(name.trim()) &&
      Boolean(themeUuid) &&
      Boolean(themeConfig?.sourceTable) &&
      Boolean(themeConfig?.patientIdColumn) &&
      Boolean(themeConfig?.dateColumn);

  const updatePicked = (key: string, patch: Partial<IndicatorCondition>) => {
    setPickedConditions((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  };

  const renderCondition = (tc: ThemeCondition) => {
    const picked = pickedConditions.find((x) => x.key === tc.key);

    if (tc.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH') {
      const ui = qaConceptUi[tc.key] ?? { question: null, answers: [] };

      return (
          <div key={tc.key}>
            <QuestionAnswerConceptSearch
                id={`cond-${tc.key}`}
                labelText={tc.label || tc.key}
                value={ui}
                onChange={(nextUi) => {
                  setQaConceptUi((prev) => ({ ...prev, [tc.key]: nextUi }));

                  // payload mapping
                  if (tc.valueType === 'conceptUuid') {
                    updatePicked(tc.key, {
                      value: {
                        question: nextUi.question?.uuid ?? null,
                        answers: (nextUi.answers ?? []).map((a) => a.uuid).filter(Boolean),
                      },
                    } as any);
                  } else {
                    // default conceptId
                    updatePicked(tc.key, {
                      value: {
                        question: nextUi.question?.id ? Number(nextUi.question.id) : null,
                        answers: (nextUi.answers ?? [])
                            .map((a) => Number(a.id))
                            .filter((n) => Number.isFinite(n) && n > 0),
                      },
                    } as any);
                  }
                }}
            />
          </div>
      );
    }

    if (tc.handler === 'CONCEPT_SEARCH') {
      const uiSelected = conceptUi[tc.key] ?? [];

      return (
          <div key={tc.key}>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{tc.label || tc.key}</div>

            <ConceptSearchMultiSelect
                id={`cond-${tc.key}`}
                labelText={tc.label || 'Select concepts'}
                value={uiSelected}
                onChange={(nextSelected) => {
                  setConceptUi((prev) => ({ ...prev, [tc.key]: nextSelected }));

                  if (tc.valueType === 'conceptUuid') {
                    const uuids = nextSelected.map((c) => c.uuid).filter(Boolean);
                    updatePicked(tc.key, { value: uuids });
                  } else {
                    const ids = nextSelected
                        .map((c) => Number(c.id))
                        .filter((n) => Number.isFinite(n) && n > 0);
                    updatePicked(tc.key, { value: ids });
                  }
                }}
            />
          </div>
      );
    }

    return (
        <div key={tc.key}>
          <TextInput
              id={`cond-${tc.key}`}
              labelText={tc.label || tc.key}
              value={typeof picked?.value === 'string' ? picked.value : ''}
              onChange={(e) => updatePicked(tc.key, { value: (e.target as HTMLInputElement).value })}
          />
        </div>
    );
  };

  const save = () => {
    if (!canSave || !themeConfig) return;

    const draft: BaseIndicatorDraft = {
      name: name.trim(),
      code: code.trim() || undefined,
      description: description.trim() || undefined,
      kind: 'BASE',
      themeUuid,
      themeConfig,
      conditions: pickedConditions,
      sqlPreview,
    };

    onSave(draft);
  };

  if (!open) return null;

  return (
      <Modal
          open={open}
          modalHeading="Create Base Indicator"
          primaryButtonText="Create"
          secondaryButtonText="Cancel"
          onRequestClose={onClose}
          onRequestSubmit={save}
          primaryButtonDisabled={!canSave}
          size="lg"
      >
        <Stack gap={6}>
          <TextInput id="indicator-name" labelText="Name" value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} />

          <TextInput id="indicator-code" labelText="Code (optional)" value={code} onChange={(e) => setCode((e.target as HTMLInputElement).value)} />

          <TextArea
              id="indicator-desc"
              labelText="Description (optional)"
              value={description}
              onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
          />

          <div>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Data Theme</div>

            {loadingThemes ? <InlineLoading description="Loading themes…" /> : null}
            {!loadingThemes && themesError ? <div style={{ color: 'var(--cds-text-error, #da1e28)' }}>{themesError}</div> : null}

            <Select id="indicator-theme" labelText="Select a theme" value={themeUuid} onChange={(e) => setThemeUuid((e.target as HTMLSelectElement).value)}>
              <SelectItem value="" text="Select…" />
              {(themes ?? []).map((t) => (
                  <SelectItem key={t.uuid} value={t.uuid} text={`${t.name}${t.code ? ` (${t.code})` : ''}`} />
              ))}
            </Select>

            {themeConfigError ? <div style={{ color: 'var(--cds-text-error, #da1e28)', marginTop: '0.5rem' }}>{themeConfigError}</div> : null}
          </div>

          {themeConfig?.conditions?.length ? (
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Conditions</div>
                <Stack gap={5}>{themeConfig.conditions.map(renderCondition)}</Stack>
              </div>
          ) : null}

          {sqlPreview ? (
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>SQL Preview</div>
                <pre
                    style={{
                      fontSize: '0.875rem',
                      background: 'var(--cds-layer-01)',
                      padding: '0.75rem',
                      borderRadius: 6,
                      overflowX: 'auto',
                    }}
                >
{sqlPreview}
            </pre>
              </div>
          ) : null}
        </Stack>
      </Modal>
  );
}
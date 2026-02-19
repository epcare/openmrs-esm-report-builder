import React from 'react';
import { Button, ComboBox, Select, SelectItem, Stack, TextInput } from '@carbon/react';
import { Add, TrashCan } from '@carbon/icons-react';

import type {
  DataThemeConfig,
  ThemeCondition,
  ConditionHandler,
  ConditionOperator,
  ConditionValueType,
} from '../../../types/theme/data-theme.types';

import type { TableColumn } from '../../../services/theme/mamba-table-meta.api';

type Props = {
  open: boolean;
  config: DataThemeConfig;
  onChange: (next: DataThemeConfig) => void;
  columns: TableColumn[];
  loadingCols?: boolean;
};

const HANDLERS: ConditionHandler[] = [
  'CONCEPT_SEARCH',
  'QUESTION_ANSWER_CONCEPT_SEARCH',
  'TEXT',
  'NUMBER',
  'DATE_RANGE',
  'BOOLEAN',
  'LOCATION_PICKER',
  'CODED_LIST',
];

const OPERATORS: ConditionOperator[] = ['EQUALS', 'IN', 'LIKE', 'BETWEEN', 'GTE', 'LTE'];

const VALUE_TYPES: ConditionValueType[] = ['conceptUuid',
  'conceptId',
  'string',
  'number',
  'date',
  'datetime',
  'boolean',
];

type ColumnMode = 'pick' | 'custom' | 'qa';

type UiConditionRow = ThemeCondition & {
  _id: string; // stable react key
  _columnMode: ColumnMode;

  // only used when _columnMode === 'qa'
  _qaQuestionCol?: string;
  _qaAnswerCol?: string;
};

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function safeString(x: any) {
  return typeof x === 'string' ? x : '';
}

/**
 * Encode a question+answer mapping into the single `column` string we persist.
 * This avoids changing backend DTOs now.
 */
function encodeQa(questionCol: string, answerCol: string) {
  const q = (questionCol ?? '').trim();
  const a = (answerCol ?? '').trim();
  if (!q || !a) return ''; // incomplete; let user finish
  return `QA(${q},${a})`;
}

/**
 * Detect encoded QA(...) stored in `column`
 */
function parseQaEncoded(col: string | undefined | null) {
  const raw = (col ?? '').trim();
  const m = /^QA\(([^,]+),([^)]+)\)$/.exec(raw);
  if (!m) return null;
  return { questionCol: m[1].trim(), answerCol: m[2].trim() };
}

function toRows(conds: ThemeCondition[] | undefined, columnNames: string[]): UiConditionRow[] {
  return (conds ?? []).map((c) => {
    // QA mode?
    const qa = parseQaEncoded(c.column);
    if (qa) {
      return {
        ...c,
        _id: makeId(),
        _columnMode: 'qa',
        _qaQuestionCol: qa.questionCol,
        _qaAnswerCol: qa.answerCol,
      };
    }

    // pick vs custom
    const inList = columnNames.includes(c.column);
    return {
      ...c,
      _id: makeId(),
      _columnMode: inList ? 'pick' : 'custom',
    };
  });
}

function stripRows(rows: UiConditionRow[]): ThemeCondition[] {
  return rows.map(({ _id, _columnMode, _qaQuestionCol, _qaAnswerCol, ...rest }) => rest);
}

function defaultRow(idx: number): UiConditionRow {
  return {
    _id: makeId(),
    _columnMode: 'pick',
    key: `cond_${idx + 1}`,
    label: '',
    handler: 'CONCEPT_SEARCH',
    column: '',
    operator: 'IN',
    valueType: 'conceptUuid',
  };
}

export default function DataThemeConditionsSection({ open, config, onChange, columns, loadingCols }: Props) {
  const columnNames = React.useMemo(
      () => (columns ?? []).map((c) => c?.name).filter(Boolean) as string[],
      [columns],
  );

  const baseColumnOptions = React.useMemo(() => {
    return columnNames.map((name) => ({ id: name, label: name }));
  }, [columnNames]);

  // Options for ComboBox (searchable)
  const columnOptions = React.useMemo(() => {
    // ✅ special items
    const specials = [
      { id: '__CUSTOM__', label: 'Custom expression…' },
      { id: '__QA__', label: 'Question + Answer…' },
    ];
    return [...specials, ...baseColumnOptions];
  }, [baseColumnOptions]);

  /**
   * IMPORTANT:
   * We only want to re-hydrate from `config.conditions` when it changes
   * from the OUTSIDE (e.g. edit load, theme switch).
   * If we re-hydrate after every keystroke, typing breaks (one char at a time)
   * and Add condition appears to fail (state resets).
   */
  const lastCommittedSerializedRef = React.useRef<string>('');

  const [rows, setRows] = React.useState<UiConditionRow[]>(() => toRows(config.conditions, columnNames));

  const commit = React.useCallback(
      (nextRows: UiConditionRow[]) => {
        setRows(nextRows);

        const stripped = stripRows(nextRows);
        const serialized = JSON.stringify(stripped ?? []);
        lastCommittedSerializedRef.current = serialized;

        onChange({ ...config, conditions: stripped });
      },
      [config, onChange],
  );

  // Re-hydrate when modal opens OR when config.conditions changes externally
  React.useEffect(() => {
    if (!open) return;

    const incoming = JSON.stringify(config.conditions ?? []);
    if (incoming === lastCommittedSerializedRef.current) return;

    // external update (edit load, switching theme, etc.)
    lastCommittedSerializedRef.current = incoming;
    setRows(toRows(config.conditions, columnNames));
  }, [open, config.conditions, columnNames]);

  // If columns change (user picked a different source table), adjust row modes safely
  React.useEffect(() => {
    if (!open) return;

    setRows((prev) =>
        (prev ?? []).map((r) => {
          if (r._columnMode === 'pick' && r.column && !columnNames.includes(r.column)) {
            return { ...r, _columnMode: 'custom' };
          }
          return r;
        }),
    );
  }, [open, columnNames]);

  const addRow = () => {
    commit([...(rows ?? []), defaultRow(rows.length)]);
  };

  const updateRow = (id: string, patch: Partial<UiConditionRow>) => {
    commit((rows ?? []).map((r) => (r._id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    commit((rows ?? []).filter((r) => r._id !== id));
  };

  const canEdit = open && !loadingCols;

  return (
      <div>
        <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Conditions</div>

        <div style={{ marginBottom: '0.75rem', opacity: 0.85, fontSize: '0.875rem' }}>
          Define filterable fields for this theme. <b>Column/Expr</b> should be a real column where possible; use custom
          only when needed.
        </div>

        {rows.length === 0 ? <div style={{ marginBottom: '0.75rem', opacity: 0.8 }}>No conditions yet.</div> : null}

        <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1.4fr 1.2fr 2fr 1fr 1.1fr auto',
              gap: '0.75rem',
            }}
        >
          <div style={{ fontWeight: 600 }}>Key</div>
          <div style={{ fontWeight: 600 }}>Label</div>
          <div style={{ fontWeight: 600 }}>Handler</div>
          <div style={{ fontWeight: 600 }}>Column/Expr</div>
          <div style={{ fontWeight: 600 }}>Operator</div>
          <div style={{ fontWeight: 600 }}>Value type</div>
          <div />

          {rows.map((r) => {
            const selectedItem =
                r._columnMode === 'custom'
                    ? columnOptions.find((x) => x.id === '__CUSTOM__') ?? null
                    : r._columnMode === 'qa'
                        ? columnOptions.find((x) => x.id === '__QA__') ?? null
                        : columnOptions.find((x) => x.id === r.column) ?? null;

            return (
                <React.Fragment key={r._id}>
                  <TextInput
                      id={`theme-cond-key-${r._id}`}
                      labelText=""
                      hideLabel
                      value={r.key}
                      disabled={!open}
                      placeholder="concept_id"
                      onChange={(e) => updateRow(r._id, { key: (e.target as HTMLInputElement).value })}
                  />

                  <TextInput
                      id={`theme-cond-label-${r._id}`}
                      labelText=""
                      hideLabel
                      value={r.label}
                      disabled={!open}
                      placeholder="Diagnosis concept"
                      onChange={(e) => updateRow(r._id, { label: (e.target as HTMLInputElement).value })}
                  />

                  <Select
                      id={`theme-cond-handler-${r._id}`}
                      labelText=""
                      hideLabel
                      value={r.handler}
                      disabled={!open}
                      onChange={(e) => {
                        const handler = (e.target as HTMLSelectElement).value as ConditionHandler;

                        const defaults: Partial<UiConditionRow> =
                            handler === 'CONCEPT_SEARCH'
                                ? { operator: 'IN', valueType: 'conceptUuid' }
                                : handler === 'NUMBER'
                                    ? { operator: 'EQUALS', valueType: 'number' }
                                    : handler === 'DATE_RANGE'
                                        ? { operator: 'BETWEEN', valueType: 'date' }
                                        : handler === 'BOOLEAN'
                                            ? { operator: 'EQUALS', valueType: 'boolean' }
                                            : { operator: 'EQUALS', valueType: 'string' };

                        updateRow(r._id, { handler, ...defaults });
                      }}
                  >
                    {HANDLERS.map((h) => (
                        <SelectItem key={h} value={h} text={h} />
                    ))}
                  </Select>

                  {/* ✅ Column/Expr as searchable dropdown + optional custom input OR QA fields */}
                  <div>
                    <ComboBox
                        id={`theme-cond-column-${r._id}`}
                        titleText=""
                        items={columnOptions as any}
                        disabled={!canEdit}
                        itemToString={(it) => (it ? (it as any).label : '')}
                        selectedItem={selectedItem as any}
                        placeholder={loadingCols ? 'Loading columns…' : 'Select column or choose custom…'}
                        onChange={(e: any) => {
                          const picked = e?.selectedItem as { id: string; label: string } | null;
                          if (!picked) return;

                          if (picked.id === '__CUSTOM__') {
                            updateRow(r._id, {
                              _columnMode: 'custom',
                              column: r.column && !columnNames.includes(r.column) ? r.column : '',
                              _qaQuestionCol: undefined,
                              _qaAnswerCol: undefined,
                            });
                            return;
                          }

                          if (picked.id === '__QA__') {
                            // switch to QA mode
                            const existing = parseQaEncoded(r.column);
                            updateRow(r._id, {
                              _columnMode: 'qa',
                              _qaQuestionCol: existing?.questionCol ?? '',
                              _qaAnswerCol: existing?.answerCol ?? '',
                              column: existing ? r.column : '',
                            });
                            return;
                          }

                          // normal pick mode
                          updateRow(r._id, {
                            _columnMode: 'pick',
                            column: picked.id,
                            _qaQuestionCol: undefined,
                            _qaAnswerCol: undefined,
                          });
                        }}
                    />

                    {r._columnMode === 'custom' ? (
                        <div style={{ marginTop: '0.5rem' }}>
                          <TextInput
                              id={`theme-cond-customexpr-${r._id}`}
                              labelText="Custom expression"
                              value={safeString(r.column)}
                              disabled={!open}
                              placeholder="e.g. COALESCE(diagnosis_coded, diagnosis_non_coded)"
                              onChange={(e) => updateRow(r._id, { column: (e.target as HTMLInputElement).value })}
                          />
                        </div>
                    ) : null}

                    {r._columnMode === 'qa' ? (
                        <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <Select
                              id={`theme-cond-qa-question-${r._id}`}
                              labelText="Question column"
                              value={r._qaQuestionCol ?? ''}
                              disabled={!open || !columnNames.length}
                              onChange={(e) => {
                                const q = (e.target as HTMLSelectElement).value;
                                const a = r._qaAnswerCol ?? '';
                                updateRow(r._id, {
                                  _qaQuestionCol: q,
                                  column: encodeQa(q, a),
                                });
                              }}
                          >
                            <SelectItem value="" text="Select…" />
                            {columnNames.map((c) => (
                                <SelectItem key={c} value={c} text={c} />
                            ))}
                          </Select>

                          <Select
                              id={`theme-cond-qa-answer-${r._id}`}
                              labelText="Answer column"
                              value={r._qaAnswerCol ?? ''}
                              disabled={!open || !columnNames.length}
                              onChange={(e) => {
                                const a = (e.target as HTMLSelectElement).value;
                                const q = r._qaQuestionCol ?? '';
                                updateRow(r._id, {
                                  _qaAnswerCol: a,
                                  column: encodeQa(q, a),
                                });
                              }}
                          >
                            <SelectItem value="" text="Select…" />
                            {columnNames.map((c) => (
                                <SelectItem key={c} value={c} text={c} />
                            ))}
                          </Select>
                        </div>
                    ) : null}
                  </div>

                  <Select
                      id={`theme-cond-operator-${r._id}`}
                      labelText=""
                      hideLabel
                      value={r.operator}
                      disabled={!open}
                      onChange={(e) =>
                          updateRow(r._id, { operator: (e.target as HTMLSelectElement).value as ConditionOperator })
                      }
                  >
                    {OPERATORS.map((op) => (
                        <SelectItem key={op} value={op} text={op} />
                    ))}
                  </Select>

                  <Select
                      id={`theme-cond-valuetype-${r._id}`}
                      labelText=""
                      hideLabel
                      value={r.valueType}
                      disabled={!open}
                      onChange={(e) =>
                          updateRow(r._id, { valueType: (e.target as HTMLSelectElement).value as ConditionValueType })
                      }
                  >
                    {VALUE_TYPES.map((vt) => (
                        <SelectItem key={vt} value={vt} text={vt} />
                    ))}
                  </Select>

                  <Button
                      kind="ghost"
                      size="sm"
                      hasIconOnly
                      iconDescription="Remove condition"
                      renderIcon={TrashCan}
                      disabled={!open}
                      onClick={() => removeRow(r._id)}
                  />
                </React.Fragment>
            );
          })}
        </div>

        <Stack orientation="horizontal" gap={3} style={{ marginTop: '1rem' }}>
          <Button kind="secondary" size="sm" renderIcon={Add} onClick={addRow} disabled={!open}>
            Add condition
          </Button>
        </Stack>
      </div>
  );
}
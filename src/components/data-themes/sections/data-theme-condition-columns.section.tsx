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

import { THEME_OPERATOR_OPTIONS } from '../../../types/condition-operators';

import type { TableColumn } from '../../../resources/theme/mamba-table-meta.api';

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

const OPERATORS: ConditionOperator[] = THEME_OPERATOR_OPTIONS as unknown as ConditionOperator[];

const VALUE_TYPES: ConditionValueType[] = [
  'conceptUuid',
  'conceptId',
  'string',
  'number',
  'date',
  'datetime',
  'boolean',
];

type ColumnMode = 'pick' | 'custom' | 'qa';

type UiConditionRow = ThemeCondition & {
  _id: string;
  _columnMode: ColumnMode;
  _qaQuestionCol?: string;
  _qaAnswerCol?: string;
};

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function encodeQa(questionCol: string, answerCol: string) {
  const q = (questionCol ?? '').trim();
  const a = (answerCol ?? '').trim();
  if (!q || !a) return '';
  return `QA(${q},${a})`;
}

function parseQaEncoded(col: string | undefined | null) {
  const raw = (col ?? '').trim();
  const m = /^QA\(([^,]+),([^)]+)\)$/.exec(raw);
  if (!m) return null;
  return { questionCol: m[1].trim(), answerCol: m[2].trim() };
}

function toRows(conds: ThemeCondition[] | undefined, columnNames: string[]): UiConditionRow[] {
  return (conds ?? []).map((c) => {
    const qa = parseQaEncoded(c.column);
    if (qa) {
      return { ...c, _id: makeId(), _columnMode: 'qa', _qaQuestionCol: qa.questionCol, _qaAnswerCol: qa.answerCol };
    }

    if (c.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH') {
      return { ...c, _id: makeId(), _columnMode: 'qa', _qaQuestionCol: '', _qaAnswerCol: '' };
    }

    const inList = columnNames.includes(c.column);
    return { ...c, _id: makeId(), _columnMode: inList ? 'pick' : 'custom' };
  });
}

function stripRows(rows: UiConditionRow[]): ThemeCondition[] {
  return rows.map((row) => {
    const rest = { ...row };
    delete rest._id;
    delete rest._columnMode;
    delete rest._qaQuestionCol;
    delete rest._qaAnswerCol;
    return rest;
  });
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

  const baseColumnOptions = React.useMemo(() => columnNames.map((name) => ({ id: name, label: name })), [columnNames]);

  const columnOptions = React.useMemo(() => {
    const specials = [
      { id: '__CUSTOM__', label: 'Custom expression…' },
      { id: '__QA__', label: 'Question + Answer…' },
    ];
    return [...specials, ...baseColumnOptions];
  }, [baseColumnOptions]);

  const qaColumnOptions = React.useMemo(() => baseColumnOptions, [baseColumnOptions]);

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

  React.useEffect(() => {
    if (!open) return;
    const incoming = JSON.stringify(config.conditions ?? []);
    if (incoming === lastCommittedSerializedRef.current) return;
    lastCommittedSerializedRef.current = incoming;
    setRows(toRows(config.conditions, columnNames));
  }, [open, config.conditions, columnNames]);

  React.useEffect(() => {
    if (!open) return;
    setRows((prev) =>
      (prev ?? []).map((r) => {
        if (r.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH') {
          const q = r._qaQuestionCol ?? '';
          const a = r._qaAnswerCol ?? '';
          return {
            ...r,
            _columnMode: 'qa',
            column: encodeQa(q, a),
          };
        }

        if (r._columnMode === 'pick' && r.column && !columnNames.includes(r.column)) {
          return { ...r, _columnMode: 'custom' };
        }
        return r;
      }),
    );
  }, [open, columnNames]);

  const addRow = () => commit([...(rows ?? []), defaultRow(rows.length)]);
  const updateRow = (id: string, patch: Partial<UiConditionRow>) =>
    commit((rows ?? []).map((r) => (r._id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) => commit((rows ?? []).filter((r) => r._id !== id));

  const canEdit = open && !loadingCols;

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Conditions</div>

      <div style={{ marginBottom: '0.75rem', opacity: 0.85, fontSize: '0.875rem' }}>
        Define filterable fields for this theme. <b>Column/Expr</b> should be a real column where possible; use custom only when needed.
      </div>

      {rows.length === 0 ? <div style={{ marginBottom: '0.75rem', opacity: 0.8 }}>No conditions yet.</div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 1.2fr 2fr 1fr 1.1fr auto', gap: '0.75rem' }}>
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

          const selectedQuestionItem =
            qaColumnOptions.find((x) => x.id === (r._qaQuestionCol ?? '')) ?? null;

          const selectedAnswerItem =
            qaColumnOptions.find((x) => x.id === (r._qaAnswerCol ?? '')) ?? null;

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
                placeholder="Diagnosis"
                onChange={(e) => updateRow(r._id, { label: (e.target as HTMLInputElement).value })}
              />

              <Select
                id={`theme-cond-handler-${r._id}`}
                labelText=""
                hideLabel
                value={r.handler}
                disabled={!canEdit}
                onChange={(e) => {
                  const nextHandler = (e.target as HTMLSelectElement).value as ConditionHandler;

                  if (nextHandler === 'QUESTION_ANSWER_CONCEPT_SEARCH') {
                    updateRow(r._id, {
                      handler: nextHandler,
                      _columnMode: 'qa',
                      column: encodeQa(r._qaQuestionCol ?? '', r._qaAnswerCol ?? ''),
                    });
                    return;
                  }

                  updateRow(r._id, {
                    handler: nextHandler,
                    _columnMode: r._columnMode === 'qa' ? 'pick' : r._columnMode,
                    column: r._columnMode === 'qa' ? '' : r.column,
                  });
                }}
              >
                {HANDLERS.map((h) => (
                  <SelectItem key={h} value={h} text={h} />
                ))}
              </Select>

              <div>
                <ComboBox
                  id={`theme-cond-col-${r._id}`}
                  titleText=""
                  items={columnOptions}
                  itemToString={(it) => (it ? it.label : '')}
                  selectedItem={selectedItem}
                  disabled={!canEdit || r.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH'}
                  onChange={({ selectedItem }) => {
                    const id = selectedItem?.id;

                    if (id === '__CUSTOM__') {
                      updateRow(r._id, { _columnMode: 'custom', column: '' });
                      return;
                    }
                    if (id === '__QA__') {
                      updateRow(r._id, { _columnMode: 'qa', column: encodeQa(r._qaQuestionCol ?? '', r._qaAnswerCol ?? '') });
                      return;
                    }
                    if (typeof id === 'string' && id) {
                      updateRow(r._id, { _columnMode: 'pick', column: id });
                    }
                  }}
                />

                {r._columnMode === 'custom' && r.handler !== 'QUESTION_ANSWER_CONCEPT_SEARCH' ? (
                  <TextInput
                    id={`theme-cond-col-custom-${r._id}`}
                    labelText=""
                    hideLabel
                    value={r.column}
                    disabled={!canEdit}
                    placeholder="a.some_column"
                    onChange={(e) => updateRow(r._id, { column: (e.target as HTMLInputElement).value })}
                    style={{ marginTop: '0.5rem' }}
                  />
                ) : null}

                {r._columnMode === 'qa' || r.handler === 'QUESTION_ANSWER_CONCEPT_SEARCH' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <ComboBox
                      id={`theme-cond-qa-q-${r._id}`}
                      titleText=""
                      items={qaColumnOptions}
                      itemToString={(it) => (it ? it.label : '')}
                      selectedItem={selectedQuestionItem}
                      disabled={!canEdit}
                      placeholder="Question column"
                      onChange={({ selectedItem }) => {
                        const q = selectedItem?.id ?? '';
                        const a = r._qaAnswerCol ?? '';
                        updateRow(r._id, {
                          _qaQuestionCol: q,
                          _columnMode: 'qa',
                          column: encodeQa(String(q), a),
                        });
                      }}
                    />
                    <ComboBox
                      id={`theme-cond-qa-a-${r._id}`}
                      titleText=""
                      items={qaColumnOptions}
                      itemToString={(it) => (it ? it.label : '')}
                      selectedItem={selectedAnswerItem}
                      disabled={!canEdit}
                      placeholder="Answer column"
                      onChange={({ selectedItem }) => {
                        const a = selectedItem?.id ?? '';
                        const q = r._qaQuestionCol ?? '';
                        updateRow(r._id, {
                          _qaAnswerCol: a,
                          _columnMode: 'qa',
                          column: encodeQa(q, String(a)),
                        });
                      }}
                    />
                  </div>
                ) : null}
              </div>

              <Select
                id={`theme-cond-op-${r._id}`}
                labelText=""
                hideLabel
                value={r.operator}
                disabled={!canEdit}
                onChange={(e) => updateRow(r._id, { operator: (e.target as HTMLSelectElement).value as ConditionOperator })}
              >
                {OPERATORS.map((op) => (
                  <SelectItem key={op} value={op} text={op} />
                ))}
              </Select>

              <Select
                id={`theme-cond-vt-${r._id}`}
                labelText=""
                hideLabel
                value={r.valueType}
                disabled={!canEdit}
                onChange={(e) => updateRow(r._id, { valueType: (e.target as HTMLSelectElement).value as ConditionValueType })}
              >
                {VALUE_TYPES.map((vt) => (
                  <SelectItem key={vt} value={vt} text={vt} />
                ))}
              </Select>

              <Button
                kind="ghost"
                size="sm"
                renderIcon={TrashCan}
                iconDescription="Remove condition"
                disabled={!canEdit}
                onClick={() => removeRow(r._id)}
              />
            </React.Fragment>
          );
        })}
      </div>

      <Stack orientation="horizontal" gap={3} style={{ marginTop: '0.75rem' }}>
        <Button kind="secondary" size="sm" renderIcon={Add} disabled={!canEdit} onClick={addRow}>
          Add condition
        </Button>
      </Stack>
    </div>
  );
}
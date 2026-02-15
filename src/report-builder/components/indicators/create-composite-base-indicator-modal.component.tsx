import React from 'react';
import {
    Modal,
    Stack,
    TextInput,
    TextArea,
    Select,
    SelectItem,
    RadioButtonGroup,
    RadioButton,
    Button,
    InlineNotification,
} from '@carbon/react';
import { Information } from '@carbon/icons-react';

export type CompositeOperator = 'AND' | 'OR' | 'A_AND_NOT_B';

/**
 * ✅ Base indicator option to pick from.
 * - `unit` is used for compatibility (Patients vs Encounters).
 * - `populationSqlTemplate` is OPTIONAL but enables us to generate composite SQL.
 *   It should return a set of IDs (patient_id or encounter_id), e.g.:
 *     SELECT DISTINCT a.patient_id ... WHERE ...
 */
export type BaseIndicatorOption = {
    id: string;
    code: string;
    name: string;
    unit?: 'Patients' | 'Encounters';
    populationSqlTemplate?: string;
};

export type CreateCompositeBaseIndicatorPayload = {
    code: string;
    name: string;
    description: string;

    // We keep IDs because your current flow uses IDs.
    // Prefer persisting codes in backend later, but we keep this as-is for now.
    indicatorAId: string;
    indicatorBId: string;

    operator: CompositeOperator;

    // ✅ extras (safe to ignore by caller for now)
    unit?: 'Patients' | 'Encounters';
    sqlTemplate?: string;
};

type Props = {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CreateCompositeBaseIndicatorPayload) => void;

    /** Base indicators to pick from (caller can pre-filter compatible ones) */
    baseIndicators: BaseIndicatorOption[];

    /** Optional: computed preview count (wire later) */
    previewCount?: number | null;
    onPreview?: (data: Omit<CreateCompositeBaseIndicatorPayload, 'code' | 'name' | 'description'>) => void;
};

const toCode = (name: string) =>
    name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 20);

const labelFor = (x: BaseIndicatorOption) => {
    const unit = x.unit ? ` • ${x.unit}` : '';
    return `${x.name} (${x.code})${unit}`;
};

function idFieldForUnit(unit: 'Patients' | 'Encounters') {
    return unit === 'Encounters' ? 'encounter_id' : 'patient_id';
}

/**
 * Build composite COUNT SQL from two population queries.
 * - populationSqlTemplate should return a column matching `idField` (patient_id or encounter_id).
 */
function buildCompositeCountSql(args: {
    unit: 'Patients' | 'Encounters';
    operator: CompositeOperator;
    populationSqlA: string;
    populationSqlB: string;
}) {
    const idField = idFieldForUnit(args.unit);

    const A = args.populationSqlA.trim().replace(/;+\s*$/, '');
    const B = args.populationSqlB.trim().replace(/;+\s*$/, '');

    // NOTE: We assume A and B already return DISTINCT ids.
    // If not, union/join still works, but may produce duplicates before final count.
    if (args.operator === 'AND') {
        return `
WITH
A AS (${A}),
B AS (${B})
SELECT COUNT(*) AS total
FROM (
  SELECT A.${idField}
  FROM A
  INNER JOIN B ON B.${idField} = A.${idField}
) X;
`.trim();
    }

    if (args.operator === 'OR') {
        return `
WITH
A AS (${A}),
B AS (${B})
SELECT COUNT(*) AS total
FROM (
  SELECT ${idField} FROM A
  UNION
  SELECT ${idField} FROM B
) X;
`.trim();
    }

    // A_AND_NOT_B
    return `
WITH
A AS (${A}),
B AS (${B})
SELECT COUNT(*) AS total
FROM (
  SELECT A.${idField}
  FROM A
  LEFT JOIN B ON B.${idField} = A.${idField}
  WHERE B.${idField} IS NULL
) X;
`.trim();
}

const CreateCompositeBaseIndicatorModal: React.FC<Props> = ({
                                                                open,
                                                                onClose,
                                                                onSubmit,
                                                                baseIndicators,
                                                                previewCount = null,
                                                                onPreview,
                                                            }) => {
    const firstId = baseIndicators[0]?.id ?? '';
    const secondId = baseIndicators[1]?.id ?? baseIndicators[0]?.id ?? '';

    const [name, setName] = React.useState('New composite indicator');
    const [code, setCode] = React.useState('');
    const [description, setDescription] = React.useState('');

    const [indicatorAId, setIndicatorAId] = React.useState(firstId);
    const [indicatorBId, setIndicatorBId] = React.useState(secondId);
    const [operator, setOperator] = React.useState<CompositeOperator>('AND');

    // Reset defaults when opened (nice UX)
    React.useEffect(() => {
        if (!open) return;
        setName('New composite indicator');
        setCode('');
        setDescription('');
        setIndicatorAId(firstId);
        setIndicatorBId(secondId);
        setOperator('AND');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const A = React.useMemo(() => baseIndicators.find((x) => x.id === indicatorAId) ?? null, [baseIndicators, indicatorAId]);
    const B = React.useMemo(() => baseIndicators.find((x) => x.id === indicatorBId) ?? null, [baseIndicators, indicatorBId]);

    const samePick = Boolean(indicatorAId && indicatorBId && indicatorAId === indicatorBId);

    const inferredUnit: 'Patients' | 'Encounters' | null = React.useMemo(() => {
        // If both have units and they match, use that.
        if (A?.unit && B?.unit) return A.unit === B.unit ? A.unit : null;
        // If only one has unit, use it (caller should ideally pass compatible indicators).
        if (A?.unit) return A.unit;
        if (B?.unit) return B.unit;
        return null;
    }, [A?.unit, B?.unit]);

    const unitMismatch = Boolean(A?.unit && B?.unit && A.unit !== B.unit);

    const canSubmit = Boolean(name.trim()) && Boolean(indicatorAId) && Boolean(indicatorBId) && !samePick && !unitMismatch;

    const submit = () => {
        const finalCode = code.trim() ? code.trim().toUpperCase() : toCode(name);

        // If we have population SQL for both, generate a composite SQL template now.
        let sqlTemplate: string | undefined = undefined;
        if (inferredUnit && A?.populationSqlTemplate && B?.populationSqlTemplate) {
            sqlTemplate = buildCompositeCountSql({
                unit: inferredUnit,
                operator,
                populationSqlA: A.populationSqlTemplate,
                populationSqlB: B.populationSqlTemplate,
            });
        }

        onSubmit({
            code: finalCode,
            name: name.trim(),
            description: description.trim(),
            indicatorAId,
            indicatorBId,
            operator,
            unit: inferredUnit ?? undefined,
            sqlTemplate,
        });
    };

    const requestPreview = () => {
        onPreview?.({
            indicatorAId,
            indicatorBId,
            operator,
            unit: inferredUnit ?? undefined,
            sqlTemplate:
                inferredUnit && A?.populationSqlTemplate && B?.populationSqlTemplate
                    ? buildCompositeCountSql({
                        unit: inferredUnit,
                        operator,
                        populationSqlA: A.populationSqlTemplate,
                        populationSqlB: B.populationSqlTemplate,
                    })
                    : undefined,
        });
    };

    return (
        <Modal
            open={open}
            onRequestClose={onClose}
            modalHeading="Create Composite Base Indicator"
            primaryButtonText="Save Indicator"
            secondaryButtonText="Cancel"
            onRequestSubmit={submit}
            primaryButtonDisabled={!canSubmit}
        >
            <Stack gap={5}>
                <div style={{ opacity: 0.8 }}>
                    Combine existing base indicators with logical conditions to define reusable, testable logic.
                </div>

                {samePick ? (
                    <InlineNotification
                        kind="error"
                        lowContrast
                        title="Pick two different indicators"
                        subtitle="Indicator A and Indicator B cannot be the same."
                    />
                ) : null}

                {unitMismatch ? (
                    <InlineNotification
                        kind="error"
                        lowContrast
                        title="Incompatible counting units"
                        subtitle={`Indicator A is "${A?.unit}" but Indicator B is "${B?.unit}". Composite indicators require matching units.`}
                    />
                ) : null}

                <TextInput
                    id="composite-name"
                    labelText="Indicator Name"
                    value={name}
                    onChange={(e) => setName((e.target as HTMLInputElement).value)}
                />

                <TextInput
                    id="composite-code"
                    labelText="Code"
                    helperText="Short unique code used in reports (e.g. PREG_AND_MAL)"
                    value={code}
                    onChange={(e) => setCode((e.target as HTMLInputElement).value)}
                    placeholder="Auto-generated if blank"
                />

                <TextArea
                    id="composite-description"
                    labelText="Description"
                    value={description}
                    onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
                />

                <hr style={{ border: 0, borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)' }} />

                <div style={{ fontWeight: 600 }}>Select Indicators</div>

                {/* A + Logic + B row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'end' }}>
                    <Select
                        id="indicator-a"
                        labelText="Indicator A"
                        value={indicatorAId}
                        onChange={(e) => setIndicatorAId((e.target as HTMLSelectElement).value)}
                    >
                        {baseIndicators.map((x) => (
                            <SelectItem key={x.id} value={x.id} text={labelFor(x)} />
                        ))}
                    </Select>

                    <div style={{ paddingBottom: '0.35rem' }}>
                        <div style={{ fontSize: '0.875rem', opacity: 0.75, marginBottom: '0.25rem', textAlign: 'center' }}>
                            Logic
                        </div>
                        <div
                            style={{
                                minWidth: '4.5rem',
                                textAlign: 'center',
                                padding: '0.55rem 0.75rem',
                                borderRadius: '0.25rem',
                                background: 'var(--cds-layer, #ffffff)',
                                border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                                fontWeight: 600,
                            }}
                            aria-label="Selected operator"
                        >
                            {operator === 'A_AND_NOT_B' ? 'A AND NOT B' : operator}
                        </div>
                    </div>

                    <Select
                        id="indicator-b"
                        labelText="Indicator B"
                        value={indicatorBId}
                        onChange={(e) => setIndicatorBId((e.target as HTMLSelectElement).value)}
                    >
                        {baseIndicators.map((x) => (
                            <SelectItem key={x.id} value={x.id} text={labelFor(x)} />
                        ))}
                    </Select>
                </div>

                {/* Operator row */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr',
                        gap: '0.75rem',
                        alignItems: 'center',
                        padding: '0.75rem',
                        borderRadius: '0.25rem',
                        background: 'var(--cds-layer-accent, #f4f4f4)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                        Operator <Information size={16} />
                    </div>

                    <RadioButtonGroup
                        legendText=""
                        name="composite-operator"
                        valueSelected={operator}
                        onChange={(val) => setOperator(val as CompositeOperator)}
                        orientation="horizontal"
                    >
                        <RadioButton id="op-and" labelText="AND" value="AND" />
                        <RadioButton id="op-or" labelText="OR" value="OR" />
                        <RadioButton id="op-a-not-b" labelText="A AND NOT B" value="A_AND_NOT_B" />
                    </RadioButtonGroup>

                    <div style={{ gridColumn: '1 / -1', fontSize: '0.875rem', opacity: 0.8 }}>
                        Tip: For best results, only combine base indicators with the same counting unit (Patients vs Encounters).
                    </div>
                </div>

                {/* Preview Count footer row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div style={{ fontWeight: 600 }}>
                        Preview Count{inferredUnit ? <span style={{ opacity: 0.75 }}> • {inferredUnit}</span> : null}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {onPreview ? (
                            <Button size="sm" kind="secondary" onClick={requestPreview} disabled={samePick || unitMismatch}>
                                Preview
                            </Button>
                        ) : null}

                        <div
                            style={{
                                minWidth: '9rem',
                                textAlign: 'center',
                                padding: '0.55rem 0.75rem',
                                borderRadius: '0.25rem',
                                background: 'var(--cds-layer, #ffffff)',
                                border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                                fontWeight: 600,
                            }}
                        >
                            Result: {previewCount ?? '—'}
                        </div>
                    </div>
                </div>

                {/* Optional: show generated SQL if available (helps debugging & lock-in) */}
                {inferredUnit && A?.populationSqlTemplate && B?.populationSqlTemplate ? (
                    <TextArea
                        id="composite-sql-preview"
                        labelText="Generated SQL (composite count)"
                        value={buildCompositeCountSql({
                            unit: inferredUnit,
                            operator,
                            populationSqlA: A.populationSqlTemplate,
                            populationSqlB: B.populationSqlTemplate,
                        })}
                        readOnly
                    />
                ) : (
                    <div style={{ fontSize: '0.875rem', opacity: 0.75 }}>
                        SQL preview will appear once base indicators provide <code>populationSqlTemplate</code> (patient_id / encounter_id set query).
                    </div>
                )}
            </Stack>
        </Modal>
    );
};

export default CreateCompositeBaseIndicatorModal;
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
} from '@carbon/react';
import { Information } from '@carbon/icons-react';

export type BaseIndicatorOption = {
    id: string;
    code: string;
    name: string;
};

export type CompositeOperator = 'AND' | 'OR' | 'A_AND_NOT_B';

export type CreateCompositeBaseIndicatorPayload = {
    code: string;
    name: string;
    description: string;
    indicatorAId: string;
    indicatorBId: string;
    operator: CompositeOperator;
};

type Props = {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CreateCompositeBaseIndicatorPayload) => void;

    /** Base indicators to pick from (compatible ones should be pre-filtered by caller for now) */
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

const labelFor = (x: BaseIndicatorOption) => `${x.name} (${x.code})`;

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

    const canSubmit = Boolean(name.trim()) && Boolean(indicatorAId) && Boolean(indicatorBId);

    const submit = () => {
        const finalCode = code.trim() ? code.trim().toUpperCase() : toCode(name);
        onSubmit({
            code: finalCode,
            name: name.trim(),
            description: description.trim(),
            indicatorAId,
            indicatorBId,
            operator,
        });
    };

    const requestPreview = () => {
        onPreview?.({
            indicatorAId,
            indicatorBId,
            operator,
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
                    Combine existing indicators with logical conditions to define reusable, testable logic.
                </div>

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

                {/* A + B row */}
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
                        * Only compatible base indicators are shown.
                    </div>
                </div>

                {/* Preview Count footer row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div style={{ fontWeight: 600 }}>Preview Count</div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {onPreview ? (
                            <Button size="sm" kind="secondary" onClick={requestPreview}>
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
            </Stack>
        </Modal>
    );
};

export default CreateCompositeBaseIndicatorModal;
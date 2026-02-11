import React from 'react';
import {
    Modal,
    Select,
    SelectItem,
    TextArea,
    TextInput,
    RadioButtonGroup,
    RadioButton,
    Stack,
} from '@carbon/react';

export type CreateBaseIndicatorPayload = {
    code: string; // ✅ NEW
    theme: string;
    indicatorName: string;
    description: string;
    condition: string;
    pregnancyStatus: string;
    countBy: 'Patients' | 'Encounters';
};

type Props = {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: CreateBaseIndicatorPayload) => void;
};

const toCode = (name: string) =>
    name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 20);

const CreateBaseIndicatorModal: React.FC<Props> = ({ open, onClose, onSubmit }) => {
    const [state, setState] = React.useState<CreateBaseIndicatorPayload>({
        code: '',
        theme: 'Diagnosis Data',
        indicatorName: '',
        description: '',
        condition: 'Malaria',
        pregnancyStatus: 'Pregnant',
        countBy: 'Patients',
    });

    const submit = () => {
        const code = state.code.trim() ? state.code.trim().toUpperCase() : toCode(state.indicatorName);
        onSubmit({ ...state, code });
    };

    return (
        <Modal
            open={open}
            modalHeading="Create Base Indicator"
            primaryButtonText="Next"
            secondaryButtonText="Cancel"
            onRequestClose={onClose}
            onRequestSubmit={submit}
        >
            <Stack gap={5}>
                <Select
                    id="theme"
                    labelText="Theme"
                    value={state.theme}
                    onChange={(e) => setState((p) => ({ ...p, theme: (e.target as HTMLSelectElement).value }))}
                >
                    {['Diagnosis Data', 'Observations', 'Medications', 'Laboratory'].map((x) => (
                        <SelectItem key={x} value={x} text={x} />
                    ))}
                </Select>

                {/* ✅ NEW: Code */}
                <TextInput
                    id="code"
                    labelText="Code"
                    helperText="Short unique code used in reports (e.g. MAL_PREG)"
                    value={state.code}
                    onChange={(e) => setState((p) => ({ ...p, code: (e.target as HTMLInputElement).value }))}
                    placeholder="e.g. MAL_PREG"
                />

                <TextInput
                    id="name"
                    labelText="Indicator"
                    value={state.indicatorName}
                    onChange={(e) => setState((p) => ({ ...p, indicatorName: (e.target as HTMLInputElement).value }))}
                />

                <TextArea
                    id="desc"
                    labelText="Description"
                    value={state.description}
                    onChange={(e) => setState((p) => ({ ...p, description: (e.target as HTMLTextAreaElement).value }))}
                />

                <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Criteria</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <Select
                            id="condition"
                            labelText="Condition"
                            value={state.condition}
                            onChange={(e) => setState((p) => ({ ...p, condition: (e.target as HTMLSelectElement).value }))}
                        >
                            {['Malaria', 'HIV', 'TB'].map((x) => (
                                <SelectItem key={x} value={x} text={x} />
                            ))}
                        </Select>

                        <Select
                            id="preg"
                            labelText="Pregnancy Status"
                            value={state.pregnancyStatus}
                            onChange={(e) => setState((p) => ({ ...p, pregnancyStatus: (e.target as HTMLSelectElement).value }))}
                        >
                            {['Pregnant', 'Not pregnant'].map((x) => (
                                <SelectItem key={x} value={x} text={x} />
                            ))}
                        </Select>
                    </div>
                </div>

                <RadioButtonGroup
                    legendText="Count By"
                    name="countBy"
                    valueSelected={state.countBy}
                    onChange={(val) => setState((p) => ({ ...p, countBy: val as any }))}
                >
                    <RadioButton id="cb-patients" labelText="Patients" value="Patients" />
                    <RadioButton id="cb-encounters" labelText="Encounters" value="Encounters" />
                </RadioButtonGroup>
            </Stack>
        </Modal>
    );
};

export default CreateBaseIndicatorModal;
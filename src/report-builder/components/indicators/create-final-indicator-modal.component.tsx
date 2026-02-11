import React from 'react';
import { Modal, Select, SelectItem, Stack } from '@carbon/react';
import DisaggregationPanel, { DisaggregationState } from './disaggregation-panel.component';
import PreviewTable, { PreviewRow } from './preview-table.component';

type Props = {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: { baseIndicatorId: string; disaggregation: DisaggregationState }) => void;
};

const mockPreview: PreviewRow[] = [
    { category: 'Female 15-24', count: 38 },
    { category: 'Female 25+', count: 7 },
];

const CreateFinalIndicatorModal: React.FC<Props> = ({ open, onClose, onSubmit }) => {
    const [baseIndicatorId, setBaseIndicatorId] = React.useState('pregnant-women-malaria');
    const [disagg, setDisagg] = React.useState<DisaggregationState>({
        gender: { enabled: true, male: false, female: true },
        ageGroups: { enabled: true, g0_4: true, g5_14: true, g15_24: false, g25plus: true },
    });

    return (
        <Modal
            open={open}
            modalHeading="Create Final Indicator"
            primaryButtonText="Save Indicator"
            secondaryButtonText="Cancel"
            onRequestClose={onClose}
            onRequestSubmit={() => onSubmit({ baseIndicatorId, disaggregation: disagg })}
        >
            <Stack gap={5}>
                <Select
                    id="base-indicator"
                    labelText="Base Indicator"
                    value={baseIndicatorId}
                    onChange={(e) => setBaseIndicatorId((e.target as HTMLSelectElement).value)}
                >
                    <SelectItem value="pregnant-women-malaria" text="Pregnant Women with Malaria" />
                    <SelectItem value="hiv-art" text="HIV Patients on ART" />
                </Select>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                    <DisaggregationPanel value={disagg} onChange={setDisagg} />
                    <PreviewTable rows={mockPreview} />
                </div>
            </Stack>
        </Modal>
    );
};

export default CreateFinalIndicatorModal;
import React from 'react';
import {
    Modal,
    Stack,
    TextInput,
    TextArea,
    Toggle,
    Select,
    SelectItem,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Search,
    Checkbox,
    Tag,
    Button,
} from '@carbon/react';
import { ChevronRight, Add } from '@carbon/icons-react';

export type SectionIndicatorType = 'base' | 'final';

export type SectionIndicatorRef = {
    id: string;
    type: SectionIndicatorType;
    code: string;
    name: string;
};

export type CreateSectionPayload = {
    id?: string;
    name: string;
    description?: string;

    disaggregationEnabled: boolean;
    ageCategoryId: string | null;

    indicators: Array<{ id: string; type: SectionIndicatorType }>;
};

type Props = {
    open: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateSectionPayload) => void;
    indicators: SectionIndicatorRef[];
};

const ageCategories = [
    { id: 'STANDARD_HMIS', label: 'Standard HMIS' },
    { id: 'MOH_105_OPD_DIAG', label: 'MOH 105 OPD Diagnoses' },
    { id: 'MOH_105_NUTRITION', label: 'MOH 105 Nutrition' },
];

const CreateSectionModal: React.FC<Props> = ({ open, onClose, onSubmit, indicators }) => {
    const [name, setName] = React.useState('OPD Attendance');
    const [description, setDescription] = React.useState('');
    const [disaggEnabled, setDisaggEnabled] = React.useState(true);
    const [ageCategoryId, setAgeCategoryId] = React.useState<string>('STANDARD_HMIS');

    const [tab, setTab] = React.useState<SectionIndicatorType>('base');
    const [q, setQ] = React.useState('');
    const [selected, setSelected] = React.useState<Array<{ id: string; type: SectionIndicatorType }>>([]);

    React.useEffect(() => {
        if (!open) return;
        setName('OPD Attendance');
        setDescription('');
        setDisaggEnabled(true);
        setAgeCategoryId('STANDARD_HMIS');
        setTab('base');
        setQ('');
        setSelected([]);
    }, [open]);

    const available = React.useMemo(() => {
        const s = q.trim().toLowerCase();
        return indicators
            .filter((i) => i.type === tab)
            .filter((i) => !s || i.name.toLowerCase().includes(s) || i.code.toLowerCase().includes(s));
    }, [indicators, tab, q]);

    const selectedFull = React.useMemo(() => {
        const setIds = new Set(selected.map((x) => x.id));
        return indicators.filter((i) => setIds.has(i.id));
    }, [selected, indicators]);

    const isSelected = (id: string) => selected.some((x) => x.id === id);

    const toggleIndicator = (i: SectionIndicatorRef, checked: boolean) => {
        setSelected((prev) => {
            if (checked) return prev.some((x) => x.id === i.id) ? prev : [...prev, { id: i.id, type: i.type }];
            return prev.filter((x) => x.id !== i.id);
        });
    };

    const submit = () => {
        onSubmit({
            name: name.trim(),
            description: description.trim() || undefined,
            disaggregationEnabled: disaggEnabled,
            ageCategoryId: disaggEnabled ? ageCategoryId : null,
            indicators: selected,
        });
    };

    const canSubmit = Boolean(name.trim()) && selected.length > 0;

    const selectedIndex = tab === 'base' ? 0 : 1;

    return (
        <Modal
            open={open}
            onRequestClose={onClose}
            modalHeading="Create Section"
            primaryButtonText="Create Section"
            secondaryButtonText="Cancel"
            onRequestSubmit={submit}
            primaryButtonDisabled={!canSubmit}
            size="lg"
        >
            <Stack gap={5}>
                <div style={{ opacity: 0.8 }}>
                    Sections are groups of indicators with shared disaggregation options.
                </div>

                <TextInput
                    id="section-name"
                    labelText="Section Name"
                    value={name}
                    onChange={(e) => setName((e.target as HTMLInputElement).value)}
                />

                <TextInput
                    id="section-desc"
                    labelText="(Optional) Description"
                    value={description}
                    onChange={(e) => setDescription((e.target as HTMLInputElement).value)}
                />

                <hr style={{ border: 0, borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>Disaggregation</div>
                    <Toggle
                        id="disagg-toggle"
                        labelText=""
                        toggled={disaggEnabled}
                        onToggle={(v) => setDisaggEnabled(Boolean(v))}
                    />
                </div>

                <Select
                    id="age-category"
                    labelText="Age Category"
                    value={ageCategoryId}
                    disabled={!disaggEnabled}
                    onChange={(e) => setAgeCategoryId((e.target as HTMLSelectElement).value)}
                >
                    {ageCategories.map((x) => (
                        <SelectItem key={x.id} value={x.id} text={x.label} />
                    ))}
                </Select>

                <Tabs selectedIndex={selectedIndex} onChange={({ selectedIndex }) => setTab(selectedIndex === 0 ? 'base' : 'final')}>
                    <TabList aria-label="Indicator type tabs">
                        <Tab>Base Indicators</Tab>
                        <Tab>Final Indicators</Tab>
                    </TabList>

                    <TabPanels>
                        <TabPanel>
                            <div style={{ marginTop: '0.75rem' }}>
                                <Search size="lg" labelText="Search" placeholder="Search" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                                {/* Add Indicators */}
                                <div style={{ border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 6, padding: '0.75rem' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Add Indicators</div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {available.map((i) => (
                                            <div key={i.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                                <Checkbox
                                                    id={`add-${i.id}`}
                                                    labelText={i.name}
                                                    checked={isSelected(i.id)}
                                                    onChange={(checked) => toggleIndicator(i, Boolean(checked))}
                                                />
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Tag size="sm" type="blue">
                                                        {i.type === 'base' ? 'Base' : 'Final'}
                                                    </Tag>
                                                    <ChevronRight size={16} />
                                                </div>
                                            </div>
                                        ))}

                                        <Button size="sm" kind="ghost" renderIcon={Add}>
                                            Select Indicator
                                        </Button>
                                    </div>
                                </div>

                                {/* Selected Indicators */}
                                <div style={{ border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 6, padding: '0.75rem' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Selected Indicators</div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {selectedFull.length === 0 ? (
                                            <div style={{ opacity: 0.75 }}>No indicators selected yet.</div>
                                        ) : (
                                            selectedFull.map((i) => (
                                                <div key={i.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                                        <Checkbox
                                                            id={`sel-${i.id}`}
                                                            labelText={i.name}
                                                            checked={true}
                                                            onChange={(checked) => toggleIndicator(i, Boolean(checked))}
                                                        />
                                                    </div>
                                                    <Tag size="sm" type="gray">
                                                        {i.code}
                                                    </Tag>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabPanel>

                        <TabPanel>
                            {/* Final indicators panel uses same UI; just change tab state */}
                            <div style={{ marginTop: '0.75rem' }}>
                                <Search size="lg" labelText="Search" placeholder="Search" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                                <div style={{ border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 6, padding: '0.75rem' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Add Indicators</div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {available.map((i) => (
                                            <div key={i.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                                <Checkbox
                                                    id={`add-final-${i.id}`}
                                                    labelText={i.name}
                                                    checked={isSelected(i.id)}
                                                    onChange={(checked) => toggleIndicator(i, Boolean(checked))}
                                                />
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Tag size="sm" type="blue">
                                                        {i.type === 'base' ? 'Base' : 'Final'}
                                                    </Tag>
                                                    <ChevronRight size={16} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ border: '1px solid var(--cds-border-subtle, #e0e0e0)', borderRadius: 6, padding: '0.75rem' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Selected Indicators</div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {selectedFull.length === 0 ? (
                                            <div style={{ opacity: 0.75 }}>No indicators selected yet.</div>
                                        ) : (
                                            selectedFull.map((i) => (
                                                <div key={i.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                                    <Checkbox
                                                        id={`sel-final-${i.id}`}
                                                        labelText={i.name}
                                                        checked={true}
                                                        onChange={(checked) => toggleIndicator(i, Boolean(checked))}
                                                    />
                                                    <Tag size="sm" type="gray">
                                                        {i.code}
                                                    </Tag>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </Stack>
        </Modal>
    );
};

export default CreateSectionModal;
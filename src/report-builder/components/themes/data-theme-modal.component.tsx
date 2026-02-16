import React from 'react';
import { Modal, Stack } from '@carbon/react';
import DataThemeBasicsSection from './sections/data-theme-basics.section';
import DataThemeSourceSection from './sections/data-theme-source.section';
import DataThemeFieldsEditorSection from './sections/data-theme-fields-editor.section';
import DataThemePreviewSection from './sections/data-theme-preview.section';
import type { DataTheme, DataThemeConfig } from '../../types/theme/data-theme.types';

type Props = {
    open: boolean;
    mode: 'create' | 'edit';
    initial?: DataTheme | null;
    onClose: () => void;
    onSave: (payload: DataTheme) => void;
};

const defaultConfig: DataThemeConfig = {
    sourceTable: '',
    patientIdColumn: '',
    dateColumn: '',
    locationColumn: '',
    fields: [],
};

function toCode(name: string) {
    return (name ?? '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 30);
}

export default function DataThemeModal({ open, mode, initial, onClose, onSave }: Props) {
    const [name, setName] = React.useState('');
    const [code, setCode] = React.useState('');
    const [domain, setDomain] = React.useState<DataTheme['domain']>('OBSERVATIONS');
    const [description, setDescription] = React.useState('');
    const [config, setConfig] = React.useState<DataThemeConfig>(defaultConfig);
    const [configJson, setConfigJson] = React.useState<string>(JSON.stringify(defaultConfig, null, 2));

    React.useEffect(() => {
        if (!open) return;

        if (initial) {
            setName(initial.name ?? '');
            setCode(initial.code ?? '');
            setDomain(initial.domain ?? 'OBSERVATIONS');
            setDescription(initial.description ?? '');

            try {
                const parsed = initial.configJson ? (JSON.parse(initial.configJson) as DataThemeConfig) : defaultConfig;
                setConfig(parsed);
                setConfigJson(JSON.stringify(parsed, null, 2));
            } catch {
                setConfig(defaultConfig);
                setConfigJson(JSON.stringify(defaultConfig, null, 2));
            }
        } else {
            setName('');
            setCode('');
            setDomain('OBSERVATIONS');
            setDescription('');
            setConfig(defaultConfig);
            setConfigJson(JSON.stringify(defaultConfig, null, 2));
        }
    }, [open, initial]);

    const canSave =
        Boolean(name.trim()) &&
        Boolean((code.trim() || toCode(name)).trim()) &&
        Boolean(domain) &&
        Boolean(config?.sourceTable) &&
        Boolean(config?.patientIdColumn) &&
        Boolean(config?.dateColumn);

    const save = () => {
        if (!canSave) return;

        const payload: DataTheme = {
            ...(initial?.uuid ? { uuid: initial.uuid } : {}),
            name: name.trim(),
            code: (code.trim() || toCode(name)).trim(),
            domain,
            description: description.trim(),
            configJson,
        };

        onSave(payload);
    };

    return (
        <Modal
            open={open}
            modalHeading={mode === 'create' ? 'Create Data Theme' : 'Edit Data Theme'}
            primaryButtonText={mode === 'create' ? 'Create' : 'Save'}
            secondaryButtonText="Cancel"
            onRequestClose={onClose}
            onRequestSubmit={save}
            primaryButtonDisabled={!canSave}
        >
            <Stack gap={6}>
                <DataThemeBasicsSection
                    value={{ name, code, domain, description }}
                    onChange={(next) => {
                        setName(next.name);
                        setCode(next.code);
                        setDomain(next.domain);
                        setDescription(next.description ?? '');
                    }}
                />

                {/* ✅ this is the important change */}
                <DataThemeSourceSection config={config} onChange={setConfig} open={true} />

                <DataThemeFieldsEditorSection config={config} onChange={setConfig} open={open} />

                <DataThemePreviewSection config={config} onConfigJson={setConfigJson} />
            </Stack>
        </Modal>
    );
}
import React from 'react';
import { Button, TextArea } from '@carbon/react';
import { Copy } from '@carbon/icons-react';

type Props = {
    config: any; // or DataThemeConfig
    metaJson: string; // pass the already-wrapped metaJson string you're saving
    onConfigJson: (json: string) => void;
};

function copyToClipboard(text: string) {
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
}

export default function DataThemePreviewSection({ config, metaJson, onConfigJson }: Props) {
    const configJson = React.useMemo(() => JSON.stringify(config, null, 2), [config]);

    React.useEffect(() => {
        onConfigJson(configJson);
    }, [configJson, onConfigJson]);

    const Panel = ({
                       title,
                       subtitle,
                       value,
                       copyLabel,
                       textAreaId,
                   }: {
        title: string;
        subtitle?: string;
        value: string;
        copyLabel: string;
        textAreaId: string;
    }) => (
        <div
            style={{
                background: 'var(--cds-layer-01)',
                border: '1px solid var(--cds-border-subtle)',
                borderRadius: 8,
                padding: '1rem',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                    <div style={{ fontWeight: 600 }}>{title}</div>
                    {subtitle ? (
                        <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.25rem' }}>{subtitle}</div>
                    ) : null}
                </div>

                <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={Copy}
                    iconDescription={copyLabel}
                    onClick={() => copyToClipboard(value)}
                >
                    Copy
                </Button>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
                <TextArea
                    id={textAreaId}
                    labelText=""
                    hideLabel
                    value={value}
                    readOnly
                    style={{
                        minHeight: 420,
                        fontFamily:
                            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    }}
                />
            </div>
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 600 }}>Preview</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>
                    These are the exact JSON payloads that will be saved.
                </div>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    alignItems: 'start',
                }}
            >
                <Panel
                    title="configJson"
                    subtitle="Data source + fields + conditions."
                    value={configJson}
                    copyLabel="Copy configJson"
                    textAreaId="theme-config-preview"
                />

                <Panel
                    title="metaJson"
                    subtitle="UI metadata (icon, color, category, ordering)."
                    value={metaJson}
                    copyLabel="Copy metaJson"
                    textAreaId="theme-meta-preview"
                />
            </div>
        </div>
    );
}
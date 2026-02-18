import React from 'react';
import {
    ComboBox,
    Checkbox,
    MultiSelect,
    NumberInput,
    Stack,
    TextArea,
    TextInput,
} from '@carbon/react';

import { themeIconOptions, type ThemeIconKey, getThemeIcon } from '../icon-registry';

export type AllowedIndicatorKind = 'BASE' | 'FINAL';

export type DataThemeMeta = {
    icon: string;
    color: string; // hex
    category: string;
    order: number;
    beta: boolean;
    descriptionShort: string;
    allowedIndicatorKinds: AllowedIndicatorKind[];
};

type Props = {
    value: DataThemeMeta;
    onChange: (next: DataThemeMeta) => void;
    open: boolean;
};

const KIND_ITEMS: AllowedIndicatorKind[] = ['BASE', 'FINAL'];

function normalizeHex(input: string, fallback = '#0f62fe') {
    const raw = (input ?? '').trim();
    if (!raw) return fallback;

    const v = raw.startsWith('#') ? raw : `#${raw}`;
    const short = /^#[0-9a-fA-F]{3}$/;
    const full = /^#[0-9a-fA-F]{6}$/;

    if (full.test(v)) return v.toLowerCase();
    if (short.test(v)) {
        const r = v[1],
            g = v[2],
            b = v[3];
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }

    return fallback;
}

export default function DataThemeMetadataSection({ value, onChange, open }: Props) {
    const colorValue = normalizeHex(value.color);
    const IconPreview = getThemeIcon(value.icon);

    return (
        <div>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Metadata</div>

            <div style={{ marginBottom: '0.75rem', opacity: 0.85, fontSize: '0.875rem' }}>
                Controls how this theme appears in the UI (icon, color, category, ordering, etc.).
                Stored as <b>metaJson</b>.
            </div>

            <Stack gap={5}>

                {/* ICON */}
                <div>
                    <ComboBox
                        id="theme-meta-icon"
                        titleText="Icon"
                        items={[...themeIconOptions]}
                        disabled={!open}
                        itemToString={(it) => (it ? it.label : '')}
                        selectedItem={
                            themeIconOptions.find((x) => x.key === value.icon) ?? null
                        }
                        placeholder="Type to search icons…"
                        onChange={(e: any) => {
                            const picked = e?.selectedItem as
                                | (typeof themeIconOptions)[number]
                                | null;
                            onChange({
                                ...value,
                                icon: (picked?.key as ThemeIconKey) ?? '',
                            });
                        }}
                    />

                    {/* Preview */}
                    {IconPreview ? (
                        <div
                            style={{
                                marginTop: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                opacity: 0.9,
                            }}
                        >
                            <IconPreview size={20} />
                            <span style={{ fontSize: '0.875rem' }}>{value.icon}</span>
                        </div>
                    ) : null}
                </div>

                {/* COLOR */}
                <div>
                    <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                        Color
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                        }}
                    >
                        <input
                            id="theme-meta-color-picker"
                            type="color"
                            value={colorValue}
                            disabled={!open}
                            onChange={(e) =>
                                onChange({
                                    ...value,
                                    color: normalizeHex(e.target.value),
                                })
                            }
                            style={{
                                width: '3rem',
                                height: '2.5rem',
                                padding: 0,
                                border: '1px solid var(--cds-border-subtle)',
                                borderRadius: '4px',
                                background: 'transparent',
                                cursor: open ? 'pointer' : 'not-allowed',
                            }}
                        />

                        <TextInput
                            id="theme-meta-color-hex"
                            labelText=""
                            hideLabel
                            value={colorValue}
                            disabled={!open}
                            onChange={(e) =>
                                onChange({
                                    ...value,
                                    color: normalizeHex(
                                        (e.target as HTMLInputElement).value,
                                    ),
                                })
                            }
                        />
                    </div>
                </div>

                {/* CATEGORY + ORDER */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.75rem',
                    }}
                >
                    <TextInput
                        id="theme-meta-category"
                        labelText="Category"
                        value={value.category ?? ''}
                        disabled={!open}
                        placeholder="e.g. Clinical"
                        onChange={(e) =>
                            onChange({
                                ...value,
                                category: (e.target as HTMLInputElement).value,
                            })
                        }
                    />

                    <NumberInput
                        id="theme-meta-order"
                        label="Order"
                        value={Number.isFinite(value.order) ? value.order : 0}
                        disabled={!open}
                        min={0}
                        step={1}
                        onChange={(_, data) => {
                            const n = Number(data?.value);
                            onChange({
                                ...value,
                                order: Number.isFinite(n) ? n : 0,
                            });
                        }}
                    />
                </div>

                {/* BETA */}
                <Checkbox
                    id="theme-meta-beta"
                    labelText="Beta"
                    checked={Boolean(value.beta)}
                    disabled={!open}
                    onChange={(_, { checked }) =>
                        onChange({ ...value, beta: Boolean(checked) })
                    }
                />

                {/* SHORT DESCRIPTION */}
                <TextArea
                    id="theme-meta-description-short"
                    labelText="Short description"
                    value={value.descriptionShort ?? ''}
                    disabled={!open}
                    placeholder="e.g. Diagnosis-based indicators"
                    onChange={(e) =>
                        onChange({
                            ...value,
                            descriptionShort: (
                                e.target as HTMLTextAreaElement
                            ).value,
                        })
                    }
                />

                {/* ALLOWED KINDS */}
                <MultiSelect
                    id="theme-meta-kinds"
                    titleText="Allowed indicator kinds"
                    items={KIND_ITEMS}
                    disabled={!open}
                    itemToString={(x) => (x ? String(x) : '')}
                    initialSelectedItems={value.allowedIndicatorKinds ?? []}
                    onChange={(e: any) => {
                        const next = (e?.selectedItems ?? []) as AllowedIndicatorKind[];
                        onChange({ ...value, allowedIndicatorKinds: next });
                    }}
                    label="Select kinds"
                />
            </Stack>
        </div>
    );
}
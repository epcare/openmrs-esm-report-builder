import React from 'react';
import { Tag, TextInput } from '@carbon/react';

type Props = {
    id?: string;
    labelText?: string;
    placeholder?: string;
    value: string[];
    onChange: (values: string[]) => void;
    disabled?: boolean;
};

/**
 * TagInput component - allows users to enter multiple values as tags.
 * Values are separated by commas or Enter key.
 * Each tag displays with an (×) button to remove it.
 */
export default function TagInput({
    id,
    labelText,
    placeholder = 'Type and press Enter or comma to add',
    value = [],
    onChange,
    disabled = false,
}: Props) {
    const [inputValue, setInputValue] = React.useState('');

    // Track focus for styling
    const [isFocused, setIsFocused] = React.useState(false);

    // Remove a tag by index
    const removeTag = (indexToRemove: number) => {
        const newTags = value.filter((_, index) => index !== indexToRemove);
        onChange(newTags);
    };

    // Add a new tag from current input
    const addTag = (tagText: string) => {
        const trimmed = tagText.trim();
        if (trimmed && !value.includes(trimmed)) {
            onChange([...value, trimmed]);
        }
        setInputValue('');
    };

    // Handle keyboard input
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            // For comma, remove the comma from the input before adding tag
            const textToAdd = e.key === ',' ? inputValue.slice(0, -1) : inputValue;
            addTag(textToAdd);
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            // Delete last tag when input is empty and backspace is pressed
            removeTag(value.length - 1);
        }
    };

    // Handle blur - add remaining input as tag
    const handleBlur = () => {
        setIsFocused(false);
        if (inputValue.trim()) {
            addTag(inputValue);
        }
    };

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    // Handle paste - split by commas/newlines
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        // Split by comma, newline, or tab
        const items = pastedText
            .split(/[,\n\t]+/)
            .map((s) => s.trim())
            .filter(Boolean);

        if (items.length > 0) {
            // Add only non-duplicate items
            const newValues = items.filter((item) => !value.includes(item));
            onChange([...value, ...newValues]);
        }
    };

    return (
        <div className="tag-input-container">
            {labelText && (
                <label
                    htmlFor={id}
                    style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 400,
                        lineHeight: '1.34',
                        color: 'var(--cds-text-secondary, #525252)',
                    }}
                >
                    {labelText}
                </label>
            )}

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    border: '1px solid var(--cds-text-primary, #161616)',
                    borderRadius: '0.125rem',
                    backgroundColor: isFocused
                        ? 'var(--cds-field-1, #ffffff)'
                        : 'var(--cds-field-2, #f4f4f4)',
                    minHeight: '3rem',
                    alignItems: 'center',
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                    // Delay blur to allow tag removal to complete
                    setTimeout(() => {
                        if (document.activeElement?.tagName !== 'BUTTON') {
                            handleBlur();
                        }
                    }, 100);
                }}
            >
                {/* Render tags */}
                {value.map((tag, index) => (
                    <Tag
                        key={index}
                        type="cool-gray"
                        onClose={() => removeTag(index)}
                        style={{ margin: 0 }}
                    >
                        {tag}
                    </Tag>
                ))}

                {/* Text input for adding new tags */}
                <TextInput
                    id={id}
                    labelText=""
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={value.length === 0 ? placeholder : ''}
                    disabled={disabled}
                    hideLabel
                    style={{
                        flex: 1,
                        minWidth: '120px',
                        border: 'none',
                        boxShadow: 'none',
                        backgroundColor: 'transparent',
                        padding: 0,
                    }}
                />
            </div>

            {/* Helper text */}
            <div
                style={{
                    marginTop: '0.25rem',
                    fontSize: '0.75rem',
                    color: 'var(--cds-text-secondary, #525252)',
                }}
            >
                Press Enter or comma (,) to add a value. Click × to remove.
            </div>
        </div>
    );
}

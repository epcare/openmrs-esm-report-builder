import React from 'react';
import { Stack, TextInput, Button, Select, SelectItem, Tag } from '@carbon/react';

type ConditionOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'IN' | 'NOT IN' | 'LIKE' | 'IS NULL' | 'IS NOT NULL' | 'BETWEEN';

type CustomCondition = {
    id: string;
    column: string;
    operator: ConditionOperator;
    value: string | string[] | boolean;
    wildcardMode?: 'none' | 'contains' | 'startsWith' | 'endsWith';
};

type Props = {
    conditions: CustomCondition[];
    onChange: (conditions: CustomCondition[]) => void;
};

const OPERATOR_OPTIONS: Array<{ value: ConditionOperator; label: string; requiresValue: boolean }> = [
    { value: '=', label: 'Equals', requiresValue: true },
    { value: '!=', label: 'Not Equals', requiresValue: true },
    { value: '>', label: 'Greater Than', requiresValue: true },
    { value: '>=', label: 'Greater Than or Equal', requiresValue: true },
    { value: '<', label: 'Less Than', requiresValue: true },
    { value: '<=', label: 'Less Than or Equal', requiresValue: true },
    { value: 'IN', label: 'IN (comma-separated)', requiresValue: true },
    { value: 'NOT IN', label: 'NOT IN (comma-separated)', requiresValue: true },
    { value: 'LIKE', label: 'LIKE (pattern matching)', requiresValue: true },
    { value: 'IS NULL', label: 'IS NULL', requiresValue: false },
    { value: 'IS NOT NULL', label: 'IS NOT NULL', requiresValue: false },
    { value: 'BETWEEN', label: 'BETWEEN (two values)', requiresValue: true },
];

/**
 * CustomConditionInput - allows users to define custom column conditions
 * beyond what's configured in the theme.
 */
export default function CustomConditionInput({ conditions, onChange }: Props) {
    const [newCondition, setNewCondition] = React.useState<{
        column: string;
        operator: ConditionOperator;
        value: string;
        wildcardMode: 'none' | 'contains' | 'startsWith' | 'endsWith';
    }>({
        column: '',
        operator: '=',
        value: '',
        wildcardMode: 'contains', // Default to contains for LIKE
    });

    const addCondition = () => {
        if (!newCondition.column.trim()) return;

        const operatorConfig = OPERATOR_OPTIONS.find((opt) => opt.value === newCondition.operator);
        if (operatorConfig?.requiresValue && !newCondition.value.trim()) return;

        const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const condition: CustomCondition = {
            id,
            column: newCondition.column.trim(),
            operator: newCondition.operator,
            value: getValueForOperator(newCondition.operator, newCondition.value),
            wildcardMode: newCondition.operator === 'LIKE' ? newCondition.wildcardMode : undefined,
        };

        onChange([...conditions, condition]);

        // Reset for next condition
        setNewCondition({
            column: '',
            operator: '=',
            value: '',
            wildcardMode: 'contains',
        });
    };

    const removeCondition = (id: string) => {
        onChange(conditions.filter((c) => c.id !== id));
    };

    const getValueForOperator = (operator: ConditionOperator, input: string): string | string[] | boolean => {
        if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
            return true; // Toggle is checked
        }
        if (operator === 'IN' || operator === 'NOT IN') {
            return input.split(',').map((v) => v.trim()).filter(Boolean);
        }
        if (operator === 'BETWEEN') {
            const parts = input.split(',').map((v) => v.trim()).filter(Boolean);
            if (parts.length === 2) {
                return JSON.stringify({ start: parts[0], end: parts[1] });
            }
            return input;
        }
        return input;
    };

    const operatorConfig = OPERATOR_OPTIONS.find((opt) => opt.value === newCondition.operator);

    return (
        <div>
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Add Custom Condition</div>
                <Stack gap={3}>
                    {/* Column Input */}
                    <div>
                        <label
                            htmlFor="custom-column"
                            style={{
                                display: 'block',
                                marginBottom: '0.25rem',
                                fontSize: '0.75rem',
                                color: 'var(--cds-text-secondary, #525252)',
                            }}
                        >
                            Column name
                        </label>
                        <TextInput
                            id="custom-column"
                            labelText=""
                            value={newCondition.column}
                            placeholder="e.g., a.status, a.encounter_type"
                            onChange={(e) =>
                                setNewCondition({ ...newCondition, column: (e.target as HTMLInputElement).value })
                            }
                        />
                    </div>

                    {/* Operator Select */}
                    <div style={{ maxWidth: '300px' }}>
                        <Select
                            id="custom-operator"
                            labelText="Operator"
                            value={newCondition.operator}
                            onChange={(e) =>
                                setNewCondition({
                                    ...newCondition,
                                    operator: e.target.value as ConditionOperator,
                                })
                            }
                        >
                            {OPERATOR_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} text={opt.label} />
                            ))}
                        </Select>
                    </div>

                    {/* Value Input - only show if operator requires a value */}
                    {operatorConfig?.requiresValue && (
                        <div>
                            <label
                                htmlFor="custom-value"
                                style={{
                                    display: 'block',
                                    marginBottom: '0.25rem',
                                    fontSize: '0.75rem',
                                    color: 'var(--cds-text-secondary, #525252)',
                                }}
                            >
                                Value
                                {newCondition.operator === 'IN' || newCondition.operator === 'NOT IN'
                                    ? ' (comma-separated)'
                                    : newCondition.operator === 'BETWEEN'
                                      ? ' (two values, comma-separated)'
                                      : ''}
                            </label>
                            <TextInput
                                id="custom-value"
                                labelText=""
                                value={newCondition.value}
                                placeholder={
                                    newCondition.operator === 'IN' || newCondition.operator === 'NOT IN'
                                        ? 'e.g., 1,2,3 or a,b,c'
                                        : newCondition.operator === 'BETWEEN'
                                          ? 'e.g., 10,50'
                                          : 'Enter value'
                                }
                                onChange={(e) =>
                                    setNewCondition({ ...newCondition, value: (e.target as HTMLInputElement).value })
                                }
                            />

                            {/* Wildcard options for LIKE operator */}
                            {newCondition.operator === 'LIKE' && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <label
                                        style={{
                                            display: 'block',
                                            marginBottom: '0.25rem',
                                            fontSize: '0.75rem',
                                            color: 'var(--cds-text-secondary, #525252)',
                                        }}
                                    >
                                        Wildcard pattern
                                    </label>
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="wildcard-mode"
                                                value="contains"
                                                checked={newCondition.wildcardMode === 'contains'}
                                                onChange={() => setNewCondition({ ...newCondition, wildcardMode: 'contains' })}
                                            />
                                            <span style={{ fontSize: '0.875rem' }}>Contains (%value%)</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="wildcard-mode"
                                                value="startsWith"
                                                checked={newCondition.wildcardMode === 'startsWith'}
                                                onChange={() => setNewCondition({ ...newCondition, wildcardMode: 'startsWith' })}
                                            />
                                            <span style={{ fontSize: '0.875rem' }}>Starts with (value%)</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="wildcard-mode"
                                                value="endsWith"
                                                checked={newCondition.wildcardMode === 'endsWith'}
                                                onChange={() => setNewCondition({ ...newCondition, wildcardMode: 'endsWith' })}
                                            />
                                            <span style={{ fontSize: '0.875rem' }}>Ends with (%value)</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="wildcard-mode"
                                                value="none"
                                                checked={newCondition.wildcardMode === 'none'}
                                                onChange={() => setNewCondition({ ...newCondition, wildcardMode: 'none' })}
                                            />
                                            <span style={{ fontSize: '0.875rem' }}>None (exact match)</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <Button onClick={addCondition} size="sm">
                        Add Condition
                    </Button>
                </Stack>
            </div>

            {/* List of Added Conditions */}
            {conditions.length > 0 && (
                <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Custom Conditions</div>
                    <Stack gap={3}>
                        {conditions.map((condition) => (
                            <div
                                key={condition.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem',
                                    backgroundColor: 'var(--cds-background, #ffffff)',
                                    border: '1px solid var(--cds-interactive-01, #0f62fe)',
                                    borderRadius: '0.25rem',
                                }}
                            >
                                <Tag type="blue" style={{ margin: 0 }}>
                                    {condition.column}
                                </Tag>
                                <span>{condition.operator}</span>
                                {condition.wildcardMode && condition.operator === 'LIKE' && (
                                    <Tag type="cool-gray" style={{ margin: 0, fontSize: '0.75rem' }}>
                                        {condition.wildcardMode === 'contains' ? '%value%' :
                                         condition.wildcardMode === 'startsWith' ? 'value%' :
                                         condition.wildcardMode === 'endsWith' ? '%value' : 'exact'}
                                    </Tag>
                                )}
                                {typeof condition.value === 'boolean' ? (
                                    <span style={{ color: 'var(--cds-text-secondary, #525252)' }}>
                                        (toggle enabled)
                                    </span>
                                ) : Array.isArray(condition.value) ? (
                                    <Tag type="cool-gray" style={{ margin: 0 }}>
                                        {condition.value.join(', ')}
                                    </Tag>
                                ) : (
                                    <span style={{ fontFamily: 'monospace' }}>
                                        {String(condition.value)}
                                    </span>
                                )}
                                <Button
                                    size="sm"
                                    kind="ghost"
                                    hasIconOnly
                                    renderIcon={() => <span>×</span>}
                                    onClick={() => removeCondition(condition.id)}
                                    style={{ marginLeft: 'auto' }}
                                >
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </Stack>
                </div>
            )}
        </div>
    );
}

export type { CustomCondition };

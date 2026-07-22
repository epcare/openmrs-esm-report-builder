import React from 'react';
import { Stack, TextInput, Button, Select, SelectItem, Tag } from '@carbon/react';

type ConditionOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'IN' | 'NOT IN' | 'LIKE' | 'IS NULL' | 'IS NOT NULL' | 'BETWEEN';

type CustomCondition = {
    id: string;
    column: string;
    operator: ConditionOperator;
    value: string | string[] | boolean;
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
    { value: 'LIKE', label: 'LIKE (pattern)', requiresValue: true },
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
    }>({
        column: '',
        operator: '=',
        value: '',
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
        };

        onChange([...conditions, condition]);

        // Reset for next condition
        setNewCondition({
            column: '',
            operator: '=',
            value: '',
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

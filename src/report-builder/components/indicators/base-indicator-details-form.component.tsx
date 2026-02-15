import React from 'react';
import {Select, SelectItem, TextInput} from '@carbon/react';

export type DataTheme = 'DIAGNOSIS' | 'OBSERVATIONS' | 'ENCOUNTERS';

type Props = {
    code: string;
    name: string;
    theme: DataTheme;
    unit: 'Patients' | 'Encounters';

    onChangeCode: (v: string) => void;
    onChangeName: (v: string) => void;
    onChangeTheme: (v: DataTheme) => void;
    onChangeUnit: (v: 'Patients' | 'Encounters') => void;
};

const grid2 = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
} as const;

const BaseIndicatorDetailsForm: React.FC<Props> = ({
                                                       code,
                                                       name,
                                                       theme,
                                                       unit,
                                                       onChangeCode,
                                                       onChangeName,
                                                       onChangeTheme,
                                                       onChangeUnit,
                                                   }) => {
    return (
        <>
            <div style={grid2}>
                <TextInput
                    id="base-code"
                    labelText="Code"
                    value={code}
                    onChange={(e) => onChangeCode((e.target as HTMLInputElement).value)}
                    placeholder="e.g. MAL_CASES"
                />

                <TextInput
                    id="base-name"
                    labelText="Name"
                    value={name}
                    onChange={(e) => onChangeName((e.target as HTMLInputElement).value)}
                    placeholder="e.g. Malaria Cases"
                />
            </div>

            <div style={{...grid2, marginTop: '0.75rem'}}>
                <Select
                    id="base-theme"
                    labelText="Data theme"
                    value={theme}
                    onChange={(e) => onChangeTheme((e.target as HTMLSelectElement).value as DataTheme)}
                >
                    <SelectItem value="DIAGNOSIS" text="Diagnosis Data"/>
                    <SelectItem value="OBSERVATIONS" text="Observations (coming soon)"/>
                    <SelectItem value="ENCOUNTERS" text="Encounters (coming soon)"/>
                </Select>

                <Select
                    id="base-unit"
                    labelText="Unit"
                    value={unit}
                    onChange={(e) => onChangeUnit((e.target as HTMLSelectElement).value as 'Patients' | 'Encounters')}
                >
                    <SelectItem value="Patients" text="Patients"/>
                    <SelectItem value="Encounters" text="Encounters"/>
                </Select>
            </div>
        </>
    );
};

export default BaseIndicatorDetailsForm;
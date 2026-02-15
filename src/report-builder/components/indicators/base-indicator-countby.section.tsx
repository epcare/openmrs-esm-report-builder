import React from 'react';
import { RadioButtonGroup, RadioButton } from '@carbon/react';

import type { CreateBaseIndicatorPayload } from './types/base-indicator-form.types';

type Props = {
    state: CreateBaseIndicatorPayload;
    onChange: (patch: Partial<CreateBaseIndicatorPayload>) => void;
};

const BaseIndicatorCountBySection: React.FC<Props> = ({ state, onChange }) => {
    return (
        <RadioButtonGroup
            legendText="Count By"
            name="countBy"
            valueSelected={state.countBy}
            onChange={(val) => onChange({ countBy: val as 'Patients' | 'Encounters' })}
        >
            <RadioButton id="cb-patients" labelText="Patients" value="Patients" />
            <RadioButton id="cb-encounters" labelText="Encounters" value="Encounters" />
        </RadioButtonGroup>
    );
};

export default BaseIndicatorCountBySection;
import React from 'react';
import { TextArea } from '@carbon/react';

type Props = {
    value: string;
};

const SqlPreview: React.FC<Props> = ({ value }) => {
    return (
        <TextArea
            id="sql-preview"
            labelText="Generated SQL (base indicator)"
            value={value}
            readOnly
        />
    );
};

export default SqlPreview;
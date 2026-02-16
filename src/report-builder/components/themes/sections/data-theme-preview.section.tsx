import React from 'react';
import { TextArea } from '@carbon/react';
import type { DataThemeConfig } from '../../../types/theme/data-theme.types';

type Props = {
    config: DataThemeConfig;
    onConfigJson: (json: string) => void;
};

export default function DataThemePreviewSection({ config, onConfigJson }: Props) {
    const json = React.useMemo(() => JSON.stringify(config, null, 2), [config]);

    React.useEffect(() => {
        onConfigJson(json);
    }, [json, onConfigJson]);

    return <TextArea id="theme-config-preview" labelText="configJson preview" value={json} readOnly />;
}
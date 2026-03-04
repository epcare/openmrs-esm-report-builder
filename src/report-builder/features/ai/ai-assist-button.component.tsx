import React, { useState } from 'react';
import { Button } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import type { AiPromptContext } from './ai.types';
import AiAssistModal from './ai-assist-modal.component';

type Props = {
    context?: AiPromptContext;
    size?: 'sm' | 'md' | 'lg';
    kind?: 'primary' | 'secondary' | 'tertiary' | 'ghost';
};

export default function AiAssistButton({
                                           context,
                                           size = 'md',
                                           kind = 'secondary',
                                       }: Props) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button kind={kind} size={size} onClick={() => setOpen(true)}>
                {t('aiAssist', 'AI Assist')}
            </Button>

            <AiAssistModal open={open} onClose={() => setOpen(false)} context={context} />
        </>
    );
}
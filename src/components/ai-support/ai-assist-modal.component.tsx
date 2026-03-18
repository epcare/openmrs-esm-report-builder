import React, { useState } from 'react';
import { Modal, TextArea, Checkbox, InlineLoading, CodeSnippet } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import type { AiPromptContext } from './ai.types';
import { generateAiSuggestion } from './ai.service';

type Props = {
    open: boolean;
    onClose: () => void;

    // optional for later (we can pass page info, filters, selections)
    context?: AiPromptContext;
};

export default function AiAssistModal({ open, onClose, context }: Props) {
    const { t } = useTranslation();

    const [prompt, setPrompt] = useState('');
    const [useContext, setUseContext] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const canSubmit = Boolean(prompt.trim()) && !generating;

    const onGenerate = async () => {
        setGenerating(true);
        setResult(null);

        try {
            const suggestion = await generateAiSuggestion(prompt.trim(), context, useContext);
            setResult(suggestion.body);
        } finally {
            setGenerating(false);
        }
    };

    const handleClose = () => {
        // keep it simple: close without clearing prompt, so user can reopen and continue
        onClose();
    };

    return (
        <Modal
            open={open}
            modalHeading={t('aiAssistPreview', 'AI Assist (Preview)')}
            primaryButtonText={generating ? t('generating', 'Generating…') : t('generate', 'Generate')}
            secondaryButtonText={t('close', 'Close')}
            primaryButtonDisabled={!canSubmit}
            onRequestClose={handleClose}
            onRequestSubmit={onGenerate}
        >
            <div style={{ display: 'grid', gap: '1rem' }}>
                <TextArea
                    labelText={t('aiPromptLabel', 'What do you want to build?')}
                    helperText={t(
                        'aiPromptHelp',
                        "Example: 'Create an indicator for Malaria tested (RDT) grouped by facility and month.'",
                    )}
                    value={prompt}
                    onChange={(e: any) => setPrompt(e.target.value)}
                    rows={5}
                />

                <Checkbox
                    id="aiUseContext"
                    labelText={t('aiUseContext', 'Use current page context (filters, selections)')}
                    checked={useContext}
                    onChange={(_, { checked }) => setUseContext(checked)}
                />

                {generating ? <InlineLoading description={t('aiWorking', 'Generating suggestion…')} /> : null}

                {result ? (
                    <CodeSnippet type="multi" wrapText>
                        {result}
                    </CodeSnippet>
                ) : null}
            </div>
        </Modal>
    );
}
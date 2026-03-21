import type { AiPromptContext, AiSuggestion } from './ai.types';

export async function generateAiSuggestion(
    prompt: string,
    context?: AiPromptContext,
    useContext: boolean = true,
): Promise<AiSuggestion> {
    // Placeholder "AI" – no backend calls yet
    await new Promise((r) => setTimeout(r, 500));

    return {
        title: 'AI Assist (Preview)',
        body:
            `Coming soon ✅\n\n` +
            `Prompt:\n${prompt}\n\n` +
            `Use context: ${useContext ? 'Yes' : 'No'}\n` +
            `Context snapshot: ${useContext ? JSON.stringify(context ?? {}, null, 2) : '{}'}`,
        rawPrompt: prompt,
        usedContext: useContext,
    };
}
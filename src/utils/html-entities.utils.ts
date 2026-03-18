/**
 * Safely decodes common HTML entities that OpenMRS may return
 * after sanitisation (e.g. &lt; &gt; &amp; &quot; &#39;)
 *
 * This is intentionally small and dependency-free.
 */

export function decodeHtmlEntities(input?: string | null): string {
    if (!input || typeof input !== 'string') return input ?? '';

    // Fast exit if nothing looks encoded
    if (!/[&]/.test(input)) return input;

    return input
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/&#x60;/g, '`')
        .replace(/&#x3D;/g, '=');
}
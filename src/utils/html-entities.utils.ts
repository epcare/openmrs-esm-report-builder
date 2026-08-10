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

    // IMPORTANT: Decode &amp; FIRST to handle double-encoded entities like &amp;lt; -> <

    let decoded = input;
    let prevLength: number;

    // Apply decoding repeatedly until no more changes (handles double/multiple encoding)
    do {
        prevLength = decoded.length;
        decoded = decoded
            .replace(/&amp;/g, '&')  // Must be first to handle double-encoding
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x2F;/g, '/')
            .replace(/&#x60;/g, '`')
            .replace(/&#x3D;/g, '=');
    } while (decoded.length !== prevLength && /[&amp;]/.test(decoded));

    return decoded;
}
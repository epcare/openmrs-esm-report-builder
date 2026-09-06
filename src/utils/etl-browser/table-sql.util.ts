/**
 * ETL Data Browser — SQL helpers for table previews
 */

/**
 * Backtick-quote a table identifier for safe interpolation into a SELECT.
 * Inner backticks are doubled per MySQL rules. Throws on empty names.
 */
export function quoteTableIdentifier(name: string): string {
    const trimmed = name?.trim();
    if (!trimmed) {
        throw new Error('Table name is required');
    }
    return '`' + trimmed.replace(/`/g, '``') + '`';
}

/** Build the preview query for a table: SELECT * FROM `name` */
export function buildTablePreviewSql(name: string): string {
    return `SELECT * FROM ${quoteTableIdentifier(name)}`;
}

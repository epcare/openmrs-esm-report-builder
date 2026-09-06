/**
 * ETL Data Browser — table grouping
 *
 * Groups schema tables under their ETL source by matching table names against
 * each source's tablePatterns (comma-separated, matching the server's
 * LIKE 'prefix%' semantics: case-insensitive with % and _ wildcards).
 */

import type { SchemaTable } from '../../resources/theme/etl-schema.api';
import type { ETLSourceDto } from '../../resources/etl-source/etl-source.api';

export type TableGroup = {
    /** Source uuid, or the literal 'other' for unmatched tables */
    id: string;
    name: string;
    sourceUuid?: string;
    schemaName?: string;
    tables: SchemaTable[];
};

export const OTHER_GROUP_ID = 'other';

/**
 * Mirror the server's `TABLE_NAME LIKE 'pattern%'` matching:
 * case-insensitive, the pattern acts as a prefix, `%` matches anything and
 * `_` matches a single character (both are live wildcards in the SQL LIKE).
 */
export function tableNameMatchesPattern(tableName: string, pattern: string): boolean {
    const trimmedPattern = pattern?.trim();
    if (!trimmedPattern || !tableName) return false;

    const escaped = trimmedPattern
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape regex specials
        .replace(/%/g, '[\\s\\S]*')
        .replace(/_/g, '.');

    return new RegExp(`^${escaped}`, 'i').test(tableName);
}

function parsePatterns(tablePatterns?: string): string[] {
    return (tablePatterns ?? '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
}

/**
 * Group tables by the first ETL source whose patterns match each table name.
 * Only usable sources participate (the server queries prefixes from
 * active, non-voided sources only). Sources with no matching tables still
 * yield an empty group; unmatched tables land in the `other` group.
 */
export function groupTablesBySource(
    tables: SchemaTable[],
    sources: ETLSourceDto[],
): { groups: TableGroup[]; other: TableGroup } {
    const usableSources = sources.filter((s) => s?.active !== false && s?.voided !== true);

    const groups: TableGroup[] = usableSources.map((source) => ({
        id: source.uuid,
        name: source.name,
        sourceUuid: source.uuid,
        schemaName: source.schemaName,
        tables: [],
    }));

    const other: TableGroup = { id: OTHER_GROUP_ID, name: 'Other', tables: [] };

    for (const table of tables) {
        const group = groups.find((g) => {
            const source = usableSources.find((s) => s.uuid === g.id);
            return parsePatterns(source?.tablePatterns).some((pattern) =>
                tableNameMatchesPattern(table.name, pattern),
            );
        });
        if (group) {
            group.tables.push(table);
        } else {
            other.tables.push(table);
        }
    }

    return { groups, other };
}

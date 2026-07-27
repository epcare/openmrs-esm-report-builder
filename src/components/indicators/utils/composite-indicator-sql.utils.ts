import type { IndicatorDto } from '../../../resources/indicator/indicators.api';

export type CountSqlSource =
    | 'indicator.sqlTemplate'
    | 'configJson.sqlPreview'
    | 'configJson.sqlTemplate'
    | 'configJson.base.sqlPreview'
    | 'configJson.base.sqlTemplate'
    | 'configJson.authoring.base.sqlPreview'
    | 'configJson.authoring.base.sqlTemplate'
    | 'configJson.baseIndicator.sqlPreview'
    | 'configJson.baseIndicator.sqlTemplate'
    | 'none'
    | 'none(parse-error)';

export function idFieldForUnit(unit: 'Patients' | 'Encounters', overrideColumn?: string) {
    if (overrideColumn) return overrideColumn;
    return unit === 'Encounters' ? 'encounter_id' : 'client_id';
}

/**
 * Extract patientIdColumn from stored authoring (if present),
 * otherwise fallback to "client_id".
 */
export function tryGetPatientIdColumnFromConfig(ind: IndicatorDto): string {
    try {
        const parsed: any = ind?.configJson ? JSON.parse(ind.configJson) : null;

        const cfg =
            parsed?.themeConfig ||
            parsed?.base?.themeConfig ||
            parsed?.authoring?.base?.themeConfig ||
            parsed?.baseIndicator?.themeConfig ||
            null;

        const pid = cfg?.patientIdColumn;
        return pid ? String(pid) : 'client_id';
    } catch {
        return 'client_id';
    }
}

/**
 * ✅ Key fix:
 * Many times the backend returns sqlTemplate empty, but configJson contains sqlPreview.
 * We support all known config shapes.
 */
export function tryGetCountSqlFromIndicator(ind: IndicatorDto): { sql: string; source: CountSqlSource } {
    const direct = (ind?.sqlTemplate ?? '').trim();
    if (direct) return { sql: direct, source: 'indicator.sqlTemplate' };

    try {
        const parsed: any = ind?.configJson ? JSON.parse(ind.configJson) : null;

        // flat
        const flatPreview = (parsed?.sqlPreview ?? '').trim();
        if (flatPreview) return { sql: flatPreview, source: 'configJson.sqlPreview' };

        const flatTemplate = (parsed?.sqlTemplate ?? '').trim();
        if (flatTemplate) return { sql: flatTemplate, source: 'configJson.sqlTemplate' };

        // base
        const basePreview = (parsed?.base?.sqlPreview ?? '').trim();
        if (basePreview) return { sql: basePreview, source: 'configJson.base.sqlPreview' };

        const baseTemplate = (parsed?.base?.sqlTemplate ?? '').trim();
        if (baseTemplate) return { sql: baseTemplate, source: 'configJson.base.sqlTemplate' };

        // authoring.base
        const authPreview = (parsed?.authoring?.base?.sqlPreview ?? '').trim();
        if (authPreview) return { sql: authPreview, source: 'configJson.authoring.base.sqlPreview' };

        const authTemplate = (parsed?.authoring?.base?.sqlTemplate ?? '').trim();
        if (authTemplate) return { sql: authTemplate, source: 'configJson.authoring.base.sqlTemplate' };

        // sometimes wrapped differently
        const biPreview = (parsed?.baseIndicator?.sqlPreview ?? '').trim();
        if (biPreview) return { sql: biPreview, source: 'configJson.baseIndicator.sqlPreview' };

        const biTemplate = (parsed?.baseIndicator?.sqlTemplate ?? '').trim();
        if (biTemplate) return { sql: biTemplate, source: 'configJson.baseIndicator.sqlTemplate' };

        return { sql: '', source: 'none' };
    } catch {
        return { sql: '', source: 'none(parse-error)' };
    }
}

/**
 * Extract the primary table alias from a SQL query.
 * Looks for patterns like "FROM table_name alias" or "FROM table_name AS alias"
 * Returns the alias or null if not found.
 */
function extractTableAlias(sql: string): string | null {
    // Match: FROM table_name alias or FROM table_name AS alias
    // Skip if inside parentheses (subqueries) - we only care about the first FROM
    const fromPattern = /FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:AS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\b/i;
    const match = sql.match(fromPattern);
    return match ? match[2] : null;
}

/**
 * Convert a base indicator COUNT sqlTemplate into a population query.
 *
 * Supports BOTH:
 *  A) Base-style COUNT SQL:
 *     SELECT COUNT(*) AS total
 *     FROM <table> a
 *     ...
 *
 *  B) Composite-style COUNT SQL:
 *     WITH A AS (...), B AS (...)
 *     SELECT COUNT(*) AS total
 *     FROM ( SELECT A.client_id ... ) X;
 *
 * For composite-style, we MUST preserve the WITH ... prefix,
 * otherwise the resulting query references A/B without defining them.
 */
export function countSqlToPopulationSql(sql: string, idColumn: string, unit: 'Patients' | 'Encounters') {
    // Use idColumn (from theme config) as the output field name for consistency
    // This ensures base_pop uses the same column name as the source table
    const idField = idColumn || idFieldForUnit(unit);

    const raw = (sql ?? '').trim();
    if (!raw) return '';

    // normalize trailing semicolons
    const noSemi = raw.replace(/;+\s*$/, '');

    // ✅ Case 0: Base COUNT DISTINCT SQL
    // Handle "SELECT COUNT(DISTINCT column) AS alias FROM ... WHERE ..."
    // by converting to "SELECT DISTINCT column AS {idField} FROM ... WHERE ..."
    // Preserves FROM, WHERE, JOINs, and all other clauses
    // Enhanced: supports any result alias name (not just "total") and extracts actual table alias
    const distinctPattern = /SELECT\s+COUNT\s*\(\s*DISTINCT\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\s*\)\s+AS\s+(\w+)\s*/i;
    const distinctMatch = noSemi.match(distinctPattern);
    if (distinctMatch) {
        const columnRef = distinctMatch[1]; // e.g., "a.client_id" or "client_id"
        // Get everything after "SELECT COUNT(DISTINCT ...) AS alias "
        // This preserves FROM, WHERE, JOINs, etc.
        const afterSelect = noSemi.substring(distinctMatch[0].length);

        // If column is already qualified (e.g., "a.client_id"), use it as-is
        // Always add the AS alias for consistency
        if (columnRef.includes('.')) {
            return `SELECT DISTINCT ${columnRef} AS ${idField} ${afterSelect}`.trim();
        }

        // Extract the actual table alias from FROM clause instead of assuming "a"
        const tableAlias = extractTableAlias(afterSelect) || 'a';
        return `SELECT DISTINCT ${tableAlias}.${columnRef} AS ${idField} ${afterSelect}`.trim();
    }

    // ✅ Case 1: Composite COUNT SQL
    // Preserve any WITH CTE prefix (e.g. WITH A AS (...), B AS (...))
    // Replace "SELECT COUNT(*) AS total FROM ( <inner select> ) X" with a population select.
    const countIdx = noSemi.search(/SELECT\s+COUNT\s*\(\s*\*\s*\)\s+AS\s+total/i);
    const innerMatch = noSemi.match(/FROM\s*\(\s*(SELECT[\s\S]*?)\)\s*X\b/i);

    if (countIdx >= 0 && innerMatch?.[1]) {
        const prefix = noSemi.slice(0, countIdx).trim(); // keeps WITH A,B if present
        const inner = innerMatch[1].trim().replace(/;+\s*$/, '');

        return `
${prefix}
SELECT DISTINCT pop.${idField}
FROM (
${inner}
) pop
`.trim();
    }

    // ✅ Case 2: Base COUNT SQL
    // Replace the COUNT select with a DISTINCT id select.
    // Extract the actual table alias from FROM clause instead of assuming "a"
    const tableAlias = extractTableAlias(noSemi) || 'a';
    const replaced = noSemi.replace(
        /SELECT\s+([\s\S]*?)COUNT\s*\(\s*\*\s*\)\s+AS\s+total\s*/i,
        `SELECT DISTINCT ${tableAlias}.${idColumn} AS ${idField}\n`,
    );

    // If it didn't replace, fallback: try simpler replace
    if (replaced === noSemi) {
        return noSemi.replace(/COUNT\s*\(\s*\*\s*\)\s+AS\s+total/gi, `DISTINCT ${tableAlias}.${idColumn} AS ${idField}`);
    }

    return replaced;
}

/**
 * Extracts CTEs from a SQL query and renames them to avoid conflicts.
 * Handles nested WITH clauses by recursively extracting inner CTEs to the top level.
 *
 * @param sql - The SQL query that may start WITH CTEs
 * @param prefix - Prefix to add to CTE names (e.g., 'base_' or 'filter_')
 * @returns Object with ctes string and the main query with updated references
 */
function extractAndRenameCtes(sql: string, prefix: string): { ctes: string; mainQuery: string } {
    const trimmed = sql.trim();

    // Check if SQL starts WITH
    const withMatch = trimmed.match(/^\s*WITH\s+/i);
    if (!withMatch) {
        // No CTEs, return as-is
        return { ctes: '', mainQuery: trimmed };
    }

    // Find the SELECT that starts the main query (after all CTEs)
    let parenCount = 0;
    let mainSelectIndex = -1;
    let foundWith = false;

    for (let i = 0; i < trimmed.length; i++) {
        const char = trimmed[i];

        // Track if we've passed the WITH keyword
        if (!foundWith && i >= withMatch[0].length) {
            foundWith = true;
        }

        if (char === '(') {
            parenCount++;
        } else if (char === ')') {
            parenCount--;
        }

        // Look for SELECT when we're not in parentheses
        if (foundWith && parenCount === 0) {
            if (trimmed.substring(i, i + 6).toUpperCase() === 'SELECT') {
                mainSelectIndex = i;
                break;
            }
        }
    }

    if (mainSelectIndex === -1) {
        // Couldn't find main SELECT, return as-is
        return { ctes: '', mainQuery: trimmed };
    }

    // Split into CTEs section and main query
    const ctesSection = trimmed.substring(withMatch[0].length, mainSelectIndex);
    const mainQuery = trimmed.substring(mainSelectIndex);

    // Process CTEs - handle nested WITH by recursive extraction
    const allCtes: string[] = [];
    let current = '';
    let level = 0;

    for (let i = 0; i < ctesSection.length; i++) {
        const char = ctesSection[i];

        if (char === '(') level++;
        else if (char === ')') level--;

        current += char;

        // When level returns to 0, check for comma or end
        if (level === 0 && current.trim()) {
            // Look ahead for comma
            let j = i + 1;
            while (j < ctesSection.length && /[\s]/.test(ctesSection[j])) j++;

            if (j >= ctesSection.length || ctesSection[j] === ',') {
                // Complete CTE
                const cteDef = current.trim().replace(/,$/, '');
                if (cteDef) {
                    // Match: NAME AS (body)
                    const nameMatch = cteDef.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+AS\s*\((.*)\)\s*$/);
                    if (nameMatch) {
                        const oldName = nameMatch[1];
                        let body = nameMatch[2].trim();
                        const newName = prefix + oldName;

                        // Check if body contains nested WITH clause
                        const nestedWithMatch = body.match(/^\s*WITH\s+/i);
                        if (nestedWithMatch) {
                            // Recursively extract nested CTEs
                            const nestedResult = extractAndRenameCtes(body, prefix);
                            // Add the nested CTEs first (they're referenced by the main query)
                            if (nestedResult.ctes) {
                                allCtes.push(nestedResult.ctes);
                            }
                            // Update body to use the extracted main query
                            body = nestedResult.mainQuery;
                        }

                        // Update references within body:
                        // 1. Column references like A.xxx -> base_A.xxx
                        let updatedBody = body.replace(/\b([A-D])\.(\w+)/g, `${prefix}$1.$2`);
                        // 2. Table references like FROM A, JOIN A -> FROM base_A, JOIN base_A
                        // Use negative lookbehind to avoid matching A in base_A
                        updatedBody = updatedBody.replace(/(?<![_A-Za-z0-9])([A-D])\b(?!\.)/g, `${prefix}$1`);

                        allCtes.push(`${newName} AS (\n    ${updatedBody}\n)`);
                    }
                }
                current = '';
                // Skip past comma
                if (j < ctesSection.length && ctesSection[j] === ',') {
                    i = j;
                }
            }
        }
    }

    // Update references in main query
    let updatedMainQuery = mainQuery.replace(/\b([A-D])\.(\w+)/g, `${prefix}$1.$2`);
    // Also update table references like FROM A, JOIN A
    updatedMainQuery = updatedMainQuery.replace(/(?<![_A-Za-z0-9])([A-D])\b(?!\.)/g, `${prefix}$1`);

    return {
        ctes: allCtes.join(',\n'),
        mainQuery: updatedMainQuery
    };
}

/**
 * Build composite COUNT SQL from two population queries.
 * Population queries MUST return a column named client_id or encounter_id.
 *
 * Handles the case where population queries themselves contain WITH clauses
 * (composite indicators) by extracting and renaming inner CTEs to avoid conflicts.
 */
export function buildCompositeCountSql(args: {
    unit: 'Patients' | 'Encounters';
    operator: 'AND' | 'OR' | 'A_AND_NOT_B';
    populationSqlA: string;
    populationSqlB: string;
}) {
    const idField = idFieldForUnit(args.unit);

    const rawA = args.populationSqlA.trim().replace(/;+\s*$/, '');
    const rawB = args.populationSqlB.trim().replace(/;+\s*$/, '');

    if (!rawA || !rawB) return '';

    // Extract and rename CTEs from population queries (if they are composite indicators)
    const resultA = extractAndRenameCtes(rawA, 'base_');
    const resultB = extractAndRenameCtes(rawB, 'filter_');

    // Build the flattened WITH clause with all CTEs
    // IMPORTANT: CTEs must be ordered such that inner CTEs are defined before outer CTEs
    // that reference them. The order should be:
    // 1. Inner CTEs from A (base_A, base_B, ...)
    // 2. Inner CTEs from B (filter_A, filter_B, ...)
    // 3. Outer CTE A (which references base_*)
    // 4. Outer CTE B (which references filter_*)
    const withCtes: string[] = [];

    // Add inner CTEs from A (renamed with base_ prefix) - these come first
    if (resultA.ctes) {
        withCtes.push(resultA.ctes);
    }

    // Add inner CTEs from B (renamed with filter_ prefix) - these come second
    if (resultB.ctes) {
        withCtes.push(resultB.ctes);
    }

    // Add outer CTE declarations for A and B - these come last and reference the inner CTEs
    withCtes.push(`A AS (\n  ${resultA.mainQuery}\n)`);
    withCtes.push(`B AS (\n  ${resultB.mainQuery}\n)`);

    // Build the final query based on operator
    let innerSelect = '';

    if (args.operator === 'AND') {
        innerSelect = `SELECT A.${idField}\n  FROM A\n  INNER JOIN B ON B.${idField} = A.${idField}`;
    } else if (args.operator === 'OR') {
        innerSelect = `SELECT ${idField} FROM A\n  UNION\n  SELECT ${idField} FROM B`;
    } else {
        // A_AND_NOT_B
        innerSelect = `SELECT A.${idField}\n  FROM A\n  LEFT JOIN B ON B.${idField} = A.${idField}\n  WHERE B.${idField} IS NULL`;
    }

    return `
WITH
${withCtes.join(',\n')}
SELECT COUNT(*) AS total
FROM (
  ${innerSelect}
) X;
`.trim();
}

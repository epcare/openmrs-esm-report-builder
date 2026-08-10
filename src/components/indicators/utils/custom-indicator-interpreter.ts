/**
 * Custom Indicator Query Interpreter
 *
 * Analyzes and processes custom indicator SQL to enable:
 * 1. Population SQL extraction for section disaggregation
 * 2. Filter logic preservation
 * 3. Query structure analysis
 * 4. Configuration validation
 */

import type {
    CustomIndicatorConfig,
    PatientIdColumn,
    QueryStructureAnalysis,
    FilterPreservationRule
} from '../types/custom-indicator.types';

// Re-export types for convenience
export type { CustomIndicatorConfig, PatientIdColumn, QueryStructureAnalysis, FilterPreservationRule };

/**
 * Result of population SQL extraction
 */
export type PopulationExtractionResult = {
    /** The extracted population SQL */
    sql: string;
    /** Whether extraction was successful */
    success: boolean;
    /** Any warnings or issues */
    warnings?: string[];
    /** The detected patient ID column */
    patientIdColumn?: PatientIdColumn;
};

/**
 * Query validation result
 */
export type ValidationResult = {
    /** Whether the configuration is valid */
    valid: boolean;
    /** Validation errors */
    errors: string[];
    /** Validation warnings */
    warnings: string[];
    /** Information messages */
    info: string[];
};

/**
 * Custom Indicator Query Interpreter
 *
 * Analyzes complex custom indicator SQL and enables section-level re-disaggregation
 * while preserving business logic and filters.
 */
export class CustomIndicatorInterpreter {
    /**
     * Analyze custom indicator SQL and extract metadata
     *
     * @param sql - The SQL template to analyze
     * @param config - Optional custom indicator configuration
     * @returns Query structure analysis
     */
    analyze(sql: string, config?: CustomIndicatorConfig): QueryStructureAnalysis {
        const result: QueryStructureAnalysis = {
            patientIdColumn: config?.patientIdColumn || this.detectPatientIdColumn(sql),
            hasPopulationQuery: false,
            filters: [],
            joinStructure: [],
            redisaggregatable: false,
            confidence: 0
        };

        // Detect population query structure
        const populationPatterns = [
            // Pattern 1: COUNT DISTINCT with FROM subquery
            /SELECT\s+COUNT\s*\(\s*DISTINCT\s+(\w+)\.?(\w+)\s*\)\s*FROM\s*\(\s*SELECT/i,
            // Pattern 2: Simple subquery with GROUP BY
            /FROM\s*\(\s*SELECT\s+.*?GROUP\s+BY\s+(client_id|patient_id|person_id)/i,
            // Pattern 3: Direct population query
            /SELECT\s+DISTINCT\s+(client_id|patient_id|person_id)/i
        ];

        for (const pattern of populationPatterns) {
            if (pattern.test(sql)) {
                result.hasPopulationQuery = true;
                result.confidence += 0.3;
                break;
            }
        }

        // Extract JOINs
        const joinPatterns = [
            { type: 'INNER JOIN', pattern: /INNER\s+JOIN\s+(\w+(?:\s+\w+)?)\s+(?:AS\s+)?(\w+)\s+ON\s+([^\n]+)/gi },
            { type: 'LEFT JOIN', pattern: /LEFT\s+(?:OUTER\s+)?JOIN\s+(\w+(?:\s+\w+)?)\s+(?:AS\s+)?(\w+)\s+ON\s+([^\n]+)/gi },
            { type: 'CROSS JOIN', pattern: /CROSS\s+JOIN\s+(\w+(?:\s+\w+)?)\s+(?:AS\s+)?(\w+)/gi }
        ];

        for (const { type, pattern } of joinPatterns) {
            let match;
            while ((match = pattern.exec(sql)) !== null) {
                result.joinStructure.push({
                    type: type as any,
                    table: match[1]?.trim() || '',
                    alias: match[2]?.trim() || '',
                    condition: match[3]?.trim() || ''
                });
                result.confidence += 0.1;
            }
        }

        // Detect filters
        const filterPatterns = [
            // Death filter
            { name: 'death_filter', pattern: /p\.dead\s*=\s*1/i, type: 'WHERE' },
            // Transfer out filter
            { name: 'transfer_out_filter', pattern: /mfto\.client_id\s+IS\s+NULL/i, type: 'WHERE' },
            // Lost to follow-up filter
            { name: 'lost_filter', pattern: /ltfp_days\s*>\s*(?:\d+)/i, type: 'WHERE' },
            // Prison filter
            { name: 'prison_filter', pattern: /special_category\s*=\s*'In prison'/i, type: 'INNER JOIN' }
        ];

        for (const { name, pattern, type } of filterPatterns) {
            if (pattern.test(sql)) {
                result.filters.push({ name, type: type as any, pattern: pattern.source });
                result.confidence += 0.05;
            }
        }

        // Determine re-disaggregatability
        result.redisaggregatable =
            result.hasPopulationQuery &&
            result.confidence >= 0.5 &&
            result.patientIdColumn !== undefined;

        return result;
    }

    /**
     * Extract population SQL for section disaggregation
     *
     * @param sql - The SQL template to process
     * @param config - Custom indicator configuration
     * @returns Extracted population SQL or error message
     */
    extractPopulationSql(sql: string, config?: CustomIndicatorConfig): PopulationExtractionResult {
        const result: PopulationExtractionResult = {
            sql: '',
            success: false,
            warnings: []
        };

        console.log('🔍 [Interpreter] Extracting population SQL:', {
            sqlLength: sql?.length || 0,
            sqlPreview: sql?.substring(0, 200) || 'EMPTY',
            config: config,
            fullSql: sql?.substring(0, 500) || 'EMPTY'
        });

        if (!sql || !sql.trim()) {
            result.warnings?.push('Empty SQL template');
            console.error('❌ [Interpreter] Empty SQL provided');
            return result;
        }

        // Decode HTML entities (common in database-stored SQL)
        const processedSql = sql
            .replace(/&amp;lt;/g, '<')
            .replace(/&amp;gt;/g, '>')
            .replace(/&amp;amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/\\n/g, '\n')
            .trim();

        // Pattern 0: TX-RTT style queries - disaggregated with age_group, sex, COUNT(DISTINCT)
        // Structure: SELECT ... AS age_group, ... AS sex, COUNT(DISTINCT a.client_id) AS value
        //            FROM (SELECT client_id, ... FROM ... GROUP BY client_id) a
        //            [multiple JOINs] WHERE ... GROUP BY age_group, sex
        const txRttPattern =
            /SELECT\s+(.+?)\s+AS\s+age_group\s*,\s*(.+?)\s+AS\s+sex\s*,\s*COUNT\s*\(\s*DISTINCT\s+(\w+)\.(\w+)\s*\)\s+AS\s+value\s+FROM\s*\(\s*(SELECT\s+client_id[\s\S]*?)\s*\)\s*(\w+)([\s\S]*?)GROUP\s+BY\s+age_group\s*,\s*sex\s*;?\s*$/i;
        const txRttMatch = processedSql.match(txRttPattern);

        if (txRttMatch && txRttMatch[5]) {
            console.log('✅ [Interpreter] Detected TX-RTT style disaggregated query');
            // Extract matched groups - some are unused but kept for documentation/debugging
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _ageColumn = txRttMatch[1]; // e.g., 'mda.datim_agegroup'
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _sexColumn = txRttMatch[2]; // e.g., 'mdp.gender'
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _tableAlias = txRttMatch[3]; // e.g., 'a'
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _idColumn = txRttMatch[4]; // e.g., 'client_id'
            const innerQuery = txRttMatch[5]; // The population subquery
            const outerAlias = txRttMatch[6]; // e.g., 'a'
            const restOfQuery = txRttMatch[7]; // JOINs and WHERE

            // Extract patient ID column from the inner query
            result.patientIdColumn = 'client_id';

            // Build population SQL by using the inner query and all JOINs/WHERE from outer
            // The key is to preserve all the filtering logic from the outer query
            // Remove the GROUP BY age_group, sex at the end and keep all JOINs/WHERE
            const populationQuery = `SELECT DISTINCT ${outerAlias}.client_id AS patient_id
FROM (
  ${this.indent(innerQuery, 2)}
) ${outerAlias}
${restOfQuery.replace(/GROUP\s+BY\s+age_group\s*,\s*sex\s*;?\s*$/i, '').trim()}`.trim();

            result.sql = populationQuery;
            result.success = true;
            result.warnings?.push('Extracted population SQL from TX-RTT style query');
            console.log('📊 [Interpreter] TX-RTT population SQL length:', populationQuery.length);
            return result;
        }

        // Pattern 1: COUNT DISTINCT with FROM subquery that has JOINs
        // SELECT COUNT(DISTINCT a.client_id) FROM (SELECT ...) a LEFT JOIN ... WHERE ...
        const countDistinctFromPattern =
            /SELECT\s+COUNT\s*\(\s*DISTINCT\s+(\w+)\.?(\w*)\s*\)\s*FROM\s*\(\s*(SELECT[\s\S]*?)\s*\)\s*(\w+)\s*([\s\S]*)/;
        const countDistinctMatch = processedSql.match(countDistinctFromPattern);

        if (countDistinctMatch && countDistinctMatch[3]) {
            const countColumn = countDistinctMatch[1];
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const tableAlias = countDistinctMatch[2] || countDistinctMatch[4];
            const innerQuery = countDistinctMatch[3].trim();
            const outerAlias = countDistinctMatch[4];
            const restOfQuery = countDistinctMatch[5] || '';

            // Check if inner query has GROUP BY client_id or similar
            if (/GROUP\s+BY\s+(client_id|patient_id|person_id)/i.test(innerQuery)) {
                // Extract patient ID column
                const patientIdMatch = innerQuery.match(/GROUP\s+BY\s+(client_id|patient_id|person_id)/i);
                if (patientIdMatch) {
                    result.patientIdColumn = patientIdMatch[1] as PatientIdColumn;
                }

                // Build population SQL preserving JOINs and WHERE
                result.sql = `SELECT DISTINCT ${outerAlias}.${countColumn} AS ${result.patientIdColumn || 'patient_id'}\nFROM (\n  ${this.indent(innerQuery, 2)}\n) ${outerAlias}\n${restOfQuery.trim()}`;
                result.success = true;
                return result;
            }
        }

        // Pattern 2: Simple population query (already in correct format)
        // Handles both:
        // - SELECT DISTINCT a.client_id AS patient_id FROM ...
        // - SELECT DISTINCT a.client_id FROM (...) a ...
        // This is for indicators like PIPS and sqlPreview that already have population SQL structure
        const populationQueryPatterns = [
            // Pattern 2a: With AS alias (SELECT DISTINCT a.client_id AS patient_id FROM ...)
            /SELECT\s+DISTINCT\s+(\w+\.\w+)\s+AS\s+(?:patient_id|client_id)(?:\s+FROM\s+[\s\S]+)?/i,
            // Pattern 2b: Without AS alias, followed by FROM (SELECT DISTINCT a.client_id FROM ...)
            /SELECT\s+DISTINCT\s+(\w+\.\w+)\s+FROM\s+/i,
        ];

        for (const pattern of populationQueryPatterns) {
            const match = processedSql.match(pattern);
            if (match && match[1]) {
                console.log('✅ [Interpreter] Detected simple population query, using as-is');
                // Extract patient ID column from the match
                const columnRef = match[1]; // e.g., 'a.client_id'
                const idColumn = columnRef.includes('.') ? columnRef.split('.')[1] : columnRef;
                result.patientIdColumn = (idColumn === 'client_id' || idColumn === 'patient_id' || idColumn === 'person_id')
                    ? idColumn as PatientIdColumn
                    : 'client_id';

                // If the SQL doesn't have an AS alias for the patient_id, add one for consistency
                // This ensures the column name matches what applyDisaggregation expects
                if (!/\s+AS\s+(?:patient_id|client_id)\s*FROM/i.test(processedSql)) {
                    // Add AS alias
                    result.sql = processedSql.replace(
                        new RegExp(`SELECT\\s+DISTINCT\\s+${columnRef.replace('.', '\\.')}\\s+FROM`, 'i'),
                        `SELECT DISTINCT ${columnRef} AS ${result.patientIdColumn} FROM`
                    );
                } else {
                    result.sql = processedSql;
                }

                result.success = true;
                result.warnings?.push('Using simple population query as-is');
                return result;
            }
        }

        // Pattern 3: Already-disaggregated query with age_group/sex and COUNT
        // SELECT ... AS age_group, ... AS sex, COUNT(...) FROM (subquery) a ... GROUP BY age_group, sex
        const alreadyDisaggPattern =
            /SELECT\s+[\s\S]*?AS\s+age_group[\s\S]*?AS\s+(?:sex|gender)[\s\S]*?COUNT\s*\([\s\S]*?\)\s+FROM\s*\(\s*([\s\S]*?)\s*\)\s*(\w+)([\s\S]*?)GROUP\s+BY\s+(?:age_group|months|lost)[\s\S]*?,\s*(?:sex|gender)/i;
        const alreadyDisaggMatch = processedSql.match(alreadyDisaggPattern);

        if (alreadyDisaggMatch && alreadyDisaggMatch[1]) {
            console.log('✅ [Interpreter] Detected already-disaggregated query, extracting population SQL');
            const innerQuery = alreadyDisaggMatch[1].trim();
            const outerAlias = alreadyDisaggMatch[2];
            const restOfQuery = alreadyDisaggMatch[3] || '';

            // Try to find patient_id column in the inner query
            const patientIdMatch = innerQuery.match(/(?:FROM|JOIN)\s+(\w+)\.(?:\w+)?\s+(?:\w+)\s+ON|(?:\w+\.)?(client_id|patient_id|person_id)/i);
            const patientIdColumn = patientIdMatch ? (patientIdMatch[1] || patientIdMatch[2]) as PatientIdColumn : 'client_id';

            result.patientIdColumn = patientIdColumn;
            // Reconstruct the population query including the JOINs and WHERE conditions
            result.sql = `SELECT DISTINCT ${outerAlias}.${patientIdColumn} AS patient_id\nFROM (\n  ${this.indent(innerQuery, 2)}\n) ${outerAlias}${restOfQuery.trim()}`.replace(/GROUP\s+BY\s+[\s\S]*?;/i, ';');
            result.success = true;
            result.warnings?.push('Extracted population SQL from already-disaggregated query');
            return result;
        }

        // Pattern 4: Complex WITH clause with built-in disaggregation
        // WITH base_pop AS (SELECT age_group, sex, COUNT(*) FROM (population_query) ...)
        const complexWithPattern =
            /WITH\s+\w+\s+AS\s*\(\s*SELECT\s+[\s\S]*?FROM\s*\(\s*(SELECT[\s\S]*?)\s*\)\s*(\w+)\s*WHERE/i;
        const withMatch = processedSql.match(complexWithPattern);

        if (withMatch && withMatch[1]) {
            const populationSql = withMatch[1].trim();

            if (/GROUP\s+BY\s+(client_id|patient_id|person_id)/i.test(populationSql)) {
                const patientIdMatch = populationSql.match(/GROUP\s+BY\s+(client_id|patient_id|person_id)/i);
                if (patientIdMatch) {
                    result.patientIdColumn = patientIdMatch[1] as PatientIdColumn;
                }

                result.sql = populationSql;
                result.success = true;
                result.warnings?.push('Extracted population SQL from complex WITH clause');
                return result;
            }
        }

        // Pattern 4: Simple COUNT query
        if (/SELECT\s+COUNT\s*\(/i.test(processedSql)) {
            result.warnings?.push('Query is a simple COUNT without clear population structure');
            result.sql = processedSql; // Return as-is for processing by other methods
            return result;
        }

        result.warnings?.push('Could not extract population SQL - unclear query structure');
        return result;
    }

    /**
     * Apply section disaggregation while preserving filters
     *
     * @param sql - The population SQL
     * @param sectionConfig - Section configuration for disaggregation
     * @param config - Custom indicator configuration
     * @returns SQL with section disaggregation applied
     */
    applyDisaggregation(
        sql: string,
        sectionConfig: { ageCategoryCode: string; genders: Array<'F' | 'M'> },
        config?: CustomIndicatorConfig
    ): string {
        if (!sql || !sql.trim()) {
            return '-- Error: Empty population SQL provided for disaggregation';
        }

        // Remove trailing semicolons - they cause "Multiple statements" errors when used in CTEs
        const cleanedSql = sql.trim().replace(/;+\s*$/, '');

        const patientIdCol = config?.patientIdColumn || 'patient_id';
        const selectedGenders = sectionConfig.genders.length ? sectionConfig.genders : ['F', 'M'];
        const genderList = selectedGenders.map((g) => `'${g}'`).join(',');

        return `
WITH base_pop AS (
  ${this.indent(cleanedSql, 2)}
),
ag AS (
  SELECT
    ag.age_group_id,
    ag.label,
    ag.min_age_days,
    ag.max_age_days,
    ag.sort_order
  FROM report_builder_dim_age_group ag
  JOIN report_builder_dim_age_category ac
    ON ac.age_category_id = ag.age_category_id
  WHERE ac.code = '${sectionConfig.ageCategoryCode}'
    AND ag.is_active = 1
),
genders AS (
  SELECT 'F' AS gender
  UNION ALL SELECT 'M' AS gender
),
cnt AS (
  SELECT
    ag.age_group_id AS age_group_id,
    mdp.gender AS gender,
    COUNT(DISTINCT base_pop.${patientIdCol}) AS value
  FROM base_pop
  JOIN mamba_fact_patients_latest_patient_demographics mdp
    ON mdp.${patientIdCol} = base_pop.${patientIdCol}
  JOIN ag
    ON TIMESTAMPDIFF(DAY, mdp.birthdate, :endDate)
       BETWEEN ag.min_age_days AND ag.max_age_days
  WHERE mdp.birthdate IS NOT NULL
    AND mdp.gender IS NOT NULL
    AND mdp.gender IN (${genderList})
  GROUP BY ag.age_group_id, mdp.gender
)
SELECT
  ag.label AS age_group,
  g.gender AS gender,
  COALESCE(cnt.value, 0) AS value
FROM ag
CROSS JOIN genders g
LEFT JOIN cnt
    ON cnt.age_group_id = ag.age_group_id
   AND cnt.gender = g.gender
ORDER BY ag.sort_order, g.gender;`.trim();
    }

    /**
     * Validate custom indicator configuration
     *
     * @param config - Custom indicator configuration to validate
     * @param sql - Optional SQL template for validation
     * @returns Validation result
     */
    validate(config: CustomIndicatorConfig, sql?: string): ValidationResult {
        const result: ValidationResult = {
            valid: true,
            errors: [],
            warnings: [],
            info: []
        };

        // Validate required fields
        if (!config.patientIdColumn) {
            result.errors.push('patientIdColumn is required');
            result.valid = false;
        }

        if (!config.populationQuery) {
            result.errors.push('populationQuery configuration is required');
            result.valid = false;
        }

        if (!config.supportsRedisaggregation && config.redisaggregationStrategy !== 'none') {
            result.warnings.push('Redisaggregation strategy set but supportsRedisaggregation is false');
        }

        // Validate SQL if provided
        if (sql && sql.trim()) {
            const analysis = this.analyze(sql, config);

            if (!analysis.hasPopulationQuery && config.supportsRedisaggregation) {
                result.warnings.push('SQL does not appear to have a clear population query structure');
            }

            if (analysis.patientIdColumn !== config.patientIdColumn) {
                result.warnings.push(`Configured patientIdColumn (${config.patientIdColumn}) differs from detected (${analysis.patientIdColumn})`);
            }

            if (config.supportsRedisaggregation && !analysis.redisaggregatable) {
                result.errors.push('SQL structure does not support re-disaggregation');
                result.valid = false;
            }

            result.info.push(`Query analysis confidence: ${Math.round(analysis.confidence * 100)}%`);
        }

        // Validate filter preservation rules
        if (config.preserveFilters && config.preserveFilters.length > 0) {
            for (const filter of config.preserveFilters) {
                if (!filter.name || !filter.joinPattern || !filter.wherePattern) {
                    result.errors.push(`Filter "${filter.name}" is missing required patterns`);
                    result.valid = false;
                }
            }
        }

        return result;
    }

    /**
     * Detect patient ID column from SQL
     *
     * @param sql - SQL to analyze
     * @returns Detected patient ID column
     */
    private detectPatientIdColumn(sql: string): PatientIdColumn {
        const patterns = [
            { column: 'client_id' as PatientIdColumn, pattern: /\bclient_id\b/i },
            { column: 'patient_id' as PatientIdColumn, pattern: /\bpatient_id\b/i },
            { column: 'person_id' as PatientIdColumn, pattern: /\bperson_id\b/i }
        ];

        // Count occurrences of each patient ID column
        const counts = patterns.map(({ column, pattern }) => ({
            column,
            count: (sql.match(pattern) || []).length
        }));

        // Return the most common patient ID column
        const mostCommon = counts.sort((a, b) => b.count - a.count)[0];
        return mostCommon.count > 0 ? mostCommon.column : 'client_id';
    }

    /**
     * Indent SQL by a number of spaces
     *
     * @param sql - SQL to indent
     * @param spaces - Number of spaces to indent
     * @returns Indented SQL
     */
    private indent(sql: string, spaces: number): string {
        const pad = ' '.repeat(spaces);
        return sql
            .split('\n')
            .map((line) => (line.trim() ? pad + line : line))
            .join('\n');
    }
}

/**
 * Singleton instance of the query interpreter
 */
export const customIndicatorInterpreter = new CustomIndicatorInterpreter();
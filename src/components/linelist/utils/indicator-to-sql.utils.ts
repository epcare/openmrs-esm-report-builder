/**
 * Convert Indicator Population Config to Linelist Cohort SQL
 *
 * This utility converts indicator-based population configurations
 * into SQL suitable for linelist cohort definitions.
 */

import type { IndicatorPopulationConfig, PopulationConfiguration } from '../types/indicator-population.types';
import type { DataThemeConfig } from '../../indicators/types/data-theme-config.types';
import { applyConditionClauses } from '../../indicators/utils/indicator-sql.utils';

/**
 * Convert a single indicator rule to SQL WHERE clause
 * Returns the SQL for finding patients matching the indicator conditions
 */
function convertIndicatorRuleToWhere(
  rule: IndicatorPopulationConfig,
  themeConfig: DataThemeConfig
): string {
  // Start with base SQL for the indicator
  const baseSql = buildSqlBaseQuery(themeConfig);

  // Apply indicator conditions
  const sqlWithConditions = applyConditionClauses(
    baseSql,
    themeConfig.conditions || [],
    rule.conditions
  );

  // Extract just the WHERE clause for combining
  const whereStart = sqlWithConditions.indexOf('WHERE');
  if (whereStart === -1) {
    return '1=1'; // No conditions
  }

  let whereClause = sqlWithConditions.substring(whereStart + 5).trim();

  // Remove trailing semicolon and other clauses
  const semicolonIdx = whereClause.indexOf(';');
  if (semicolonIdx !== -1) {
    whereClause = whereClause.substring(0, semicolonIdx).trim();
  }

  // Remove ORDER BY, GROUP BY, LIMIT if present (they come after WHERE)
  const orderByIdx = whereClause.indexOf('ORDER BY');
  if (orderByIdx !== -1) {
    whereClause = whereClause.substring(0, orderByIdx).trim();
  }

  const groupByIdx = whereClause.indexOf('GROUP BY');
  if (groupByIdx !== -1) {
    whereClause = whereClause.substring(0, groupByIdx).trim();
  }

  return whereClause;
}

/**
 * Build base SQL query for linelist from theme config
 * This selects distinct patient_ids
 */
function buildSqlBaseQuery(themeConfig: DataThemeConfig): string {
  const { sourceTable, patientIdColumn, dateColumn, joins } = themeConfig;

  const lines: string[] = [];

  lines.push('SELECT');
  lines.push(`  DISTINCT ${sourceTable}.${patientIdColumn} AS patient_id`);

  // Add joins if defined
  // const joinTables = joins?.map((j) => {
  //   const match = j.joinSql.match(/JOIN\s+(\S+)/i);
  //   return match ? match[1] : j.alias;
  // });

  lines.push(`FROM ${sourceTable}`);

  // Add joins
  if (joins && joins.length > 0) {
    joins.forEach((join) => {
      lines.push(join.joinSql);
    });
  }

  lines.push('WHERE');

  // Date filtering
  if (dateColumn) {
    lines.push(`  ${sourceTable}.${dateColumn} >= :startDate`);
    lines.push(`  AND ${sourceTable}.${dateColumn} < :endDate`);
  } else {
    lines.push(`  1=1`); // Placeholder for date filtering
  }

  return lines.join('\n');
}

/**
 * Convert a single indicator rule to full linelist cohort SQL
 */
export function convertIndicatorRule(rule: IndicatorPopulationConfig, themeConfig: DataThemeConfig): string {
  const baseSql = buildSqlBaseQuery(themeConfig);
  const whereClause = convertIndicatorRuleToWhere(rule, themeConfig);

  // Replace the WHERE clause in base SQL with our conditions
  const whereIdx = baseSql.indexOf('WHERE');
  if (whereIdx === -1) {
    return baseSql + '\nAND ' + whereClause;
  }

  const beforeWhere = baseSql.substring(0, whereIdx + 5); // Include "WHERE"
  const afterWhereStart = baseSql.indexOf('\n', whereIdx);
  const afterWhere = afterWhereStart !== -1
    ? baseSql.substring(afterWhereStart)
    : '';

  // Build final SQL
  let finalSql = beforeWhere + '\n';

  // Add custom SQL if present
  if (rule.customSql) {
    finalSql += '  ' + rule.customSql + '\n';
  }

  // Add conditions
  const conditionLines = whereClause.split('\n').map((line) => {
    const trimmed = line.trim();
    // Skip empty lines and fix indentation
    if (!trimmed) return '';
    if (trimmed.startsWith('AND')) return '  ' + trimmed;
    return '  AND ' + trimmed;
  }).filter(Boolean);

  finalSql += conditionLines.join('\n') + '\n';

  // Add back any trailing clauses
  if (afterWhere.trim()) {
    finalSql += afterWhere.trim() + '\n';
  }

  // Handle negation (NOT)
  if (rule.negate) {
    // Wrap in NOT EXISTS subquery
    finalSql = `SELECT patient_id\nFROM (\n${finalSql}) AS matches\nWHERE 1=0`;
  }

  return finalSql;
}

/**
 * Combine multiple indicator rules into a single SQL query
 * Rules are combined using their logicalOperator (AND/OR)
 */
export function combineIndicatorRules(
  rules: IndicatorPopulationConfig[],
  themeConfig: DataThemeConfig
): string {
  if (!rules || rules.length === 0) {
    return buildSqlBaseQuery(themeConfig);
  }

  if (rules.length === 1) {
    return convertIndicatorRule(rules[0], themeConfig);
  }

  // Build subqueries for each rule
  const subqueries: string[] = [];
  const negateQueries: string[] = [];

  for (const rule of rules) {
    const sql = convertIndicatorRule(rule, themeConfig);

    if (rule.negate) {
      negateQueries.push(sql);
    } else {
      subqueries.push(sql);
    }
  }

  // Build the combined query
  const lines: string[] = [];
  const { sourceTable } = themeConfig;

  lines.push('SELECT DISTINCT base.patient_id');
  lines.push(`FROM ${sourceTable} base`);

  // Positive matches with UNION/INTERSECT
  if (subqueries.length > 0) {
    if (rules[0]?.logicalOperator === 'OR') {
      // OR means UNION
      lines.push('WHERE base.patient_id IN (');
      lines.push(subqueries.map((q) => `  (${q})`).join('\n  UNION\n'));
      lines.push(')');
    } else {
      // AND means INTERSECT (all conditions must match)
      // For simplicity, use nested EXISTS
      subqueries.forEach((q, idx) => {
        const alias = `match${idx}`;
        lines.push(`  AND EXISTS (${q.replace(/SELECT/g, `SELECT 1 FROM ${sourceTable} ${alias} WHERE ${alias}.patient_id = base.patient_id AND`)})`);
      });
    }
  }

  // Negative matches (NOT EXISTS)
  negateQueries.forEach((q) => {
    lines.push(`  AND NOT EXISTS (${q})`);
  });

  // Add date filter if defined
  if (themeConfig.dateColumn) {
    lines.push(`  AND base.${themeConfig.dateColumn} >= :startDate`);
    lines.push(`  AND base.${themeConfig.dateColumn} < :endDate`);
  }

  return lines.join('\n');
}

/**
 * Convert full population configuration to linelist cohort SQL
 */
export function convertPopulationConfig(config: PopulationConfiguration, themeConfig: DataThemeConfig): string {
  switch (config.mode) {
    case 'SQL':
      return config.sql || buildSqlBaseQuery(themeConfig);

    case 'INDICATOR':
      if (!config.indicatorRules || config.indicatorRules.length === 0) {
        return buildSqlBaseQuery(themeConfig);
      }
      return combineIndicatorRules(config.indicatorRules, themeConfig);

    case 'HYBRID': {
      // Start with indicator rules and append custom SQL
      let sql = buildSqlBaseQuery(themeConfig);
      if (config.indicatorRules && config.indicatorRules.length > 0) {
        sql = combineIndicatorRules(config.indicatorRules, themeConfig);
      }
      if (config.sql) {
        // Append custom SQL with AND
        const whereIdx = sql.indexOf('WHERE');
        if (whereIdx !== -1) {
          const beforeSemicolon = sql.indexOf(';');
          const insertAt = beforeSemicolon !== -1 ? beforeSemicolon : sql.length;
          sql = sql.substring(0, insertAt) + `  AND (${config.sql})\n` + sql.substring(insertAt);
        }
      }
      return sql;
    }

    default:
      return buildSqlBaseQuery(themeConfig);
  }
}

/**
 * Validate indicator population configuration
 */
export function validateIndicatorConfig(config: PopulationConfiguration): string[] {
  const errors: string[] = [];

  if (config.mode === 'INDICATOR' || config.mode === 'HYBRID') {
    if (!config.indicatorRules || config.indicatorRules.length === 0) {
      errors.push('At least one indicator rule is required');
    }

    config.indicatorRules?.forEach((rule, idx) => {
      if (!rule.indicatorUuid) {
        errors.push(`Indicator rule ${idx + 1} is missing indicator UUID`);
      }
      if (!rule.name) {
        errors.push(`Indicator rule ${idx + 1} is missing a name`);
      }
    });
  }

  if (config.mode === 'SQL' && !config.sql) {
    errors.push('SQL is required when in SQL mode');
  }

  return errors;
}

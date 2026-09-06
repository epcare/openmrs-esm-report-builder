/**
 * Privilege catalog for the report builder.
 *
 * Mirrors the backend catalog — api/.../security/ReportBuilderPrivileges.java and
 * omod/src/main/resources/configuration/privileges/reportbuilder-privileges.csv
 * (see openmrs-module-report-builder README.md -> Security: Privileges & Roles).
 * Keep in sync — if the backend catalog changes, this file changes.
 *
 * This is the ONLY source file allowed to contain `Task: reportbuilder.` literals.
 * The one exception is routes.json, whose `privileges` key gates the System
 * Administration card link declaratively (framework-enforced) — keep that string
 * in sync with RB.REPORT_VIEW.
 */
export const RB_PREFIX = 'Task: reportbuilder.';

const rb = (suffix: string) => `${RB_PREFIX}${suffix}`;

export const RB = {
  // Report definitions
  REPORT_VIEW: rb('report.view'),
  REPORT_ADD: rb('report.add'),
  REPORT_EDIT: rb('report.edit'),
  REPORT_PURGE: rb('report.purge'),
  REPORT_COMPILE: rb('report.compile'),
  REPORT_RUN: rb('report.run'),
  // Indicators
  INDICATOR_VIEW: rb('indicator.view'),
  INDICATOR_ADD: rb('indicator.add'),
  INDICATOR_EDIT: rb('indicator.edit'),
  INDICATOR_PURGE: rb('indicator.purge'),
  // Report sections
  SECTION_VIEW: rb('section.view'),
  SECTION_ADD: rb('section.add'),
  SECTION_EDIT: rb('section.edit'),
  SECTION_PURGE: rb('section.purge'),
  // Data themes
  THEME_VIEW: rb('theme.view'),
  THEME_ADD: rb('theme.add'),
  THEME_EDIT: rb('theme.edit'),
  THEME_PURGE: rb('theme.purge'),
  // Dashboards
  DASHBOARD_VIEW: rb('dashboard.view'),
  DASHBOARD_ADD: rb('dashboard.add'),
  DASHBOARD_EDIT: rb('dashboard.edit'),
  DASHBOARD_PURGE: rb('dashboard.purge'),
  // Report categories
  CATEGORY_VIEW: rb('category.view'),
  CATEGORY_ADD: rb('category.add'),
  CATEGORY_EDIT: rb('category.edit'),
  CATEGORY_PURGE: rb('category.purge'),
  // Age categories & age groups
  AGEGROUP_VIEW: rb('agegroup.view'),
  AGEGROUP_ADD: rb('agegroup.add'),
  AGEGROUP_EDIT: rb('agegroup.edit'),
  AGEGROUP_PURGE: rb('agegroup.purge'),
  // Report library
  LIBRARY_VIEW: rb('library.view'),
  LIBRARY_ADD: rb('library.add'),
  LIBRARY_EDIT: rb('library.edit'),
  LIBRARY_PURGE: rb('library.purge'),
  // ETL sources
  ETLSOURCE_VIEW: rb('etlsource.view'),
  ETLSOURCE_ADD: rb('etlsource.add'),
  ETLSOURCE_EDIT: rb('etlsource.edit'),
  ETLSOURCE_PURGE: rb('etlsource.purge'),
  // ETL health monitors
  ETLMONITOR_VIEW: rb('etlmonitor.view'),
  ETLMONITOR_ADD: rb('etlmonitor.add'),
  ETLMONITOR_EDIT: rb('etlmonitor.edit'),
  ETLMONITOR_PURGE: rb('etlmonitor.purge'),
  // Cross-cutting
  SCHEMA_VIEW: rb('schema.view'),
  SQL_EXECUTE: rb('sql.execute'),
  PACKAGE_IMPORT: rb('package.import'),
  PACKAGE_EXPORT: rb('package.export'),
} as const;

export type RbPrivilege = (typeof RB)[keyof typeof RB];

/** 'Task: reportbuilder.report.edit' -> 'report.edit' (for display only). */
export const rbDisplay = (privilege: string) => privilege.replace(RB_PREFIX, '');

/**
 * Route -> required privileges (any-of semantics: holding at least one grants access).
 * Mirrors the backend FRONTEND_SECURITY_INSTRUCTIONS.md route table, extended with the
 * routes it omits (admin/themes, linelist family, dashboards/:code, etl-dashboard,
 * import-export). `/themes` (redirect) and `*` (fallback) are intentionally absent.
 */
export const ROUTE_PRIVILEGES: Record<string, string[]> = {
  '/': [RB.REPORT_VIEW],
  '/reports': [RB.REPORT_VIEW],
  '/new': [RB.REPORT_ADD],
  '/edit/:reportId': [RB.REPORT_EDIT],
  '/run': [RB.REPORT_RUN],
  '/run-reports': [RB.REPORT_RUN],
  '/indicators': [RB.INDICATOR_VIEW],
  '/sections': [RB.SECTION_VIEW],
  '/dashboards': [RB.DASHBOARD_VIEW],
  '/dashboards/:code': [RB.DASHBOARD_VIEW],
  '/etl-dashboard': [RB.DASHBOARD_VIEW],
  '/linelist': [RB.REPORT_VIEW],
  '/linelist/new': [RB.REPORT_ADD],
  '/linelist/edit/:reportId': [RB.REPORT_EDIT],
  '/linelist/run/:reportId': [RB.REPORT_RUN],
  '/admin': [RB.REPORT_VIEW],
  '/admin/report-categories': [RB.CATEGORY_VIEW],
  '/admin/age-categories': [RB.AGEGROUP_VIEW],
  '/admin/age-groups': [RB.AGEGROUP_VIEW],
  '/admin/report-library': [RB.LIBRARY_VIEW],
  '/admin/themes': [RB.THEME_VIEW],
  '/admin/etl-sources': [RB.ETLSOURCE_VIEW],
  '/admin/etl-tasks': [RB.PACKAGE_IMPORT],
  '/admin/etl-browser': [RB.ETLSOURCE_VIEW],
  '/admin/etl-monitors': [RB.ETLMONITOR_VIEW],
  '/admin/etl-monitors/builder': [RB.ETLMONITOR_VIEW],
  '/admin/dashboards': [RB.DASHBOARD_VIEW],
  '/import-export': [RB.PACKAGE_IMPORT, RB.PACKAGE_EXPORT],
};

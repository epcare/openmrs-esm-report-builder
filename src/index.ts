import { defineConfigSchema, getAsyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';

const moduleName = '@ugandaemr/esm-report-template-builder';

const options = {
  featureName: 'report-template-builder',
  moduleName,
};

export const reportTemplateBuilderAdminLink = getAsyncLifecycle(
  () => import('./report-template-builder/admin-card-link.extension'),
  options,
);

// Optional but recommended if you add translations folder
export const importTranslation = require.context('../translations', true, /.json$/, 'lazy');

export const root = getAsyncLifecycle(() => import('./root.component'), options);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}
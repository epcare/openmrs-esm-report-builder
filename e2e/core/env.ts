export const e2eBaseUrl = (process.env.E2E_BASE_URL || 'http://localhost:8080/openmrs').replace(/\/$/, '');
export const playwrightBaseUrl = process.env.PLAYWRIGHT_BASE_URL || `${e2eBaseUrl}/spa/report-builder`;
export const username = process.env.E2E_USERNAME || 'admin';
export const password = process.env.E2E_PASSWORD || 'Admin123';
export const loginLocation = process.env.E2E_LOGIN_LOCATION || '8d6c993e-c2cc-11de-8d13-0010c6dffd0f';

import { test, expect } from '../core/test';

test.describe('ETL Sources', () => {
  test('creates an ETL source and sends the expected payload', async ({ page, etlSourcesPage }) => {
    await page.route('**/ws/rest/v1/reportbuilder/etlsource**', async (route) => {
      const request = route.request();

      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ results: [] }),
        });
        return;
      }

      if (request.method() === 'POST') {
        const body = request.postDataJSON();
        expect(body).toMatchObject({
          name: 'E2E Source',
          code: 'E2E_SRC',
          schemaName: 'reporting',
          sourceType: 'mysql',
          active: true,
        });

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ uuid: 'etl-1', ...body }),
        });
        return;
      }

      await route.continue();
    });

    await etlSourcesPage.goto();
    await etlSourcesPage.expectLoaded();
    await etlSourcesPage.clickNew();
    await etlSourcesPage.fillForm({
      name: 'E2E Source',
      code: 'E2E_SRC',
      schemaName: 'reporting',
      sourceType: 'mysql',
      description: 'Created from Playwright',
      tablePatterns: 'encounter_%',
    });
    await etlSourcesPage.save();
  });
});

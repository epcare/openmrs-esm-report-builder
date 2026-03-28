import { test, expect } from '../core/test';

test.describe('report builder navigation', () => {
  test('loads the sections page', async ({ reportSectionsPage }) => {
    await reportSectionsPage.goto();
    await reportSectionsPage.expectLoaded();
  });

  test('loads the ETL Sources page', async ({ etlSourcesPage }) => {
    await etlSourcesPage.goto();
    await etlSourcesPage.expectLoaded();
  });
});

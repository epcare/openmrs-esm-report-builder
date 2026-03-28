import { test } from '../core/test';

const sectionUuid = '4278ebf9-47ab-40b8-aeca-df3e4a050c79';

test.describe('section preview validation', () => {
  test('shows a validation error when dates are missing', async ({ page, reportSectionsPage, sectionPreviewModal }) => {
    await page.route('**/ws/rest/v1/reportbuilder/section?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [{ uuid: sectionUuid, name: 'Monthly HTS Summary', configJson: '{}' }] }),
      });
    });

    await page.route(`**/ws/rest/v1/reportbuilder/section/${sectionUuid}**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ uuid: sectionUuid, name: 'Monthly HTS Summary', configJson: '{}' }),
      });
    });

    await page.route('**/ws/rest/v1/reportbuilder/indicator**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [] }),
      });
    });

    await reportSectionsPage.goto();
    await reportSectionsPage.expectLoaded();
    await reportSectionsPage.openPreviewFor('Monthly HTS Summary');
    await sectionPreviewModal.expectOpen();
    await sectionPreviewModal.run();
    await sectionPreviewModal.expectError('Start date and End date are required.');
  });
});

import { test as base, expect } from '@playwright/test';
import { AppShellPage } from '../pages/app-shell.page';
import { ETLSourcesPage } from '../pages/etl-sources.page';
import { ReportSectionsPage } from '../pages/report-sections.page';
import { SectionPreviewModal } from '../pages/section-preview.modal';

type Fixtures = {
  appShell: AppShellPage;
  etlSourcesPage: ETLSourcesPage;
  reportSectionsPage: ReportSectionsPage;
  sectionPreviewModal: SectionPreviewModal;
};

export const test = base.extend<Fixtures>({
  appShell: async ({ page }, use) => use(new AppShellPage(page)),
  etlSourcesPage: async ({ page }, use) => use(new ETLSourcesPage(page)),
  reportSectionsPage: async ({ page }, use) => use(new ReportSectionsPage(page)),
  sectionPreviewModal: async ({ page }, use) => use(new SectionPreviewModal(page)),
});

export { expect };

import React from 'react';
import { useTranslation } from 'react-i18next';
import { navigate } from '@openmrs/esm-framework';
import { ClickableTile, Layer, Tile } from '@carbon/react';
import { ArrowRight } from '@carbon/icons-react';

/**
 * Renders a link card on the System Administration page.
 * Uses the same approach as openmrs-esm-form-builder.
 */
const ReportBuilderAdminCardLink: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Layer>
      <Tile>
        <ClickableTile
          className="admin-card"
          role="link"
          tabIndex={0}
          onClick={() => navigate({ to: `${window.spaBase}/report-builder` })}
        >
          <div className="admin-card__content">
            <div>
              <h4 className="admin-card__title">{t('reportBuilder', 'Report template builder')}</h4>
              <p className="admin-card__description">
                {t(
                  'openReportBuilder',
                  'Create report JSON templates and map fields to indicator codes.',
                )}
              </p>
            </div>
            <ArrowRight size={24} />
          </div>
        </ClickableTile>
      </Tile>
    </Layer>
  );
};

export default ReportBuilderAdminCardLink;

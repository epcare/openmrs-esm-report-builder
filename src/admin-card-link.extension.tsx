import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layer, ClickableTile } from '@carbon/react';
import { ArrowRight } from '@carbon/react/icons';

const ReportBuilderAdminCardLink: React.FC = () => {
  const { t } = useTranslation();
  const header = t('manageForms', 'Report Builder');

  return (
    <Layer>
      <ClickableTile href={`${window.spaBase}/report-builder`} rel="noopener noreferrer">
        <div>
          <div className="heading">{header}</div>
          <div className="content">{t('reportBuilder', 'Report Builder')}</div>
        </div>
        <div className="iconWrapper">
          <ArrowRight size={16} />
        </div>
      </ClickableTile>
    </Layer>
  );
};
export default ReportBuilderAdminCardLink;

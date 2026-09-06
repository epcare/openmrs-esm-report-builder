import React from 'react';
import { ClickableTile, InlineNotification, Stack } from '@carbon/react';
import { useNavigate } from 'react-router-dom';
import Header from '../shared/header/header.component';
import { RB } from '../../constants/privileges';
import { useReportBuilderPrivileges } from '../../hooks/use-report-builder-privileges';

const tileStyle: React.CSSProperties = { minHeight: '10rem' };

export default function AdminPage() {
  const navigate = useNavigate();
  const { has } = useReportBuilderPrivileges();

  const tiles = [
    {
      path: '/admin/report-library',
      title: 'Report Library',
      body: 'Catalog completed and legacy reports before full migration into the builder.',
      required: [RB.LIBRARY_VIEW],
    },
    {
      path: '/admin/themes',
      title: 'Data Themes',
      body: 'Manage reusable source configurations and table mappings.',
      required: [RB.THEME_VIEW],
    },
    {
      path: '/admin/etl-tasks',
      title: 'ETL Tasks',
      body: 'Configure and run scheduled ETL processes for data extraction and transformation.',
      required: [RB.PACKAGE_IMPORT],
    },
    {
      path: '/admin/etl-browser',
      title: 'ETL Data Browser',
      body: 'Explore ETL schemas, tables, columns, and sample records.',
      required: [RB.ETLSOURCE_VIEW],
    },
    {
      path: '/admin/dashboards',
      title: 'Dashboards',
      body: 'Configure dashboards composed of sections and widgets (ETL monitors, reports).',
      required: [RB.DASHBOARD_VIEW],
    },
  ];
  const visibleTiles = tiles.filter((tile) => has(...tile.required));

  return (
    <Stack gap={5}>
      <Header
        title="Admin"
        subtitle="Manage shared configuration, catalogues, and library references for the report builder."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        {visibleTiles.map((tile) => (
          <ClickableTile key={tile.path} style={tileStyle} onClick={() => navigate(tile.path)}>
            <h4>{tile.title}</h4>
            <p>{tile.body}</p>
          </ClickableTile>
        ))}

        {visibleTiles.length === 0 && (
          <InlineNotification
            lowContrast
            kind="info"
            title="No access"
            subtitle="You do not have access to any Report Builder administration features. Contact your administrator."
            hideCloseButton
          />
        )}
      </div>
    </Stack>
  );
}

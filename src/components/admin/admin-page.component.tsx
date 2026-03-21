import React from 'react';
import { ClickableTile, Stack } from '@carbon/react';
import { useNavigate } from 'react-router-dom';
import Header from '../shared/header/header.component';

const tileStyle: React.CSSProperties = { minHeight: '10rem' };

export default function AdminPage() {
  const navigate = useNavigate();

  return (
    <Stack gap={5}>
      <Header
        title="Admin"
        subtitle="Manage shared configuration, catalogues, and library references for the report builder."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        <ClickableTile style={tileStyle} onClick={() => navigate('/admin/report-library')}>
          <h4>Report Library</h4>
          <p>Catalog completed and legacy reports before full migration into the builder.</p>
        </ClickableTile>

        <ClickableTile style={tileStyle} onClick={() => navigate('/admin/themes')}>
          <h4>Data Themes</h4>
          <p>Manage reusable source configurations and table mappings.</p>
        </ClickableTile>
      </div>
    </Stack>
  );
}

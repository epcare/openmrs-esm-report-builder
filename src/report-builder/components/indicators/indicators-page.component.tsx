import React from 'react';
import { Button, Stack } from '@carbon/react';
import { Add } from '@carbon/icons-react';

import CreateBaseIndicatorModal from './create-base-indicator-modal.component';

export default function IndicatorsPage() {
  const [openCreate, setOpenCreate] = React.useState(false);

  const onSave = async (draft: any) => {
    // TODO: wire to your existing backend save for indicators
    // draft.themeUuid + draft.conditions + draft.sqlPreview are now available
    console.log('Saving indicator draft:', draft);
    setOpenCreate(false);
  };

  return (
      <Stack gap={5}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>Indicators</div>
            <div style={{ opacity: 0.85 }}>Create and manage report indicators.</div>
          </div>

          <Button size="sm" kind="primary" renderIcon={Add} onClick={() => setOpenCreate(true)}>
            Create Base Indicator
          </Button>
        </div>

        <CreateBaseIndicatorModal
            open={openCreate}
            onClose={() => setOpenCreate(false)}
            onSave={onSave}
        />
      </Stack>
  );
}
import React from 'react';
import { Button, ButtonSet } from '@carbon/react';

type BuilderHeaderProps = {
  title: string;
  onCopyJson: () => void;
  onDownloadJson: () => void;
  onReset?: () => void;
  copied?: boolean;
};

export function BuilderHeader({ title, onCopyJson, onDownloadJson, onReset, copied }: BuilderHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
      <h2 style={{ margin: 0 }}>{title}</h2>

      <ButtonSet>
        {onReset ? (
          <Button kind="secondary" onClick={onReset}>
            Reset
          </Button>
        ) : null}

        <Button kind="tertiary" onClick={onCopyJson}>
          {copied ? 'Copied' : 'Copy JSON'}
        </Button>

        <Button kind="primary" onClick={onDownloadJson}>
          Download JSON
        </Button>
      </ButtonSet>
    </div>
  );
}
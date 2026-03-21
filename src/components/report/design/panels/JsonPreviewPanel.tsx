import React, { useMemo, useState } from 'react';
import { Button, CopyButton, IconButton } from '@carbon/react';
import { Download, Maximize, Minimize, Renew } from '@carbon/icons-react';
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-github';

import styles from './JsonPreviewPanel.scss';

type Props = {
  /** Draft JSON shown in the editor (controlled) */
  jsonString: string;

  /** Called when user edits the JSON */
  onChangeJson?: (value: string) => void;

  /** Refresh Template Structure from JSON draft */
  onRefreshTemplate?: () => void;

  fileName?: string;

  /** Defaults to true to preserve current behaviour */
  readOnly?: boolean;
};

export default function JsonPreviewPanel({
                                           jsonString,
                                           onChangeJson,
                                           onRefreshTemplate,
                                           fileName = 'report-template.json',
                                           readOnly = true,
                                         }: Props) {
  const [isMaximized, setIsMaximized] = useState(false);

  const downloadable = useMemo(() => new Blob([jsonString], { type: 'application/json' }), [jsonString]);
  const downloadUrl = useMemo(() => window.URL.createObjectURL(downloadable), [downloadable]);

  const canEdit = !readOnly && typeof onChangeJson === 'function';
  const canRefreshTemplate = typeof onRefreshTemplate === 'function';

  return (
    <div className={isMaximized ? styles.maximized : ''}>
      <div className={styles.headerRow}>
        <h3 className={styles.title}>JSON Preview</h3>

        <div className={styles.tools}>
          {/* ✅ Refresh Template (JSON -> Template Structure) */}
          {canRefreshTemplate ? (
            <Button
              size="sm"
              kind="ghost"
              renderIcon={Renew}
              onClick={onRefreshTemplate}
              className={styles.refreshBtn}
            />
          ) : null}

          <CopyButton
            align="top"
            className="cds--btn--sm"
            iconDescription="Copy JSON"
            kind="ghost"
            onClick={() => navigator.clipboard.writeText(jsonString)}
          />

          <a download={fileName} href={downloadUrl}>
            <IconButton kind="ghost" label="Download JSON" size="sm">
              <Download />
            </IconButton>
          </a>

          <IconButton
            kind="ghost"
            label={isMaximized ? 'Minimize' : 'Maximize'}
            size="sm"
            onClick={() => setIsMaximized((v) => !v)}
          >
            {isMaximized ? <Minimize /> : <Maximize />}
          </IconButton>
        </div>
      </div>

      <div className={styles.editorContainer}>
        <AceEditor
          mode="json"
          theme="github"
          value={jsonString}
          readOnly={!canEdit}
          onChange={(value) => onChangeJson?.(value)}
          width="100%"
          height={isMaximized ? '70vh' : '320px'}
          fontSize={12}
          setOptions={{
            useWorker: false,
            showPrintMargin: false,
            tabSize: 2,
            wrap: true,
          }}
        />
      </div>
    </div>
  );
}
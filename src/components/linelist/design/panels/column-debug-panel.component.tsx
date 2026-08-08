/**
 * Column Debug Panel Component
 *
 * Displays detailed column information for debugging
 * Shows ID, position, data definition config, source info, etc.
 */

import React from 'react';
import { Button, Tag, CodeSnippet, Accordion, AccordionItem } from '@carbon/react';
import { Settings, Information } from '@carbon/react/icons';
import type { LinelistColumnDraft } from '../../../../types/linelist-types';
import styles from './column-debug-panel.scss';

type Props = {
  column: LinelistColumnDraft;
  onClose: () => void;
};

export default function ColumnDebugPanel({ column, onClose }: Props) {
  return (
    <div className={styles.debugPanel}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Settings size={16} className={styles.icon} />
          <span>Column Debug Info</span>
        </div>
        <Button kind="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <Accordion className={styles.accordion}>
        {/* Basic Info */}
        <AccordionItem title="Basic Information" open={true}>
          <div className={styles.section}>
            <DebugRow label="Column ID" value={column.id} type="uuid" />
            <DebugRow label="Name" value={column.name} />
            <DebugRow label="Description" value={column.description} />
            <DebugRow label="Position (sortOrder)" value={column.sortOrder?.toString()} type="number" />
            <DebugRow label="Data Type" value={column.dataDefinitionType} type="tag" />
          </div>
        </AccordionItem>

        {/* Source Info */}
        <AccordionItem title="Source Information" open={true}>
          <div className={styles.section}>
            {column.source ? (
              <>
                <DebugRow label="Data Source UUID" value={column.source.dataSourceUuid} type="uuid" />
                <DebugRow label="Data Source Name" value={column.source.dataSourceUuid} />
                <DebugRow label="Table" value={column.source.table} type="code" />
                <DebugRow label="Field" value={column.source.field} type="code" />
                <DebugRow label="Field Type" value={column.source.fieldType} type="tag" />
                {column.source.conceptUuid && (
                  <DebugRow label="Concept UUID" value={column.source.conceptUuid} type="uuid" />
                )}
                {column.source.attributeTypeUuid && (
                  <DebugRow label="Attribute Type UUID" value={column.source.attributeTypeUuid} type="uuid" />
                )}
                {column.source.identifierTypeUuid && (
                  <DebugRow label="Identifier Type UUID" value={column.source.identifierTypeUuid} type="uuid" />
                )}
              </>
            ) : (
              <div className={styles.warning}>
                <Information size={16} />
                <span>No source information available</span>
              </div>
            )}
          </div>
        </AccordionItem>

        {/* Data Definition Config */}
        <AccordionItem title="Data Definition Config" open={false}>
          <div className={styles.section}>
            {column.dataDefinitionConfig ? (
              <pre className={styles.code}>{JSON.stringify(column.dataDefinitionConfig, null, 2)}</pre>
            ) : (
              <div className={styles.warning}>
                <Information size={16} />
                <span>No data definition config available</span>
              </div>
            )}
          </div>
        </AccordionItem>

        {/* Repeat Resolution */}
        <AccordionItem title="Repeat Resolution" open={false}>
          <div className={styles.section}>
            {column.repeatResolution ? (
              <>
                <DebugRow label="Strategy" value={column.repeatResolution.strategy} />
                <DebugRow label="Order By" value={column.repeatResolution.orderBy} />
                <DebugRow label="Restrict to Period" value={column.repeatResolution.restrictToPeriod?.toString()} type="boolean" />
                <DebugRow label="Ignore Voided" value={column.repeatResolution.ignoreVoided?.toString()} type="boolean" />
              </>
            ) : (
              <div className={styles.info}>
                <Information size={16} />
                <span>No repeat resolution configured</span>
              </div>
            )}
          </div>
        </AccordionItem>

        {/* Display Settings */}
        <AccordionItem title="Display Settings" open={false}>
          <div className={styles.section}>
            {column.display ? (
              <>
                <DebugRow label="Width" value={column.display.width?.toString()} type="number" />
                <DebugRow label="Align" value={column.display.align} />
                <DebugRow label="Sortable" value={column.display.sortable?.toString()} type="boolean" />
                <DebugRow label="Filterable" value={column.display.filterable?.toString()} type="boolean" />
                <DebugRow label="Format" value={column.display.format} />
              </>
            ) : (
              <div className={styles.info}>
                <Information size={16} />
                <span>No display settings configured</span>
              </div>
            )}
          </div>
        </AccordionItem>

        {/* Addition Info */}
        <AccordionItem title="Addition Info" open={false}>
          <div className={styles.section}>
            {column.additionInfo ? (
              <>
                <DebugRow label="Added Via" value={column.additionInfo.addedVia} />
                <DebugRow label="Added At" value={column.additionInfo.addedAt} />
                <DebugRow label="Order Added" value={column.additionInfo.orderAdded?.toString()} type="number" />
              </>
            ) : (
              <div className={styles.info}>
                <Information size={16} />
                <span>No addition info available</span>
              </div>
            )}
          </div>
        </AccordionItem>

        {/* Raw JSON */}
        <AccordionItem title="Raw Column JSON" open={false}>
          <div className={styles.section}>
            <CodeSnippet type="multi" feedback="Copied!">
              {JSON.stringify(column, null, 2)}
            </CodeSnippet>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function DebugRow({ label, value, type = 'text' }: { label: string; value: any; type?: string }) {
  if (value === undefined || value === null || value === '') {
    return (
      <div className={styles.row}>
        <span className={styles.label}>{label}:</span>
        <span className={styles.valueEmpty}>(not set)</span>
      </div>
    );
  }

  let displayValue = value;

  switch (type) {
    case 'uuid':
    case 'code':
      displayValue = <code className={styles.codeInline}>{value}</code>;
      break;
    case 'tag':
      displayValue = <Tag size="sm" type="cool-gray">{value}</Tag>;
      break;
    case 'boolean':
      displayValue = (
        <Tag size="sm" type={value === 'true' ? 'green' : 'red'}>
          {value === 'true' ? 'Yes' : 'No'}
        </Tag>
      );
      break;
    case 'number':
      displayValue = <Tag size="sm" type="blue">{value}</Tag>;
      break;
    default:
      displayValue = value;
  }

  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}:</span>
      <span className={styles.value}>{displayValue}</span>
    </div>
  );
}

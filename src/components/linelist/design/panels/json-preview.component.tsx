/**
 * JSON Preview Component for Linelist Report Configuration
 *
 * Displays a live preview of the report configuration JSON
 * with validation status and copy functionality.
 */

import React, { useCallback, useMemo } from 'react';
import { Button, Tag, CodeSnippet } from '@carbon/react';
import { Code } from '@carbon/react/icons';
import type { LinelistReportDraft } from '../../../../types/linelist-types';
import { draftToConfig } from '../../../../types/linelist-types';
import type { IndicatorDto } from '../../../../resources/indicator/indicators.api';
import { enhanceConfigForPreview } from '../../../../utils/config-enhancer';
import styles from './json-preview.scss';

type Props = {
  draft: LinelistReportDraft;
  className?: string;
  indicators?: IndicatorDto[]; // Available indicators for INDICATOR mode
};

/**
 * JSON Preview Component
 * Shows the current draft configuration as formatted JSON
 */
export default function JsonPreview({ draft, className, indicators = [] }: Props) {
  /**
   * Convert indicators array to a Map for efficient lookup
   */
  const indicatorMap = useMemo(() => {
    const map = new Map<string, { sqlTemplate?: string | null; configJson?: string | null }>();
    for (const indicator of indicators) {
      map.set(indicator.uuid, {
        sqlTemplate: indicator.sqlTemplate,
        configJson: indicator.configJson,
      });
    }
    return map;
  }, [indicators]);

  /**
   * Handle copy to clipboard
   */
  const handleCopy = useCallback(() => {
    const config = draftToConfig(draft, indicatorMap);
    const enhancedConfig = enhanceConfigForPreview(config, draft);
    navigator.clipboard.writeText(JSON.stringify(enhancedConfig, null, 2));
  }, [draft, indicatorMap]);

  /**
   * Get validation status items
   */
  const getValidationItems = () => {
    const items: React.ReactNode[] = [];

    // Check columns
    if (draft.columns.length === 0) {
      items.push(<Tag key="no-columns" size="sm" type="red">Missing columns</Tag>);
    } else {
      items.push(<Tag key="columns" size="sm" type="green">{draft.columns.length} columns</Tag>);
    }

    // Check data source
    if (!draft.dataSourceUuid) {
      items.push(<Tag key="no-source" size="sm" type="red">No data source</Tag>);
    }

    // Check indicators when in indicator mode
    if (draft.populationMode === 'INDICATOR' && (!draft.indicatorRules || draft.indicatorRules.length === 0)) {
      items.push(<Tag key="no-indicators" size="sm" type="red">No indicators selected</Tag>);
    }

    // Check for unsaved changes
    if (draft.unsavedChanges) {
      items.push(<Tag key="unsaved" size="sm" type="blue">Unsaved changes</Tag>);
    }

    return items;
  };

  const config = draftToConfig(draft, indicatorMap);
  const enhancedConfig = enhanceConfigForPreview(config, draft);

  return (
    <div className={`${styles.preview} ${className || ''}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Code size={16} className={styles.icon} />
          <span className={styles.title}>Report Configuration JSON</span>
        </div>
        <Button
          kind="ghost"
          size="sm"
          onClick={handleCopy}
        >
          Copy JSON
        </Button>
      </div>

      <CodeSnippet
        type="multi"
        feedback="Copied!"
        className={styles.code}
      >
        {JSON.stringify(enhancedConfig, null, 2)}
      </CodeSnippet>

      <div className={styles.validation}>
        {getValidationItems()}
      </div>
    </div>
  );
}

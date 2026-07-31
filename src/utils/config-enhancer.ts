/**
 * Config Enhancement Utilities
 *
 * Utilities for enhancing configuration objects with metadata
 * for debugging and visibility in JSON previews.
 */

import type { LinelistReportDefinitionConfig } from '../types/linelist-types';
import type { LinelistReportDraft } from '../types/linelist-types';

/**
 * Enhance config for preview by adding column metadata (id, position)
 * This helps with debugging and visibility in the JSON preview
 */
export function enhanceConfigForPreview(
  config: LinelistReportDefinitionConfig,
  draft: LinelistReportDraft
): LinelistReportDefinitionConfig {
  const enhanced = { ...config };

  // Add column metadata to dataSetDefinitions columns
  if (enhanced.dataSetDefinitions && enhanced.dataSetDefinitions[0]) {
    const dataSetDef = enhanced.dataSetDefinitions[0];
    const columnsWithMetadata = dataSetDef.columns.map((col: any, idx: number) => {
      const draftCol = draft.columns.find(c => c.name === col.name);
      return {
        ...col,
        _metadata: {
          id: draftCol?.id || `col-${idx}`,
          position: draftCol?.sortOrder ?? idx,
        },
      };
    });
    (enhanced as any).dataSetDefinitions[0] = {
      ...dataSetDef,
      columns: columnsWithMetadata,
    };
  }

  // Also add metadata to dataSources columns
  if (enhanced.dataSources) {
    (enhanced as any).dataSources = enhanced.dataSources.map((ds: any) => {
      if (ds.columns) {
        const columnsWithMetadata: any = {};
        Object.entries(ds.columns).forEach(([name, col]: [string, any]) => {
          const draftCol = draft.columns.find(c => c.name === name);
          columnsWithMetadata[name] = {
            ...col,
            _metadata: {
              id: draftCol?.id,
              position: draftCol?.sortOrder,
            },
          };
        });
        return { ...ds, columns: columnsWithMetadata };
      }
      return ds;
    });
  }

  return enhanced;
}

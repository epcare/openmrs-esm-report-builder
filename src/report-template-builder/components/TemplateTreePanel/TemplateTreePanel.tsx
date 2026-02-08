import React from 'react';
import { Tile, TreeView } from '@carbon/react';
import styles from '../../report-template-builder.scss';
import { type IndicatorNode } from '../../sample-template';
import { renderTree } from './treeHelpers';

type TemplateTreePanelProps = {
  title: string;
  tree: IndicatorNode[];
  selectedId?: string;
  onSelect: (id: string) => void;
};

export function TemplateTreePanel({ title, tree, selectedId, onSelect }: TemplateTreePanelProps) {
  return (
    <Tile className={styles.panel}>
      <h4 className={styles.panelTitle}>{title}</h4>

      <div className={styles.treeWrapper}>
        <TreeView label={title} hideLabel selected={selectedId ? [selectedId] : []}>
          {renderTree(tree, onSelect)}
        </TreeView>
      </div>
    </Tile>
  );
}

import React from 'react';
import { TreeNode } from '@carbon/react';
import { type IndicatorNode } from '../../sample-template';

export function renderTree(nodes: IndicatorNode[], onSelect: (id: string) => void): React.ReactNode[] {
  return nodes.map((node) => {
    const hasChildren = Array.isArray((node as any).children) && (node as any).children.length > 0;

    return (
      <TreeNode key={node.id} id={node.id} label={node.label} onClick={() => onSelect(node.id)}>
        {hasChildren ? renderTree((node as any).children, onSelect) : null}
      </TreeNode>
    );
  });
}

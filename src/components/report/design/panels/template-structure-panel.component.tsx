import React, { useRef } from 'react';
import { Button, Tile, TreeView, TreeNode } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { nanoid } from 'nanoid';

import styles from './template-structure-panel.scss';

export type IndicatorNode = {
  id: string;
  label: string;
  code?: string;
  type?: 'group' | 'indicator';
  children?: IndicatorNode[];
};

export type SelectedNode = {
  id: string;
  label?: string;
  code?: string;
  hasChildren?: boolean;
};

type Props = {
  tree: IndicatorNode[];
  selected?: SelectedNode | null;
  onSelectNode: (node: IndicatorNode) => void;
  onChangeTree: (updater: (prevTree: IndicatorNode[]) => IndicatorNode[]) => void;

  // ✅ NEW: refresh JSON from template draft
  onRefreshJson: () => void;
};

type IndexPath = number[];

function findIndexPath(nodes: IndicatorNode[], id: string): IndexPath | null {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.id === id) return [i];
    if (n.children?.length) {
      const childPath = findIndexPath(n.children, id);
      if (childPath) return [i, ...childPath];
    }
  }
  return null;
}

function getNodeAtPath(root: IndicatorNode[], path: IndexPath): IndicatorNode {
  let node = root[path[0]];
  for (let i = 1; i < path.length; i++) node = (node.children ?? [])[path[i]];
  return node;
}

function getSiblingsAtPath(root: IndicatorNode[], path: IndexPath): { siblings: IndicatorNode[]; index: number } {
  let siblings = root;
  for (let depth = 0; depth < path.length - 1; depth++) {
    const idx = path[depth];
    siblings = siblings[idx].children ?? (siblings[idx].children = []);
  }
  return { siblings, index: path[path.length - 1] };
}

function getSiblingsAtDepth(root: IndicatorNode[], pathToLevel: number[]): IndicatorNode[] {
  let siblings = root;
  for (let i = 0; i < pathToLevel.length; i++) {
    const idx = pathToLevel[i];
    siblings = siblings[idx].children ?? [];
  }
  return siblings;
}

function containsId(node: IndicatorNode, id: string): boolean {
  if (node.id === id) return true;
  for (const c of node.children ?? []) {
    if (containsId(c, id)) return true;
  }
  return false;
}

function removeNodeById(nodes: IndicatorNode[], id: string): IndicatorNode | null {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.id === id) return nodes.splice(i, 1)[0];

    if (n.children?.length) {
      const removed = removeNodeById(n.children, id);
      if (removed) {
        if (n.children.length === 0) delete n.children;
        return removed;
      }
    }
  }
  return null;
}

export default function TemplateStructurePanel({ tree, selected, onSelectNode, onChangeTree, onRefreshJson }: Props) {
  const { t } = useTranslation();
  const draggingIdRef = useRef<string | null>(null);

  const addNode = () => {
    onChangeTree((prevTree) => {
      const root = structuredClone(prevTree);

      const newNode: IndicatorNode = {
        id: nanoid(),
        label: t('newNode', 'New node'),
        code: '',
      };

      if (!selected?.id) {
        root.push(newNode);
        onSelectNode(newNode);
        return root;
      }

      const path = findIndexPath(root, selected.id);
      if (!path) return root;

      const selNode = getNodeAtPath(root, path);
      const isGroup = Boolean(selNode.children?.length) || selNode.type === 'group';

      if (isGroup) {
        selNode.children = selNode.children ?? [];
        selNode.children.push(newNode);
      } else {
        const { siblings, index } = getSiblingsAtPath(root, path);
        siblings.splice(index + 1, 0, newNode);
      }

      onSelectNode(newNode);
      return root;
    });
  };

  const moveUp = () => {
    if (!selected?.id) return;

    onChangeTree((prevTree) => {
      const root = structuredClone(prevTree);
      const path = findIndexPath(root, selected.id);
      if (!path) return root;

      const { siblings, index } = getSiblingsAtPath(root, path);
      if (index <= 0) return root;

      [siblings[index - 1], siblings[index]] = [siblings[index], siblings[index - 1]];
      return root;
    });
  };

  const moveDown = () => {
    if (!selected?.id) return;

    onChangeTree((prevTree) => {
      const root = structuredClone(prevTree);
      const path = findIndexPath(root, selected.id);
      if (!path) return root;

      const { siblings, index } = getSiblingsAtPath(root, path);
      if (index >= siblings.length - 1) return root;

      [siblings[index + 1], siblings[index]] = [siblings[index], siblings[index + 1]];
      return root;
    });
  };

  const outdent = () => {
    if (!selected?.id) return;

    onChangeTree((prevTree) => {
      const root = structuredClone(prevTree);
      const path = findIndexPath(root, selected.id);
      if (!path || path.length < 2) return root;

      const { siblings: currentSiblings, index: currentIndex } = getSiblingsAtPath(root, path);
      const movedNode = currentSiblings.splice(currentIndex, 1)[0];

      const parentPath = path.slice(0, -1);
      const parentIndexInGrand = parentPath[parentPath.length - 1];

      const grandParentPath = path.slice(0, -2);
      const grandSiblings = grandParentPath.length ? getSiblingsAtDepth(root, grandParentPath) : root;

      grandSiblings.splice(parentIndexInGrand + 1, 0, movedNode);

      const parentNode = getNodeAtPath(root, parentPath);
      if (parentNode.children && parentNode.children.length === 0) delete parentNode.children;

      return root;
    });
  };

  const onDragStart = (id: string) => (e: React.DragEvent) => {
    draggingIdRef.current = id;
    e.dataTransfer.setData('application/x-indicator-node-id', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDropIndent = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();

    const draggedId = e.dataTransfer.getData('application/x-indicator-node-id') || draggingIdRef.current;
    if (!draggedId || draggedId === targetId) return;

    onChangeTree((prevTree) => {
      const root = structuredClone(prevTree);

      const draggedNode = removeNodeById(root, draggedId);
      if (!draggedNode) return root;

      if (containsId(draggedNode, targetId)) {
        root.push(draggedNode);
        return root;
      }

      const targetPath = findIndexPath(root, targetId);
      if (!targetPath) {
        root.push(draggedNode);
        return root;
      }

      const targetNode = getNodeAtPath(root, targetPath);
      targetNode.children = targetNode.children ?? [];
      targetNode.children.push(draggedNode);

      return root;
    });
  };

  const renderTree = (nodes: IndicatorNode[]) =>
    nodes.map((node) => (
      <TreeNode
        key={node.id}
        id={node.id}
        label={
          <div
            className={styles.draggableLabel}
            draggable
            onDragStart={onDragStart(node.id)}
            onDragOver={onDragOver}
            onDrop={onDropIndent(node.id)}
            onClick={() => onSelectNode(node)}
            role="button"
            tabIndex={0}
          >
            <span className={styles.nodeText}>{node.label}</span>
            {node.code ? <span className={styles.nodeCode}>{node.code}</span> : null}
          </div>
        }
      >
        {node.children?.length ? renderTree(node.children) : null}
      </TreeNode>
    ));

  return (
    <div className={styles.root}>
      <Tile className={styles.tile}>
        <div className={styles.tileHeaderRow}>
          <h3 className={styles.tileTitle}>{t('templateStructure', 'Template Structure')}</h3>

          <Button size="sm" kind="ghost" onClick={onRefreshJson}>
            {t('refreshJson', 'Refresh JSON')}
          </Button>
        </div>

        <div className={styles.treeWrap}>
          <TreeView label={t('templateStructure', 'Template Structure')} hideLabel selected={selected?.id ? [selected.id] : []}>
            {renderTree(tree)}
          </TreeView>
        </div>

        <div className={styles.structureActions}>
          <Button size="sm" kind="primary" onClick={addNode}>
            {t('addNode', 'Add Node')}
          </Button>

          <Button size="sm" kind="secondary" onClick={moveUp} disabled={!selected?.id}>
            {t('moveUp', 'Move Up')}
          </Button>

          <Button size="sm" kind="secondary" onClick={moveDown} disabled={!selected?.id}>
            {t('moveDown', 'Move Down')}
          </Button>

          <Button size="sm" kind="tertiary" onClick={outdent} disabled={!selected?.id}>
            {t('outdent', 'Outdent')}
          </Button>
        </div>
      </Tile>
    </div>
  );
}
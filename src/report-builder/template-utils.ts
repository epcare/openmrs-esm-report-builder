import type { IndicatorNode, MappingGroup, TemplateModel } from './sample-template';

export function isGroupNode(n: IndicatorNode): boolean {
  return Boolean(n.children && n.children.length);
}

export function collectLeafIndicatorCodes(nodes: IndicatorNode[]): string[] {
  const out: string[] = [];
  const walk = (arr: IndicatorNode[]) => {
    for (const n of arr) {
      if (n.children && n.children.length) {
        walk(n.children);
      } else if (n.code) {
        out.push(n.code);
      }
    }
  };
  walk(nodes);
  return out;
}

/**
 * ✅ EXISTING in your repo (keep it)
 * Converts the in-app model into the JSON template format.
 */
export function toJsonTemplate(tpl: TemplateModel) {
  return {
    version: tpl.version,
    title: tpl.title,
    dimensions: tpl.dimensions,
    mapping: {
      arrayName: tpl.mapping.arrayName,
      defaultValue: tpl.mapping.defaultValue,
      groups: tpl.mapping.groups.map((g: MappingGroup) => ({
        id: g.id,
        title: g.title,
        keyPattern: g.keyPattern ?? '{code}_{age}_{sex}',
        dims: g.dims ?? { age: 'age', sex: 'sex' },
        indicatorTree: g.indicatorTree,
        indicatorCodes: collectLeafIndicatorCodes(g.indicatorTree),
      })),
    },
  };
}

/**
 * ✅ NEW
 * Convert JSON template back into TemplateModel.
 * We overlay onto defaultsBase so any missing fields are filled from defaults.
 */
export function fromJsonTemplate(json: any, defaultsBase: TemplateModel): TemplateModel {
  if (!json || typeof json !== 'object') {
    throw new Error('JSON template must be an object');
  }

  const model = structuredClone(defaultsBase);

  // Validate & map groups (this matches your toJsonTemplate output)
  const incomingGroups = json?.mapping?.groups;
  if (!Array.isArray(incomingGroups)) {
    throw new Error('Invalid JSON: expected mapping.groups to be an array');
  }

  // Overlay groups onto existing defaults by id when possible
  model.mapping.groups = incomingGroups.map((g: any) => {
    if (!g?.id) throw new Error('Invalid JSON: group missing id');

    return {
      // keep defaults if present, but overlay JSON
      id: String(g.id),
      title: String(g.title ?? 'Group'),
      keyPattern: g.keyPattern ? String(g.keyPattern) : '{code}_{age}_{sex}',
      dims: g.dims ?? { age: 'age', sex: 'sex' },

      // ✅ the important part
      indicatorTree: Array.isArray(g.indicatorTree) ? g.indicatorTree.map(normalizeNode) : [],
    } as MappingGroup;
  });

  // Optional overlays (safe)
  if (typeof json.version === 'string') model.version = json.version;
  if (typeof json.title === 'string') model.title = json.title;
  if (json.dimensions && typeof json.dimensions === 'object') model.dimensions = json.dimensions;

  if (json?.mapping?.arrayName) model.mapping.arrayName = String(json.mapping.arrayName);
  if (json?.mapping?.defaultValue != null) model.mapping.defaultValue = json.mapping.defaultValue;

  return model;
}

function normalizeNode(n: any): IndicatorNode {
  if (!n || typeof n !== 'object') {
    throw new Error('Invalid node: node must be an object');
  }
  if (!n.id) {
    throw new Error('Invalid node: missing id');
  }

  const node: IndicatorNode = {
    id: String(n.id),
    label: String(n.label ?? ''),
    code: n.code != null ? String(n.code) : '',
  };

  if (Array.isArray(n.children) && n.children.length) {
    node.children = n.children.map(normalizeNode);
  }

  return node;
}
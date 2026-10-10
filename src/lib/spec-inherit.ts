import type { LineageLink, ModuleSpecData } from '@/components/module-spec';

/**
 * Resolves a page's inheritance chain (core -> industry -> domain) into one
 * merged spec.
 *
 * Merge semantics:
 * - Domain facts (data model, rules, operations, events, ...) inherit. Items are
 *   matched by their natural key; a child item with the same key replaces the
 *   parent's in place and records which layer it overrode. Everything else is
 *   appended in chain order, so core items come first.
 * - Overview and history (purpose, scope, nonGoals, openQuestions, changelog,
 *   version, status) describe the layer itself and are never inherited.
 * - `stateMachine` is replaced wholesale by the nearest layer that defines one.
 *
 * Every inherited item is tagged with the layer it came from, which is what
 * both renderers use for provenance labels.
 */

export interface SpecNode {
  /** Page path relative to content/docs, e.g. "healthcare/appointment". */
  path: string;
  title: string;
  url: string;
  data: ModuleSpecData;
}

type Item = Record<string, unknown> & { layer?: string; overrides?: string };

const str = (v: unknown) => String(v ?? '');

const KEYS = {
  actors: (i: Item) => str(i.name),
  glossary: (i: Item) => str(i.term),
  concepts: (i: Item) => str(i.name),
  dataModel: (i: Item) => str(i.name),
  relationships: (i: Item) => `${str(i.type)}:${str(i.target)}`,
  businessRules: (i: Item) => str(i.id),
  validations: (i: Item) => `${str(i.field)}:${str(i.rule)}`,
  workflows: (i: Item) => str(i.name),
  functionalRequirements: (i: Item) => str(i.id),
  nonFunctionalRequirements: (i: Item) => `${str(i.category)}:${str(i.text)}`,
  acceptanceCriteria: (i: Item) => str(i.id),
  operations: (i: Item) => str(i.name),
  variants: (i: Item) => str(i.id),
  apiConventions: (i: Item) => str(i.topic),
  tables: (i: Item) => str(i.name),
  technicalNotes: (i: Item) => str(i.id),
  events: (i: Item) => str(i.name),
  permissions: (i: Item) => str(i.name),
  errors: (i: Item) => str(i.code),
  dependencies: (i: Item) => `${str(i.service)}:${str(i.direction)}`,
  decisions: (i: Item) => str(i.id),
  assumptions: (i: Item) => str(i.id),
  constraints: (i: Item) => str(i.id),
  references: (i: Item) => str(i.id),
  accessMatrix: (i: Item) => str(i.action),
  edgeCases: (i: Item) => str(i.id),
  settings: (i: Item) => str(i.name),
  personalData: (i: Item) => str(i.field),
  deliveryGuarantees: (i: Item) => str(i.id),
  performanceTargets: (i: Item) => str(i.id),
  acronyms: (i: Item) => str(i.term),
  risks: (i: Item) => str(i.id),
  compliance: (i: Item) => str(i.id),
} satisfies Partial<Record<keyof ModuleSpecData, (i: Item) => string>>;

/** Frontmatter list fields that inherit down the chain. */
export const INHERITED_FIELDS = Object.keys(KEYS) as (keyof typeof KEYS)[];

/** The label a page carries in provenance pills: its domain, industry, or "core". */
export function layerOf(data: ModuleSpecData): string {
  return data.domain ?? data.industry ?? 'core';
}

const link = (n: SpecNode): LineageLink => ({
  title: n.title,
  url: n.url,
  layer: layerOf(n.data),
});

/** Ancestors of `node`, root first. Throws on a missing parent or a cycle. */
function ancestors(node: SpecNode, lookup: (path: string) => SpecNode | undefined): SpecNode[] {
  const chain: SpecNode[] = [];
  const seen = new Set([node.path]);
  let current = node;

  while (current.data.extends) {
    const parentPath = current.data.extends;
    const parent = lookup(parentPath);
    if (!parent) {
      throw new Error(`${current.path}: extends "${parentPath}", which does not exist`);
    }
    if (seen.has(parent.path)) {
      throw new Error(`${current.path}: inheritance cycle through "${parent.path}"`);
    }
    if (parent.data.module !== current.data.module) {
      throw new Error(
        `${current.path}: module "${current.data.module}" extends "${parentPath}", which is module "${parent.data.module}"`,
      );
    }
    seen.add(parent.path);
    chain.unshift(parent);
    current = parent;
  }

  return chain;
}

function mergeList(layers: { layer: string; items: Item[] }[], key: (i: Item) => string): Item[] {
  const out: Item[] = [];
  const index = new Map<string, number>();

  for (const { layer, items } of layers) {
    for (const item of items) {
      const k = key(item);
      const at = index.get(k);
      if (at === undefined) {
        index.set(k, out.length);
        out.push({ ...item, layer });
      } else {
        out[at] = { ...item, layer, overrides: out[at].layer };
      }
    }
  }

  return out;
}

/** The field each list leads with, which carries the jurisdiction label. */
export const LEAD_FIELD: Record<string, string> = {
  dataModel: 'description',
  businessRules: 'text',
  validations: 'rule',
  workflows: 'outcome',
  functionalRequirements: 'text',
  nonFunctionalRequirements: 'text',
  constraints: 'text',
  assumptions: 'text',
  edgeCases: 'situation',
  settings: 'description',
  personalData: 'purpose',
  compliance: 'obligation',
  risks: 'risk',
  acceptanceCriteria: 'given',
  operations: 'description',
  events: 'description',
  errors: 'message',
  decisions: 'decision',
  technicalNotes: 'text',
  actors: 'description',
  glossary: 'definition',
  acronyms: 'definition',
  concepts: 'description',
  relationships: 'note',
  dependencies: 'reason',
  accessMatrix: 'action',
  performanceTargets: 'indicator',
  references: 'title',
  apiConventions: 'text',
  permissions: 'description',
  tables: 'description',
};

export const JURISDICTION_LABEL: Record<string, string> = { us: 'US only', eu: 'EU only' };

/**
 * Prefixes the lead text of every item tagged with a jurisdiction, such as
 * "US only: ...". Done once here so the HTML and markdown renderers, which
 * both take the resolved spec, can't drift apart.
 */
function labelJurisdictions(record: Record<string, unknown>) {
  for (const [list, field] of Object.entries(LEAD_FIELD)) {
    const items = record[list] as Item[] | undefined;
    if (!items) continue;
    record[list] = items.map((item) => {
      const label = JURISDICTION_LABEL[str(item.jurisdiction)];
      const text = item[field];
      if (!label || typeof text !== 'string' || text.startsWith(label)) return item;
      return { ...item, [field]: `${label}: ${text}` };
    });
  }
}

export function resolveSpec(
  node: SpecNode,
  lookup: (path: string) => SpecNode | undefined,
  all: SpecNode[],
): ModuleSpecData {
  if (!node.data.module) return node.data;

  const chain = [...ancestors(node, lookup), node];
  const merged: ModuleSpecData = { ...node.data };
  const record = merged as Record<string, unknown>;

  for (const [field, key] of Object.entries(KEYS)) {
    record[field] = mergeList(
      chain.map((n) => ({
        layer: layerOf(n.data),
        items: ((n.data as Record<string, unknown>)[field] as Item[] | undefined) ?? [],
      })),
      key,
    );
  }

  labelJurisdictions(record);

  const smOwner = [...chain].reverse().find((n) => n.data.stateMachine);
  merged.stateMachine = smOwner
    ? { ...smOwner.data.stateMachine!, layer: layerOf(smOwner.data) }
    : undefined;

  // Every page whose chain passes through this one, sorted shallow-first.
  const extendedBy = all
    .filter((n) => n.path !== node.path && n.data.module === node.data.module)
    .map((n) => ({ n, chain: ancestors(n, lookup) }))
    .filter(({ chain: c }) => c.some((a) => a.path === node.path))
    .sort((a, b) => a.chain.length - b.chain.length || a.n.path.localeCompare(b.n.path))
    .map(({ n }) => link(n));

  merged.lineage = {
    layer: layerOf(node.data),
    basedOn: chain.slice(0, -1).map(link),
    extendedBy,
  };

  return merged;
}

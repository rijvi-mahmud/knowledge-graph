import { SPEC_GROUPS, type SpecSectionId } from './spec-sections';

/**
 * Ids such as BR-4, FR-E2 or ADR-11 point at one item of a module's spec.
 * This maps each id to the section page that lists it, so every mention of an
 * id, in prose or in the spec itself, can link straight to the item.
 */

const PREFIX_SECTION: Record<string, SpecSectionId> = {
  BR: 'business-rules',
  FR: 'requirements',
  AC: 'acceptance',
  EC: 'edge-cases',
  ADR: 'decisions',
  CON: 'constraints',
  AS: 'assumptions',
  DG: 'event-delivery',
  PERF: 'performance',
  RISK: 'risks',
  REF: 'references',
  CMP: 'compliance',
};

/** Matches an id: a known prefix, an optional layer letter (H, E, ...) and a number. */
export const SPEC_ID = /\b(BR|FR|AC|EC|ADR|CON|AS|DG|PERF|RISK|REF|CMP)-([A-Z]{0,3}\d+)\b/g;

/** The URL of an id's item, given the module page it belongs to (e.g. "/docs/core/appointment"). */
export function specIdHref(baseUrl: string, id: string): string | undefined {
  const prefix = id.split('-')[0];
  const section = PREFIX_SECTION[prefix];
  if (!section) return undefined;
  const group = SPEC_GROUPS.find((g) => g.sections.includes(section));
  const anchor = `#${id.toLowerCase()}`;
  // Overview sections (assumptions) live on the module's own page.
  return group?.slug ? `${baseUrl}/${group.slug}/${section}${anchor}` : `${baseUrl}${anchor}`;
}

/** Splits text into plain strings and ids, in order. */
export function splitIds(text: string): { text: string; id?: boolean }[] {
  const parts: { text: string; id?: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(SPEC_ID)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[0], id: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

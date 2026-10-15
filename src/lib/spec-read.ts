import type { ModuleSpecData } from '@/components/module-spec';
import { JURISDICTION_LABEL, LEAD_FIELD } from './spec-inherit';
import { SPEC_SECTIONS, type SpecSectionId } from './spec-sections';

/**
 * Reads a spec written as Markdown back into the spec's data: the reverse
 * of specToMarkdown. `pnpm check:specs` writes every module to Markdown and
 * reads it back, and fails if anything comes back different, so the two
 * never drift apart and the Markdown form is a complete way to write a spec.
 *
 * Sections are found by title at any heading level, so the same reader
 * takes the spec as served (`## Functions`, `### Business rules`) and as a
 * document laid out on the ISO/IEC/IEEE 29148 outline (`### 3.1 Functions`,
 * `#### Business rules`). Leading outline numbers are ignored. A heading
 * deeper than its section's is part of that section (a workflow, an
 * operation, a storage table). Lines starting "> Guide:" are prompts for
 * the writer and are skipped. A tag at the end of an item, such as
 * _[ehr (overrides healthcare), variant inpatient]_, gives its layer and
 * variant; a lead "US only:" or "EU only:" gives its jurisdiction.
 */

type Item = Record<string, unknown>;
type Line = { n: number; text: string };

export interface ReadProblem {
  line: number;
  message: string;
}

export interface ReadResult {
  data: ModuleSpecData;
  problems: ReadProblem[];
}

const TITLE_TO_SECTION = new Map<string, SpecSectionId>(SPEC_SECTIONS.map((s) => [norm(s.title), s.id]));
const SPECIAL = new Set(['module identity', 'purpose & scope', 'purpose and scope', 'purpose', 'scope', 'variants']);

function norm(s: string) {
  return s
    .replace(/^[\d.]+\s+/, '')
    .trim()
    .toLowerCase();
}

const blank = (s: string | undefined) => (s === undefined || s.trim() === '' || s.trim() === '-' ? undefined : s.trim());
const isGuide = (s: string) => /^>\s*Guide:/.test(s.trim());

/** A trailing provenance tag: _[ehr (overrides healthcare), variant inpatient]_, or the same text in a Layer cell. */
function readTag(text: string): { rest: string; layer?: string; overrides?: string; variant?: string } {
  const m = text.match(/\s*[_*]\[([^\]]+)\][_*]\s*$/);
  if (!m) return { rest: text.trim() };
  return { rest: text.slice(0, m.index).trim(), ...tagParts(m[1]) };
}

function tagParts(tag: string): { layer?: string; overrides?: string; variant?: string } {
  const out: { layer?: string; overrides?: string; variant?: string } = {};
  for (const part of tag.split(/,\s*/)) {
    const v = part.match(/^variant\s+(.+)$/);
    if (v) out.variant = v[1].trim();
    else if (part.trim()) {
      const o = part.match(/^(.+?)\s*\(overrides\s+(.+)\)$/);
      out.layer = (o ? o[1] : part).trim();
      if (o) out.overrides = o[2].trim();
    }
  }
  return out;
}

/** Table cells, without the outer pipes; "\|" stays a pipe inside its cell. */
function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'));
}
const isRule = (line: string) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/.test(line.trim());

/** The tables in a block of lines, each as its header and rows. */
function tables(lines: Line[]): { head: string[]; rows: { n: number; cells: string[] }[] }[] {
  const out: { head: string[]; rows: { n: number; cells: string[] }[] }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].text.trim().startsWith('|') || !lines[i + 1] || !isRule(lines[i + 1].text)) continue;
    const t = { head: cells(lines[i].text).map((h) => h.toLowerCase()), rows: [] as { n: number; cells: string[] }[] };
    for (i += 2; i < lines.length && lines[i].text.trim().startsWith('|'); i++) t.rows.push({ n: lines[i].n, cells: cells(lines[i].text) });
    i--;
    out.push(t);
  }
  return out;
}

/** Rows of the first table as objects, by column; a Layer column becomes layer, overrides and variant. */
function rowsOf(lines: Line[], columns: Record<string, string>): Item[] {
  const t = tables(lines)[0];
  if (!t) return [];
  return t.rows.map((r) => {
    const item: Item = {};
    t.head.forEach((h, k) => {
      const value = r.cells[k];
      if (h === 'layer') Object.assign(item, tagParts(value ?? ''));
      else if (columns[h]) item[columns[h]] = blank(value);
    });
    return item;
  });
}

/** Items written as a bold lead line and sub-lines "- Key: value". */
function blocks(lines: Line[]): { n: number; head: string; rest: string; tag: ReturnType<typeof readTag>; subs: Record<string, string>; bullets: string[] }[] {
  const out: ReturnType<typeof blocks> = [];
  for (const { n, text } of lines) {
    const t = text.trim();
    const bold = t.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    if (bold && !/^\s/.test(text)) {
      const tag = readTag(bold[2]);
      out.push({ n, head: bold[1], rest: tag.rest, tag, subs: {}, bullets: [] });
      continue;
    }
    const last = out[out.length - 1];
    if (!last || !t) continue;
    const bullet = t.match(/^[-*]\s+(.*)$/)?.[1];
    if (bullet === undefined) continue;
    const kv = bullet.match(/^([A-Z][A-Za-z' ]*?):\s*(.*)$/);
    if (kv) last.subs[kv[1].toLowerCase()] = kv[2].trim();
    last.bullets.push(bullet);
  }
  return out;
}

const list = (s: string | undefined, sep = /,\s*/) => (s ? s.split(sep).map((x) => x.trim()).filter(Boolean) : []);
const provenance = (t: { layer?: string; overrides?: string; variant?: string }) =>
  Object.fromEntries(Object.entries({ layer: t.layer, overrides: t.overrides, variant: t.variant }).filter(([, v]) => v));

/** Splits the document into its sections, by title. */
function split(md: string) {
  const lines = md.replace(/\r/g, '').split('\n');
  const parts: { key: string; level: number; lines: Line[] }[] = [];
  let current: (typeof parts)[number] | null = null;
  let fence = false;
  lines.forEach((text, i) => {
    if (text.trim().startsWith('```')) fence = !fence;
    const h = !fence && text.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const key = norm(h[2]);
      const known = TITLE_TO_SECTION.has(key) || SPECIAL.has(key);
      if (known) {
        current = { key, level, lines: [] };
        parts.push(current);
        return;
      }
      // A deeper heading belongs to the open section; one at its level or above closes it.
      if (current && level > current.level) {
        current.lines.push({ n: i + 1, text });
        return;
      }
      current = null;
      return;
    }
    if (current && !isGuide(text)) current.lines.push({ n: i + 1, text });
  });
  return parts;
}

/** Sub-items under deeper headings, such as workflows: each heading and its lines. */
function subsections(lines: Line[]): { n: number; title: string; lines: Line[] }[] {
  const out: { n: number; title: string; lines: Line[] }[] = [];
  let fence = false;
  for (const l of lines) {
    if (l.text.trim().startsWith('```')) fence = !fence;
    const h = !fence && l.text.match(/^#{2,6}\s+(.*)$/);
    if (h) out.push({ n: l.n, title: h[1].trim(), lines: [] });
    else out[out.length - 1]?.lines.push(l);
  }
  return out;
}

const paragraphs = (lines: Line[]) =>
  lines
    .map((l) => l.text)
    .join('\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export function readSpecMarkdown(md: string): ReadResult {
  const data: Record<string, unknown> = {};
  const problems: ReadProblem[] = [];

  for (const part of split(md)) {
    const { key, lines } = part;
    const id = TITLE_TO_SECTION.get(key);
    const at = lines[0]?.n ?? 0;
    try {
      if (key === 'module identity') {
        for (const { text } of lines) {
          const m = text.match(/^-\s+(module|version|status):\s*(.*)$/);
          if (m) data[m[1]] = m[2].trim();
        }
      } else if (key === 'purpose & scope' || key === 'purpose and scope' || key === 'purpose' || key === 'scope') {
        readPurpose(lines, data);
      } else if (key === 'variants') {
        const variants = blocks(lines).map((b) => ({ id: b.head, title: b.rest, description: b.subs.description ?? '', summary: b.subs.summary ?? '', ...provenance(b.tag) }));
        if (variants.length) data.variants = variants;
      } else if (id) readSection(id, lines, data);
    } catch (e) {
      problems.push({ line: at, message: `Couldn't read ${key}: ${(e as Error).message}` });
    }
  }

  // The lead field of each list carries its jurisdiction label.
  for (const [field, lead] of Object.entries(LEAD_FIELD)) {
    const items = data[field] as Item[] | undefined;
    for (const item of items ?? []) {
      const text = item[lead];
      if (typeof text !== 'string') continue;
      for (const [j, label] of Object.entries(JURISDICTION_LABEL))
        if (text.startsWith(`${label}: `)) {
          item.jurisdiction = j;
          item[lead] = text.slice(label.length + 2);
        }
    }
  }

  return { data: data as ModuleSpecData, problems };
}

function readPurpose(lines: Line[], data: Record<string, unknown>) {
  let mode: 'purpose' | 'scope' | 'nonGoals' = 'purpose';
  const purpose: string[] = [];
  for (const { text } of lines) {
    const t = text.trim();
    if (/^\*\*In scope\*\*$/i.test(t)) mode = 'scope';
    else if (/^\*\*Out of scope\*\*$/i.test(t)) mode = 'nonGoals';
    else if (mode === 'purpose') purpose.push(text);
    else {
      const b = t.match(/^[-*]\s+(.*)$/)?.[1];
      if (b) ((data[mode] ??= []) as string[]).push(b);
    }
  }
  const p = paragraphs(purpose.map((text, n) => ({ n, text }))).join('\n\n');
  if (p) data.purpose = p;
}

function readSection(id: SpecSectionId, lines: Line[], data: Record<string, unknown>) {
  const set = (field: string, items: unknown[]) => {
    if (items.length) data[field] = items;
  };
  const statements = (field: string) =>
    set(
      field,
      blocks(lines).map((b) => clean({ id: b.head, text: b.rest, rationale: b.subs.why, ...provenance(b.tag) })),
    );

  switch (id) {
    case 'product-functions':
      return set('productFunctions', rowsOf(lines, { function: 'name', description: 'description' }));
    case 'actors':
      return set('actors', rowsOf(lines, { actor: 'name', description: 'description' }));
    case 'user-characteristics':
      return set('userCharacteristics', rowsOf(lines, { user: 'user', characteristics: 'characteristics' }));
    case 'limitations':
      return statements('limitations');
    case 'assumptions':
      return statements('assumptions');
    case 'constraints':
      return statements('constraints');
    case 'event-delivery':
      return statements('deliveryGuarantees');
    case 'business-rules':
      return statements('businessRules');
    case 'concepts':
      return set('concepts', rowsOf(lines, { concept: 'name', meaning: 'description' }));
    case 'glossary':
      return set('glossary', rowsOf(lines, { term: 'term', definition: 'definition' }));
    case 'acronyms':
      return set('acronyms', rowsOf(lines, { acronym: 'term', meaning: 'definition' }));
    case 'data-model':
      return set(
        'dataModel',
        rowsOf(lines, { field: 'name', type: 'type', required: 'required', description: 'description', constraints: 'constraints' }).map((f) =>
          clean({ ...f, required: f.required === 'yes' }),
        ),
      );
    case 'relationships':
      return set('relationships', rowsOf(lines, { edge: 'type', target: 'target', note: 'note' }).map(clean));
    case 'validations':
      return set('validations', rowsOf(lines, { field: 'field', rule: 'rule', error: 'error' }).map(clean));
    case 'state-machine':
      return readStateMachine(lines, data);
    case 'workflows':
      return set('workflows', subsections(lines).map(readWorkflow));
    case 'requirements':
      return set(
        'functionalRequirements',
        rowsOf(lines, { id: 'id', requirement: 'text', priority: 'priority', 'verified by': 'verification' }).map(clean),
      );
    case 'performance':
      return set('performanceTargets', rowsOf(lines, { id: 'id', indicator: 'indicator', target: 'target', 'measured as': 'measurement' }).map(clean));
    case 'usability':
      return set(
        'usabilityRequirements',
        rowsOf(lines, { id: 'id', requirement: 'text', 'context of use': 'context', 'measured as': 'measure', target: 'target' }).map(clean),
      );
    case 'nfrs':
      return set('nonFunctionalRequirements', rowsOf(lines, { category: 'category', requirement: 'text' }).map(clean));
    case 'acceptance':
      return set(
        'acceptanceCriteria',
        blocks(lines).map((b) => {
          const by = (word: string) => b.bullets.find((x) => x.startsWith(`${word} `))?.slice(word.length + 1);
          return clean({ id: b.head, given: by('Given') ?? '', when: by('When') ?? '', then: by('Then') ?? '', verifies: list(b.subs.verifies), ...provenance(b.tag) });
        }),
      );
    case 'operations':
      return set('operations', subsections(lines).map(readOperation));
    case 'events':
      return set(
        'events',
        rowsOf(lines, { event: 'name', description: 'description', payload: 'payload' }).map((e) => clean({ ...e, payload: list(e.payload as string | undefined) })),
      );
    case 'permissions':
      return set('permissions', rowsOf(lines, { permission: 'name', grants: 'description' }).map(clean));
    case 'errors':
      return set(
        'errors',
        rowsOf(lines, { code: 'code', http: 'http', meaning: 'message' }).map((e) => clean({ ...e, http: e.http ? Number(e.http) : undefined })),
      );
    case 'dependencies':
      return set(
        'dependencies',
        rowsOf(lines, { service: 'service', direction: 'direction', criticality: 'criticality', reason: 'reason', contract: 'contract' }).map((d) =>
          clean({ ...d, contract: list(d.contract as string | undefined, /\s*<br\s*\/?>\s*/) }),
        ),
      );
    case 'api-conventions':
      return set('apiConventions', rowsOf(lines, { topic: 'topic', convention: 'text', reference: 'reference' }).map(clean));
    case 'privacy':
      return set('personalData', rowsOf(lines, { field: 'field', category: 'category', purpose: 'purpose', retention: 'retention' }).map(clean));
    case 'compliance':
      return set(
        'compliance',
        blocks(lines).map((b) =>
          clean({
            id: b.head,
            regulation: b.subs.law ?? '',
            provision: b.subs.provision ?? '',
            obligation: b.rest,
            how: b.subs["how it's met"] ?? '',
            status: b.subs.status,
            covered_by: list(b.subs['covered by']),
            ...provenance(b.tag),
          }),
        ),
      );
    case 'risks':
      return set(
        'risks',
        blocks(lines).map((b) => clean({ id: b.head, risk: b.rest, impact: b.subs.impact ?? '', mitigation: b.subs.mitigation ?? '', ...provenance(b.tag) })),
      );
    case 'edge-cases':
      return set(
        'edgeCases',
        blocks(lines).map((b) =>
          clean({ id: b.head, situation: b.rest, behaviour: b.subs['required behaviour'] ?? '', covers: list(b.subs['covered by']), ...provenance(b.tag) }),
        ),
      );
    case 'decisions':
      return set(
        'decisions',
        blocks(lines).map((b) => {
          const m = b.head.match(/^(\S+)(?:\s+\((.+)\))?$/)!;
          return clean({ id: m[1], date: m[2], decision: b.rest, rationale: b.subs.why ?? '', alternatives: b.subs.considered, ...provenance(b.tag) });
        }),
      );
    case 'access-matrix':
      return readAccess(lines, data);
    case 'tables':
      return set('tables', subsections(lines).map(readTable));
    case 'settings':
      return set(
        'settings',
        rowsOf(lines, { setting: 'name', type: 'type', default: 'default', description: 'description' }).map((s) => clean({ ...s, default: s.default === 'none' ? undefined : s.default })),
      );
    case 'technical-notes':
      return set('technicalNotes', subsections(lines).map(readNote));
    case 'open-questions':
      return set('openQuestions', lines.map((l) => l.text.trim().match(/^[-*]\s+(.*)$/)?.[1]).filter((x): x is string => !!x));
    case 'references':
      return set(
        'references',
        rowsOf(lines, { id: 'id', source: 'source', note: 'note' }).map((r) => {
          const m = String(r.source ?? '').match(/^\[(.*)\]\((.*)\)$/);
          const { source: _source, ...rest } = r;
          void _source;
          return clean({ ...rest, title: m ? m[1] : r.source, url: m ? m[2] : '' });
        }),
      );
    case 'changelog':
      return set(
        'changelog',
        blocks(lines).map((b) => {
          const m = b.head.match(/^v(\S+)(?:\s+\((.+)\))?$/)!;
          return clean({ version: m[1], date: m[2], breaking: /\(breaking\)/.test(b.rest), changes: b.bullets });
        }),
      );
    // Worked out from other sections, so nothing to read.
    case 'context':
    case 'traceability':
      return;
  }
}

/** Drops empty values, so a read item compares cleanly with the authored one. */
function clean<T extends Item>(item: T): T {
  return Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))) as T;
}

function readStateMachine(lines: Line[], data: Record<string, unknown>) {
  const first = lines.find((l) => /^Initial state:/.test(l.text.trim()));
  if (!first) return;
  const tag = readTag(first.text.trim());
  const m = tag.rest.match(/^Initial state:\s*(.+?)\.\s*States:\s*(.+?)\.?$/);
  if (!m) throw new Error('the first line should read "Initial state: `a`. States: `a`, `b`."');
  const ticks = (s: string) => [...s.matchAll(/`([^`]+)`/g)].map((x) => x[1]);
  const initial = ticks(m[1]);
  const t = tables(lines)[0];
  data.stateMachine = clean({
    initial: initial.length === 1 ? initial[0] : initial,
    states: ticks(m[2]),
    transitions: (t?.rows ?? []).map((r) => clean({ from: r.cells[0], to: r.cells[1], trigger: r.cells[2], guard: blank(r.cells[3]) })),
    ...provenance(tag),
  });
}

function readWorkflow(s: { n: number; title: string; lines: Line[] }) {
  const tag = readTag(s.title);
  const w: Item = { name: tag.rest, steps: [] as string[], ...provenance(tag) };
  for (const { text } of s.lines) {
    const t = text.trim();
    const kv = t.match(/^(Actor|Trigger|Outcome|Carries out):\s*(.*)$/);
    if (kv) {
      if (kv[1] === 'Carries out') w.covers = list(kv[2]);
      else w[kv[1].toLowerCase()] = kv[2];
      continue;
    }
    const step = t.match(/^\d+[.)]\s+(.*)$/)?.[1];
    if (step) (w.steps as string[]).push(step);
  }
  return clean(w);
}

function readOperation(s: { n: number; title: string; lines: Line[] }) {
  const tag = readTag(s.title);
  const m = tag.rest.match(/^(.+?)(?::\s*`(GET|POST|PUT|PATCH|DELETE)\s+([^`]+)`)?$/)!;
  const o: Item = { name: m[1].trim(), method: m[2], path: m[3], ...provenance(tag) };
  const desc: string[] = [];
  for (const { text } of s.lines) {
    const t = text.trim();
    const kv = t.match(/^-\s+(Success|Actor|Input|Result|Errors):\s*(.*)$/);
    if (kv) {
      const [, k, v] = kv;
      if (k === 'Success') o.success = Number(v);
      else if (k === 'Result') o.output = v;
      else if (k === 'Errors') o.errors = list(v);
      else o[k.toLowerCase()] = v;
    } else if (t) desc.push(t);
  }
  o.description = desc.join('\n');
  return clean(o);
}

function readTable(s: { n: number; title: string; lines: Line[] }) {
  const tag = readTag(s.title);
  const name = tag.rest.replace(/^`|`$/g, '');
  const t = tables(s.lines)[0];
  const description = paragraphs(s.lines.filter((l) => !l.text.trim().startsWith('|')))[0] ?? '';
  const named = (word: string) => {
    const at = s.lines.findIndex((l) => l.text.trim() === `${word}:`);
    if (at < 0) return [];
    const out: Item[] = [];
    for (const l of s.lines.slice(at + 1)) {
      // A blank line may sit between the label and its list.
      if (!l.text.trim() && !out.length) continue;
      const m = l.text.trim().match(/^-\s+(.+?):\s*`([^`]*)`\s*(.*)$/);
      if (!m) break;
      out.push(clean({ name: m[1], definition: m[2], note: m[3] }));
    }
    return out;
  };
  return clean({
    name,
    description,
    columns: (t?.rows ?? []).map((r) => clean({ name: r.cells[0], type: r.cells[1], nullable: r.cells[2] === 'yes', default: blank(r.cells[3]), note: blank(r.cells[4]) })),
    indexes: named('Indexes'),
    constraints: named('Constraints'),
    ...provenance(tag),
  });
}

function readNote(s: { n: number; title: string; lines: Line[] }) {
  const tag = readTag(s.title);
  const m = tag.rest.match(/^(\S+):\s*(.*)$/)!;
  const text: string[] = [];
  const code: string[] = [];
  let inCode = false;
  for (const { text: l } of s.lines) {
    if (l.trim().startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) code.push(l);
    else text.push(l);
  }
  return clean({ id: m[1], title: m[2], text: paragraphs(text.map((t, n) => ({ n, text: t }))).join('\n\n'), code: code.length ? code.join('\n') : undefined, ...provenance(tag) });
}

function readAccess(lines: Line[], data: Record<string, unknown>) {
  const t = tables(lines)[0];
  if (!t) return;
  const layerAt = t.head[t.head.length - 1] === 'layer' ? t.head.length - 1 : -1;
  const permAt = t.head.lastIndexOf('permission');
  const original = cells(lines.find((l) => l.text.trim().startsWith('|'))!.text);
  // Notes follow the table as "- <action>: <note>"; an action can hold a colon ("US only: Book").
  const noteLines = lines.map((l) => l.text.trim()).filter((t) => t.startsWith('- '));
  const noteFor = (action: string) => noteLines.find((t) => t.startsWith(`- ${action}: `))?.slice(action.length + 4);
  data.accessMatrix = t.rows.map((r) => {
    const roles: Record<string, string> = {};
    for (let k = 1; k < permAt; k++) roles[original[k]] = r.cells[k];
    return clean({
      action: r.cells[0],
      roles,
      permission: blank(r.cells[permAt]),
      note: noteFor(r.cells[0]),
      ...(layerAt >= 0 ? tagParts(r.cells[layerAt] ?? '') : {}),
    });
  });
}

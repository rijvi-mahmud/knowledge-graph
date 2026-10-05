import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  SPEC_GROUPS,
  SPEC_SECTIONS,
  sectionTitle,
  sectionSummary,
  type SpecGroup,
  type SpecSectionId,
} from '@/lib/spec-sections';

/**
 * Renders the structured SRS frontmatter of a module page.
 *
 * The frontmatter is the single source of truth: it is what an assistant reads
 * over the llms.txt surface, and this component is how a human reads the
 * same data. Nothing here is authored twice - if a section is absent from
 * frontmatter, it simply does not render.
 */

// --- frontmatter shapes (mirror source.config.ts) ---------------------------

/** Set by spec-inherit on merged items: which layer an item came from. */
interface Provenance {
  layer?: string;
  overrides?: string; // layer whose item with the same key this one replaced
}

interface Relation extends Provenance {
  type: string;
  target: string;
  note?: string;
}

interface Dependency extends Provenance {
  service: string;
  direction: 'upstream' | 'downstream';
  reason: string;
  criticality: 'hard' | 'soft';
}

interface Named extends Provenance {
  name: string;
  description: string;
}

interface GlossaryEntry extends Provenance {
  term: string;
  definition: string;
}

interface Field extends Provenance {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  constraints?: string;
}

interface BusinessRule extends Provenance {
  id: string;
  text: string;
  rationale?: string;
}

interface Validation extends Provenance {
  field: string;
  rule: string;
  error: string;
}

interface StateMachine extends Provenance {
  initial: string;
  states: string[];
  transitions: {
    from: string;
    to: string;
    trigger: string;
    guard?: string;
  }[];
}

interface Workflow extends Provenance {
  name: string;
  trigger?: string;
  actor?: string;
  steps: string[];
  outcome?: string;
}

interface Requirement extends Provenance {
  id: string;
  text: string;
  priority: 'must' | 'should' | 'could';
  verification?: 'test' | 'demonstration' | 'inspection' | 'analysis';
}

/** Assumptions and constraints share one shape: a statement and its reason. */
interface Statement extends Provenance {
  id: string;
  text: string;
  rationale?: string;
}

interface AccessRow extends Provenance {
  action: string;
  roles: Record<string, string>;
  note?: string;
}

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  note?: string;
}

interface Table extends Provenance {
  name: string;
  description: string;
  columns: Column[];
  indexes: { name: string; definition: string; note?: string }[];
  constraints: { name: string; definition: string; note?: string }[];
}

interface EdgeCase extends Provenance {
  id: string;
  situation: string;
  behaviour: string;
  covers: string[];
}

interface Setting extends Provenance {
  name: string;
  type: string;
  default?: string;
  description: string;
}

interface TechnicalNote extends Provenance {
  id: string;
  title: string;
  text: string;
  code?: string;
}

interface Reference extends Provenance {
  id: string;
  title: string;
  url: string;
  note?: string;
}

interface Nfr extends Provenance {
  category: string;
  text: string;
}

interface Acceptance extends Provenance {
  id: string;
  given: string;
  when: string;
  then: string;
  verifies?: string[];
}

interface Endpoint extends Provenance {
  method: string;
  path: string;
  description: string;
  request?: string;
  response?: string;
  errors: string[];
}

interface EventDef extends Provenance {
  name: string;
  description?: string;
  payload: string[];
}

interface ErrorDef extends Provenance {
  code: string;
  http?: number;
  message: string;
}

interface Decision extends Provenance {
  id: string;
  decision: string;
  rationale: string;
  alternatives?: string;
  date?: string;
}

interface ChangelogEntry {
  version: string;
  date?: string;
  changes: string[];
  breaking: boolean;
}

export interface LineageLink {
  title: string;
  url: string;
  layer: string;
}

/** Computed by spec-inherit, never authored. */
export interface Lineage {
  layer: string;
  basedOn: LineageLink[]; // ancestors, core first
  extendedBy: LineageLink[]; // every page that inherits from this one
}

export interface ModuleSpecData {
  module?: string;
  version?: string;
  status?: string;
  industry?: string;
  domain?: string;
  extends?: string;
  lineage?: Lineage;

  purpose?: string;
  scope?: string[];
  nonGoals?: string[];
  actors?: Named[];
  assumptions?: Statement[];
  glossary?: GlossaryEntry[];

  concepts?: Named[];
  dataModel?: Field[];
  relationships?: Relation[];
  tables?: Table[];

  businessRules?: BusinessRule[];
  validations?: Validation[];
  stateMachine?: StateMachine;
  workflows?: Workflow[];
  edgeCases?: EdgeCase[];

  functionalRequirements?: Requirement[];
  nonFunctionalRequirements?: Nfr[];
  constraints?: Statement[];
  settings?: Setting[];
  technicalNotes?: TechnicalNote[];
  acceptanceCriteria?: Acceptance[];

  api?: Endpoint[];
  events?: EventDef[];
  permissions?: Named[];
  accessMatrix?: AccessRow[];
  errors?: ErrorDef[];
  dependencies?: Dependency[];

  decisions?: Decision[];
  openQuestions?: string[];
  changelog?: ChangelogEntry[];
  references?: Reference[];
}

const has = (v: unknown[] | undefined): boolean => Array.isArray(v) && v.length > 0;

/** Which reference sections have content. */
function presentSections(data: ModuleSpecData): Set<SpecSectionId> {
  const present: Record<SpecSectionId, boolean> = {
    'business-rules': has(data.businessRules),
    validations: has(data.validations),
    'state-machine': Boolean(data.stateMachine),
    workflows: has(data.workflows),
    'data-model': has(data.dataModel),
    relationships: has(data.relationships),
    api: has(data.api),
    events: has(data.events),
    permissions: has(data.permissions),
    errors: has(data.errors),
    dependencies: has(data.dependencies),
    requirements: has(data.functionalRequirements),
    nfrs: has(data.nonFunctionalRequirements),
    acceptance: has(data.acceptanceCriteria),
    constraints: has(data.constraints),
    settings: has(data.settings),
    'technical-notes': has(data.technicalNotes),
    tables: has(data.tables),
    'edge-cases': has(data.edgeCases),
    'access-matrix': has(data.accessMatrix),
    traceability: (data.acceptanceCriteria ?? []).some((a) => has(a.verifies)),
    actors: has(data.actors),
    assumptions: has(data.assumptions),
    concepts: has(data.concepts),
    glossary: has(data.glossary),
    decisions: has(data.decisions),
    'open-questions': has(data.openQuestions),
    changelog: has(data.changelog),
    references: has(data.references),
  };
  return new Set(SPEC_SECTIONS.filter((s) => present[s.id]).map((s) => s.id));
}

/** Reference groups that have content, in render order. */
export function activeSpecGroups(data: ModuleSpecData) {
  if (!data.module) return [];
  const present = presentSections(data);
  return SPEC_GROUPS.filter((g) => g.sections.some((id) => present.has(id))).map((g) => ({
    ...g,
    sections: g.sections.filter((id) => present.has(id)),
  }));
}

/**
 * TOC entries for one page of the spec. The module's own page lists the
 * overview sections; a sub-page lists the sections of its group.
 */
export function specToc(data: ModuleSpecData, sectionId?: SpecSectionId) {
  // A section page: the database schema lists its tables, other sections need no TOC.
  if (sectionId === 'tables')
    return (data.tables ?? []).map((t) => ({ title: t.name, url: `#table-${t.name}`, depth: 2 }));
  if (sectionId) return [];
  // The module's own page: its overview sections, under the "Specification" heading.
  const overview = activeSpecGroups(data).find((g) => g.id === 'overview');
  return [
    ...(overview?.sections ?? []).map((id) => ({ title: sectionTitle(id), url: `#${id}`, depth: 3 })),
    { title: 'In this specification', url: '#in-this-specification', depth: 3 },
  ];
}

// --- layers ----------------------------------------------------------------

type LayerKind = 'core' | 'industry' | 'domain';

const LAYER_DOT: Record<LayerKind, string> = {
  core: 'bg-layer-core',
  industry: 'bg-layer-industry',
  domain: 'bg-layer-domain',
};

/** Maps a provenance label ("core", "healthcare", "dental") to its level. */
function layerKinds(data: ModuleSpecData) {
  return (layer?: string): LayerKind =>
    layer && layer === data.domain
      ? 'domain'
      : layer && layer === data.industry
        ? 'industry'
        : 'core';
}

// --- the item list ---------------------------------------------------------

/**
 * One entry in a reference list, in the shape every section shares: a key
 * (id, field name, endpoint), optional metadata, a body and a note.
 */
interface Item {
  key: ReactNode;
  ref?: string; // stable id (BR-1, FR-2): an anchor, not repeated on screen
  mono?: boolean; // render the key as code
  plain?: boolean; // key is a sentence: regular weight
  meta?: ReactNode[];
  body?: ReactNode;
  note?: ReactNode;
  from?: Provenance;
}

function ItemList({ items, origin }: { items: Item[]; origin: (p?: Provenance) => ReactNode }) {
  return (
    <div className="not-prose mt-3 divide-y divide-fd-border border-b border-fd-border">
      {items.map((item, i) => (
        <div
          key={i}
          id={item.ref?.toLowerCase()}
          title={item.ref}
          className="scroll-m-24 px-3 py-4"
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className={
                item.mono
                  ? 'font-code text-sm font-medium text-fd-foreground'
                  : item.plain
                    ? 'leading-relaxed text-fd-foreground'
                    : 'font-medium text-fd-foreground'
              }
            >
              {item.key}
            </span>
            {item.meta?.map((m, j) => (
              <span key={j} className="font-code text-xs text-fd-muted-foreground">
                {m}
              </span>
            ))}
            <span className="ml-auto">{origin(item.from)}</span>
          </div>
          {item.body && <div className="mt-1.5 leading-relaxed">{item.body}</div>}
          {item.note && (
            <div className="mt-1.5 text-sm leading-relaxed text-fd-muted-foreground">
              {item.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Compact accordion for statement-plus-reason items (rules, decisions): the
 * statement is always visible on one row with its id and layer; the reason
 * opens on click. Native <details>, so it needs no script, stays in the HTML,
 * and in-page search opens matching rows.
 */
interface Expandable {
  key: string;
  id?: ReactNode; // shown in a fixed column when present (HTTP method badge)
  ref?: string; // stable id (BR-4, AC-2): shown only when the row is open
  text: ReactNode;
  meta?: ReactNode;
  detail?: ReactNode;
  from?: Provenance;
}

function AccordionList({
  items,
  origin,
}: {
  items: Expandable[];
  origin: (p?: Provenance) => ReactNode;
}) {
  return (
    <div className="not-prose mt-3 divide-y divide-fd-border border-b border-fd-border">
      {items.map((item) => (
        <details
          key={item.key}
          id={item.ref?.toLowerCase()}
          className="group scroll-m-24 transition-colors duration-150 open:bg-fd-foreground/[0.025]"
        >
          <summary className="flex cursor-pointer list-none items-baseline gap-4 px-3 py-3 transition-colors duration-150 hover:bg-fd-foreground/[0.035] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fd-ring [&::-webkit-details-marker]:hidden">
            {item.id && (
              <span className="w-16 shrink-0 font-code text-xs font-medium text-fd-muted-foreground">
                {item.id}
              </span>
            )}
            <span className="min-w-0 flex-1 leading-relaxed">{item.text}</span>
            <span className="shrink-0">{origin(item.from)}</span>
            {item.detail && (
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className="mt-[0.3rem] ml-1 size-3.5 shrink-0 self-start text-fd-muted-foreground transition-transform duration-150 group-open:rotate-90"
              >
                <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
          </summary>
          {item.detail && (
            // Indented to line up with the row text: px-3 + id column + gap.
            <div
              className={`pt-0.5 pr-10 pb-4 text-sm leading-relaxed text-fd-muted-foreground ${
                item.id ? 'pl-[5.75rem]' : 'pl-3'
              }`}
            >
              {(item.ref || item.meta) && (
                <div className="mb-1.5 flex gap-3 font-code text-xs">
                  {item.ref && <span className="text-fd-foreground">{item.ref}</span>}
                  {item.meta}
                </div>
              )}
              {item.detail}
            </div>
          )}
        </details>
      ))}
    </div>
  );
}

// --- building blocks for data-heavy sections ------------------------------

type Tone = 'neutral' | 'green' | 'blue' | 'amber' | 'red' | 'accent';

const TONE: Record<Tone, string> = {
  neutral: 'bg-fd-muted text-fd-muted-foreground',
  green: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  blue: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  red: 'bg-red-500/10 text-red-700 dark:text-red-400',
  accent: 'bg-fd-primary/10 text-fd-primary',
};

function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 font-sans text-xs font-medium whitespace-nowrap ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

/** A literal value - field, code, event payload key. */
function Chip({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md border border-fd-border bg-fd-background px-1.5 py-0.5 font-code text-xs text-fd-foreground">
      {children}
    </code>
  );
}

const METHOD_TONE: Record<string, Tone> = {
  GET: 'green',
  POST: 'blue',
  PUT: 'amber',
  PATCH: 'amber',
  DELETE: 'red',
};

const PRIORITY_TONE: Record<string, Tone> = { must: 'accent', should: 'blue', could: 'neutral' };

/** Two-column term / definition rows - glossary-style sections. */
function DefinitionList({
  items,
  origin,
}: {
  items: { term: ReactNode; mono?: boolean; def: ReactNode; from?: Provenance }[];
  origin: (p?: Provenance) => ReactNode;
}) {
  return (
    <dl className="not-prose mt-3 divide-y divide-fd-border border-b border-fd-border">
      {items.map((item, i) => (
        <div key={i} className="grid gap-1 px-3 py-3 sm:grid-cols-[13rem_1fr] sm:gap-6">
          <dt className={item.mono ? 'font-code text-sm font-medium' : 'font-medium'}>
            {item.mono && typeof item.term === 'string' ? <Dotted>{item.term}</Dotted> : item.term}
          </dt>
          <dd className="leading-relaxed text-fd-muted-foreground">
            {item.def} {origin(item.from)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Lets a dotted identifier wrap at its dots instead of mid-word. */
function Dotted({ children }: { children: string }) {
  const parts = children.split('.');
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <>
              .<wbr />
            </>
          )}
        </span>
      ))}
    </>
  );
}

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Group items by a key, keeping first-seen order. */
function groupBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), item]);
  return [...map.entries()];
}

/** Numbered steps on a vertical track - workflows. */
function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="relative mt-1 flex flex-col gap-2.5 text-fd-foreground">
      <span
        aria-hidden="true"
        className="absolute top-2 bottom-2 left-[0.6rem] w-px bg-fd-border"
      />
      {steps.map((step, i) => (
        <li key={step} className="relative flex gap-3">
          <span className="z-10 grid size-5 shrink-0 place-items-center rounded-full border border-fd-border bg-fd-background text-[11px] font-medium tabular-nums">
            {i + 1}
          </span>
          <span className="leading-relaxed">{step}</span>
        </li>
      ))}
    </ol>
  );
}

const Label = ({ children }: { children: ReactNode }) => (
  <span className="font-medium text-fd-foreground">{children} </span>
);

/** A compact reference table, styled like the other lists. */
function Grid({ head, rows }: { head: ReactNode[]; rows: ReactNode[][] }) {
  return (
    <div className="not-prose mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-fd-border text-left">
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-fd-border">
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 leading-relaxed">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ACCESS_TONE: Record<string, Tone> = { any: 'green', own: 'blue' };

/** A permission matrix cell: any and own as badges, none as a muted word, anything else as a condition. */
function AccessCell({ value }: { value?: string }) {
  const v = (value ?? 'none').trim();
  const key = v.toLowerCase();
  if (key === 'none') return <span className="text-fd-muted-foreground">None</span>;
  if (ACCESS_TONE[key]) return <Badge tone={ACCESS_TONE[key]}>{capitalise(key)}</Badge>;
  return <span className="text-sm">{v}</span>;
}

/** Ids that acceptance criteria can verify: rules, requirements and constraints, in that order. */
function traceRows(data: ModuleSpecData) {
  const verifiers = new Map<string, string[]>();
  for (const a of data.acceptanceCriteria ?? [])
    for (const id of a.verifies ?? []) verifiers.set(id, [...(verifiers.get(id) ?? []), a.id]);
  return [
    ...(data.businessRules ?? []).map((r) => ({ id: r.id, text: r.text })),
    ...(data.functionalRequirements ?? []).map((r) => ({ id: r.id, text: r.text })),
    ...(data.constraints ?? []).map((c) => ({ id: c.id, text: c.text })),
  ].map((r) => ({ ...r, verifiedBy: verifiers.get(r.id) ?? [] }));
}

// --- the spec --------------------------------------------------------------

export function ModuleSpec({
  data,
  section,
  baseUrl,
}: {
  data: ModuleSpecData;
  /** The section a sub-page shows. Unset on the module's own page. */
  section?: SpecSectionId;
  /** URL of the module's own page, for links between the spec's pages. */
  baseUrl: string;
}) {
  // Not a graph node - ordinary docs page, render nothing.
  if (!data.module) return null;

  const layered = has(data.lineage?.basedOn);
  const kindOf = layerKinds(data);

  // Rows are grouped by layer (see `grouped`), so a row only needs to say
  // when it replaces an inherited item.
  const origin = (p?: Provenance) =>
    layered && p?.overrides ? (
      <span className="text-xs whitespace-nowrap text-fd-muted-foreground">
        replaces {p.overrides}
      </span>
    ) : null;

  // Chain order: core first, this page last.
  const own = data.lineage?.layer ?? 'core';
  const order = [...(data.lineage?.basedOn.map((l) => l.layer) ?? []), own];

  /** Splits a section into "From core / From healthcare / Added in dental". */
  const grouped = <T extends { from?: Provenance }>(
    items: T[],
    render: (subset: T[]) => ReactNode,
  ) => {
    if (!layered || !items.some((i) => i.from)) return render(items);
    return order.map((layer) => {
      const subset = items.filter((i) => (i.from?.layer ?? 'core') === layer);
      if (subset.length === 0) return null;
      return (
        <div key={layer} className="mt-7 first:mt-4">
          <p className="not-prose flex items-center gap-2 px-3 text-sm">
            <span
              className={`size-2 rounded-full ${LAYER_DOT[kindOf(layer)]}`}
              aria-hidden="true"
            />
            <span className="font-medium">
              {layer === own ? `Added in ${layer}` : `From ${layer}`}
            </span>
            <span className="text-fd-muted-foreground">{subset.length}</span>
          </p>
          {render(subset)}
        </div>
      );
    });
  };

  const lists: Partial<Record<SpecSectionId, ReactNode>> = {
    'business-rules': grouped(
      (data.businessRules ?? []).map((r) => ({
        key: r.id,
        ref: r.id,
        text: r.text,
        detail: r.rationale && (
          <>
            <Label>Why:</Label>
            {r.rationale}
          </>
        ),
        from: r,
      })),
      (items) => <AccordionList origin={origin} items={items} />,
    ),

    // One cluster per field, so a field with several checks is named once.
    validations: grouped(
      (data.validations ?? []).map((v) => ({ ...v, from: v as Provenance })),
      (items) => (
        <dl className="not-prose mt-3 divide-y divide-fd-border border-b border-fd-border">
          {groupBy(items, (v) => v.field).map(([field, checks]) => (
            <div key={field} className="grid gap-2 px-3 py-3 sm:grid-cols-[13rem_1fr] sm:gap-6">
              <dt className="font-code text-sm font-medium">
                <Dotted>{field}</Dotted>
              </dt>
              <dd className="flex flex-col gap-2">
                {checks.map((v) => (
                  <span key={v.rule} className="leading-relaxed">
                    {v.rule} {origin(v.from)}
                    <span className="mt-1 block">
                      <Chip>{v.error}</Chip>
                    </span>
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      ),
    ),

    'state-machine': data.stateMachine && (
      <>
        <p>
          Starts in <code>{data.stateMachine.initial}</code>. Possible states:{' '}
          {data.stateMachine.states.map((st, i) => (
            <span key={st}>
              {i > 0 && ', '}
              <code>{st}</code>
            </span>
          ))}
          . Any transition not listed is invalid.
        </p>
        <table>
          <thead>
            <tr>
              <th>Transition</th>
              <th>On</th>
              <th>Only if</th>
            </tr>
          </thead>
          <tbody>
            {data.stateMachine.transitions.map((t) => (
              <tr key={`${t.from}-${t.to}-${t.trigger}`}>
                <td className="whitespace-nowrap">
                  <code>{t.from}</code> → <code>{t.to}</code>
                </td>
                <td>{t.trigger}</td>
                <td className="text-fd-muted-foreground">{t.guard ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    ),

    workflows: grouped(
      (data.workflows ?? []).map((w) => ({
        key: w.name,
        text: <span className="font-medium">{w.name}</span>,
        detail: (
          <div className="flex flex-col gap-3">
            {(w.actor || w.trigger) && (
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {w.actor && (
                  <span>
                    <Label>Actor</Label>
                    {w.actor}
                  </span>
                )}
                {w.trigger && (
                  <span>
                    <Label>Starts when</Label>
                    {w.trigger}
                  </span>
                )}
              </div>
            )}
            <Steps steps={w.steps} />
            {w.outcome && (
              <span>
                <Label>Outcome:</Label>
                {w.outcome}
              </span>
            )}
          </div>
        ),
        from: w,
      })),
      (items) => <AccordionList origin={origin} items={items} />,
    ),

    'data-model': grouped(
      (data.dataModel ?? []).map((f) => ({
        key: f.name,
        mono: true,
        meta: [
          f.type,
          f.required ? (
            <Badge key="req" tone="accent">
              required
            </Badge>
          ) : (
            <Badge key="req">optional</Badge>
          ),
        ],
        body: f.description,
        note: f.constraints && (
          <>
            <Label>Constraint:</Label>
            {f.constraints}
          </>
        ),
        from: f,
      })),
      (items) => <ItemList origin={origin} items={items} />,
    ),

    // One row per relation type, its targets listed together.
    relationships: grouped(
      (data.relationships ?? []).map((r) => ({ ...r, from: r as Provenance })),
      (items) => (
        <dl className="not-prose mt-3 divide-y divide-fd-border border-b border-fd-border">
          {groupBy(items, (r) => r.type).map(([type, rels]) => (
            <div key={type} className="grid gap-2 px-3 py-3 sm:grid-cols-[13rem_1fr] sm:gap-6">
              <dt className="font-code text-sm text-fd-muted-foreground">
                {type.replace(/_/g, ' ')}
              </dt>
              <dd className="flex flex-col gap-1.5">
                {rels.map((r) => (
                  <span key={r.target} className="leading-relaxed">
                    <Chip>{r.target}</Chip>
                    {r.note && <span className="ml-2 text-fd-muted-foreground">{r.note}</span>}{' '}
                    {origin(r.from)}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      ),
    ),

    api: grouped(
      (data.api ?? []).map((e) => ({
        key: `${e.method} ${e.path}`,
        id: <Badge tone={METHOD_TONE[e.method] ?? 'neutral'}>{e.method}</Badge>,
        text: <span className="font-code text-sm">{e.path}</span>,
        detail: (
          <div className="flex flex-col gap-2">
            <span className="text-fd-foreground">{e.description}</span>
            {(e.request || e.response) && (
              <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1">
                {e.request && (
                  <>
                    <dt className="font-medium text-fd-foreground">Request</dt>
                    <dd>{e.request}</dd>
                  </>
                )}
                {e.response && (
                  <>
                    <dt className="font-medium text-fd-foreground">Response</dt>
                    <dd>{e.response}</dd>
                  </>
                )}
              </dl>
            )}
            {e.errors.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 font-medium text-fd-foreground">Errors</span>
                {e.errors.map((code) => (
                  <Chip key={code}>{code}</Chip>
                ))}
              </div>
            )}
          </div>
        ),
        from: e,
      })),
      (items) => <AccordionList origin={origin} items={items} />,
    ),

    events: grouped(
      (data.events ?? []).map((e) => ({
        key: e.name,
        mono: true,
        body: e.description,
        note: e.payload.length > 0 && (
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-medium text-fd-foreground">Payload</span>
            {e.payload.map((field) => (
              <Chip key={field}>{field}</Chip>
            ))}
          </span>
        ),
        from: e,
      })),
      (items) => <ItemList origin={origin} items={items} />,
    ),

    permissions: grouped(
      (data.permissions ?? []).map((p) => ({
        term: p.name,
        mono: true,
        def: p.description,
        from: p,
      })),
      (items) => <DefinitionList origin={origin} items={items} />,
    ),

    errors: grouped(
      (data.errors ?? []).map((e) => ({ ...e, from: e as Provenance })),
      (items) => (
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>HTTP</th>
              <th>Meaning</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.code}>
                <td>
                  <code>{e.code}</code>
                </td>
                <td className="tabular-nums">{e.http ?? '-'}</td>
                <td>
                  {e.message} {origin(e.from)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    ),

    // Upstream and downstream side by side: what this needs, what needs this.
    dependencies: grouped(
      (data.dependencies ?? []).map((d) => ({ ...d, from: d as Provenance })),
      (items) => (
        <div className="not-prose mt-3 grid gap-6 sm:grid-cols-2">
          {(['upstream', 'downstream'] as const).map((direction) => {
            const deps = items.filter((d) => d.direction === direction);
            if (deps.length === 0) return null;
            return (
              <div key={direction}>
                <p className="px-3 pb-1.5 text-sm font-medium">
                  {direction === 'upstream' ? 'Needs' : 'Feeds'}
                </p>
                <ul className="divide-y divide-fd-border border-y border-fd-border">
                  {deps.map((d) => (
                    <li key={d.service} className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-code text-sm font-medium">{d.service}</span>
                        <Badge tone={d.criticality === 'hard' ? 'red' : 'neutral'}>
                          {d.criticality === 'hard' ? 'blocks if down' : 'degrades if down'}
                        </Badge>
                        {origin(d.from)}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-fd-muted-foreground">
                        {d.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ),
    ),

    requirements: grouped(
      (data.functionalRequirements ?? []).map((r) => ({ ...r, from: r as Provenance })),
      (items) => (
        <ul className="not-prose mt-3 divide-y divide-fd-border border-b border-fd-border">
          {items.map((r) => (
            <li
              key={r.id}
              id={r.id.toLowerCase()}
              title={r.id}
              className="flex scroll-m-24 items-baseline gap-4 px-3 py-3"
            >
              <span className="w-14 shrink-0">
                <Badge tone={PRIORITY_TONE[r.priority] ?? 'neutral'}>{r.priority}</Badge>
              </span>
              <span className="leading-relaxed">
                {r.text} {origin(r.from)}
              </span>
              {r.verification && (
                <span className="ml-auto shrink-0 font-code text-xs text-fd-muted-foreground">
                  {r.verification}
                </span>
              )}
            </li>
          ))}
        </ul>
      ),
    ),

    // One cluster per category: security, compliance, availability...
    nfrs: grouped(
      (data.nonFunctionalRequirements ?? []).map((n) => ({ ...n, from: n as Provenance })),
      (items) => (
        <dl className="not-prose mt-3 divide-y divide-fd-border border-b border-fd-border">
          {groupBy(items, (n) => n.category).map(([category, reqs]) => (
            <div key={category} className="grid gap-2 px-3 py-3 sm:grid-cols-[13rem_1fr] sm:gap-6">
              <dt className="font-medium">{category[0].toUpperCase() + category.slice(1)}</dt>
              <dd className="flex flex-col gap-2 leading-relaxed">
                {reqs.map((n) => (
                  <span key={n.text}>
                    {n.text} {origin(n.from)}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      ),
    ),

    acceptance: grouped(
      (data.acceptanceCriteria ?? []).map((a) => ({
        key: a.id,
        ref: a.id,
        text: (
          <>
            {capitalise(a.when)} <span className="text-fd-muted-foreground">→</span> {a.then}
          </>
        ),
        detail: (
          <dl className="grid grid-cols-[3.5rem_1fr] gap-x-3 gap-y-1.5">
            <dt className="font-medium text-fd-foreground">Given</dt>
            <dd>{a.given}</dd>
            <dt className="font-medium text-fd-foreground">When</dt>
            <dd>{a.when}</dd>
            <dt className="font-medium text-fd-foreground">Then</dt>
            <dd>{a.then}</dd>
            {has(a.verifies) && (
              <>
                <dt className="font-medium text-fd-foreground">Verifies</dt>
                <dd className="font-code text-sm">{a.verifies!.join(', ')}</dd>
              </>
            )}
          </dl>
        ),
        from: a,
      })),
      (items) => <AccordionList origin={origin} items={items} />,
    ),

    'edge-cases': grouped(
      (data.edgeCases ?? []).map((e) => ({
        key: e.id,
        ref: e.id,
        text: e.situation,
        detail: (
          <div className="flex flex-col gap-0.5">
            <span>
              <Label>Required behaviour:</Label>
              {e.behaviour}
            </span>
            {has(e.covers) && (
              <span>
                <Label>Covered by:</Label>
                <span className="font-code text-sm">{e.covers.join(', ')}</span>
              </span>
            )}
          </div>
        ),
        from: e,
      })),
      (items) => <AccordionList origin={origin} items={items} />,
    ),

    'access-matrix': (() => {
      const rows = data.accessMatrix ?? [];
      // Columns follow the actor list, then any role only the matrix mentions.
      const roles = [
        ...new Set([
          ...(data.actors ?? []).map((a) => a.name).filter((n) => rows.some((r) => n in r.roles)),
          ...rows.flatMap((r) => Object.keys(r.roles)),
        ]),
      ];
      return (
        <>
          <Grid
            head={['Action', ...roles]}
            rows={rows.map((r) => [
              <span key="a" className="font-medium">
                {r.action} {origin(r)}
              </span>,
              ...roles.map((role) => <AccessCell key={role} value={r.roles[role]} />),
            ])}
          />
          {rows.some((r) => r.note) && (
            <ul className="mt-3 text-sm text-fd-muted-foreground">
              {rows
                .filter((r) => r.note)
                .map((r) => (
                  <li key={r.action}>
                    <Label>{r.action}:</Label>
                    {r.note}
                  </li>
                ))}
            </ul>
          )}
          <p className="mt-3 text-sm text-fd-muted-foreground">
            <strong>Any</strong>: every appointment. <strong>Own</strong>: appointments the actor
            takes part in. <strong>None</strong>: not allowed.
          </p>
        </>
      );
    })(),

    tables: (
      <div className="flex flex-col gap-10">
        {(data.tables ?? []).map((t) => (
          <section key={t.name}>
            <h2 id={`table-${t.name}`} className="scroll-m-20 font-code">
              {t.name} {origin(t)}
            </h2>
            <p>{t.description}</p>
            <Grid
              head={['Column', 'Type', 'Null', 'Default', 'Notes']}
              rows={t.columns.map((c) => [
                <code key="n">{c.name}</code>,
                <code key="t">{c.type}</code>,
                c.nullable ? 'yes' : 'no',
                c.default ? <code key="d">{c.default}</code> : '',
                c.note ?? '',
              ])}
            />
            {has(t.indexes) && (
              <>
                <p className="mt-5 font-medium">Indexes</p>
                <ul>
                  {t.indexes.map((i) => (
                    <li key={i.name}>
                      <code>{i.definition}</code>
                      {i.note && <span className="text-fd-muted-foreground"> {i.note}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {has(t.constraints) && (
              <>
                <p className="mt-5 font-medium">Constraints</p>
                <ul>
                  {t.constraints.map((c) => (
                    <li key={c.name}>
                      <code>{c.definition}</code>
                      {c.note && <span className="text-fd-muted-foreground"> {c.note}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ))}
      </div>
    ),

    settings: (
      <Grid
        head={['Setting', 'Type', 'Default', 'Description']}
        rows={(data.settings ?? []).map((st) => [
          <code key="n">{st.name}</code>,
          <code key="t">{st.type}</code>,
          st.default ? <code key="d">{st.default}</code> : 'none',
          <span key="x">
            {st.description} {origin(st)}
          </span>,
        ])}
      />
    ),

    'technical-notes': grouped(
      (data.technicalNotes ?? []).map((n) => ({
        key: n.title,
        ref: n.id,
        meta: [n.id],
        body: (
          <>
            <p>{n.text}</p>
            {n.code && (
              <pre className="mt-2 overflow-x-auto rounded-lg border border-fd-border bg-fd-muted/50 p-3 text-xs">
                <code>{n.code}</code>
              </pre>
            )}
          </>
        ),
        from: n,
      })),
      (items) => <ItemList origin={origin} items={items} />,
    ),

    traceability: (
      <>
        <Grid
          head={['Id', 'Statement', 'Verified by']}
          rows={traceRows(data).map((r) => [
            <code key="i">{r.id}</code>,
            r.text,
            r.verifiedBy.length > 0 ? (
              <code key="v">{r.verifiedBy.join(', ')}</code>
            ) : (
              <span key="v" className="text-fd-muted-foreground">
                Not verified yet
              </span>
            ),
          ])}
        />
        <p className="mt-3 text-sm text-fd-muted-foreground">
          Derived from the ids each acceptance criterion lists under Verifies.
        </p>
      </>
    ),

    constraints: grouped(
      (data.constraints ?? []).map((c) => ({
        key: c.id,
        ref: c.id,
        text: c.text,
        detail: c.rationale && (
          <>
            <Label>Why:</Label>
            {c.rationale}
          </>
        ),
        from: c,
      })),
      (items) => <AccordionList origin={origin} items={items} />,
    ),

    assumptions: grouped(
      (data.assumptions ?? []).map((a) => ({
        key: a.id,
        ref: a.id,
        text: a.text,
        detail: a.rationale && (
          <>
            <Label>Why:</Label>
            {a.rationale}
          </>
        ),
        from: a,
      })),
      (items) => <AccordionList origin={origin} items={items} />,
    ),

    references: grouped(
      (data.references ?? []).map((r) => ({
        key: (
          <a href={r.url} target="_blank" rel="noreferrer noopener">
            {r.title}
          </a>
        ),
        ref: r.id,
        meta: [r.id],
        body: r.note,
        from: r,
      })),
      (items) => <ItemList origin={origin} items={items} />,
    ),

    actors: grouped(
      (data.actors ?? []).map((a) => ({ term: a.name, def: a.description, from: a })),
      (items) => <DefinitionList origin={origin} items={items} />,
    ),
    concepts: grouped(
      (data.concepts ?? []).map((c) => ({ term: c.name, def: c.description, from: c })),
      (items) => <DefinitionList origin={origin} items={items} />,
    ),
    glossary: grouped(
      (data.glossary ?? []).map((g) => ({ term: g.term, def: g.definition, from: g })),
      (items) => <DefinitionList origin={origin} items={items} />,
    ),

    decisions: grouped(
      (data.decisions ?? []).map((d) => ({
        key: d.id,
        ref: d.id,
        text: d.decision,
        meta: d.date,
        detail: (
          <div className="flex flex-col gap-0.5">
            <span>
              <Label>Why:</Label>
              {d.rationale}
            </span>
            {d.alternatives && (
              <span>
                <Label>Considered:</Label>
                {d.alternatives}
              </span>
            )}
          </div>
        ),
        from: d,
      })),
      (items) => <AccordionList origin={origin} items={items} />,
    ),

    'open-questions': (
      <ul className="not-prose mt-3 flex flex-col gap-2">
        {(data.openQuestions ?? []).map((q) => (
          <li
            key={q}
            className="flex gap-3 rounded-lg border border-dashed border-fd-border px-3 py-2.5 leading-relaxed"
          >
            <span
              aria-hidden="true"
              className="grid size-5 shrink-0 place-items-center rounded-full bg-fd-muted text-xs font-medium text-fd-muted-foreground"
            >
              ?
            </span>
            {q}
          </li>
        ))}
      </ul>
    ),

    changelog: (
      <ol className="not-prose relative mt-3 flex flex-col gap-5 border-l border-fd-border pl-5">
        {(data.changelog ?? []).map((c) => (
          <li key={c.version} className="relative">
            <span
              aria-hidden="true"
              className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full border-2 border-fd-background bg-fd-primary"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">v{c.version}</Badge>
              {c.date && <span className="text-sm text-fd-muted-foreground">{c.date}</span>}
              {c.breaking && <Badge tone="red">breaking</Badge>}
            </div>
            <ul className="mt-1.5 list-disc pl-5 text-sm leading-relaxed">
              {c.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    ),
  };

  const groups = activeSpecGroups(data);

  // A section page: just that section, with a line saying which spec it belongs to.
  if (section) {
    return (
      <div className="mt-2">
        <SubPageNote data={data} baseUrl={baseUrl} />
        {lists[section]}
      </div>
    );
  }

  const overview = groups.find((g) => g.id === 'overview');
  return (
    <div className="mt-16">
      <SpecIntro data={data} />
      {overview?.sections.map((id) => (
        <section key={id}>
          <h3 id={id} className="scroll-m-20">
            {sectionTitle(id)}
          </h3>
          {lists[id]}
        </section>
      ))}
      <SpecContents groups={groups} baseUrl={baseUrl} />
    </div>
  );
}

/** Every other page of this spec, by group, at the end of the module's own page. */
function SpecContents({ groups, baseUrl }: { groups: SpecGroup[]; baseUrl: string }) {
  const folders = groups.filter((g) => g.slug);
  if (folders.length === 0) return null;
  return (
    <section>
      <h3 id="in-this-specification" className="scroll-m-20">
        In this specification
      </h3>
      <dl className="not-prose mt-3 divide-y divide-fd-border border-b border-fd-border">
        {folders.map((g) => (
          <div key={g.id} className="grid gap-2 px-3 py-3 sm:grid-cols-[11rem_1fr] sm:gap-6">
            <dt className="font-medium">{g.title}</dt>
            <dd className="flex flex-col gap-1.5">
              {g.sections.map((id) => (
                <span key={id}>
                  <Link href={`${baseUrl}/${g.slug}/${id}`} className="font-medium text-fd-primary">
                    {sectionTitle(id)}
                  </Link>
                  <span className="text-fd-muted-foreground">: {sectionSummary(id)}</span>
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Opens a sub-page: the spec and version it belongs to, and how layers are shown. */
function SubPageNote({ data, baseUrl }: { data: ModuleSpecData; baseUrl: string }) {
  const layered = has(data.lineage?.basedOn);
  const statusText = data.status === 'stable' ? 'stable' : data.status === 'deprecated' ? 'deprecated' : 'draft';
  return (
    <p className="text-sm text-fd-muted-foreground">
      Part of the <Link href={baseUrl}>{data.module} specification</Link>, v{data.version} ({statusText}).
      {layered && ' Items are grouped by the layer they come from.'}
    </p>
  );
}

/**
 * Opens the spec: where the page sits in its chain, then what it is for.
 * Plain prose and one callout - the reference below does the rest.
 */
function SpecIntro({ data }: { data: ModuleSpecData }) {
  const lineage = data.lineage;
  const kindOf = layerKinds(data);
  const statusText =
    data.status === 'stable' ? 'Stable' : data.status === 'deprecated' ? 'Deprecated' : 'Draft';

  const LayerLink = ({ title, url, layer }: { title: string; url: string; layer: string }) => (
    <Link href={url} className="inline-flex items-center gap-1.5 font-medium">
      <span className={`size-2 rounded-full ${LAYER_DOT[kindOf(layer)]}`} aria-hidden="true" />
      {title}
    </Link>
  );

  return (
    <>
      <h2 id="specification" className="scroll-m-20">
        Specification
      </h2>

      <div className="not-prose my-6 rounded-xl border border-fd-primary/20 bg-fd-primary/5 px-5 py-4 text-[0.95rem] leading-relaxed">
        <p className="text-sm font-medium text-fd-primary">
          {statusText} v{data.version} of the {data.module} module
        </p>
        {lineage && lineage.basedOn.length > 0 ? (
          <p className="mt-1.5">
            Builds on{' '}
            {lineage.basedOn.map((l, i) => (
              <span key={l.url}>
                {i > 0 && (i === lineage.basedOn.length - 1 ? ' and ' : ', ')}
                <LayerLink {...l} />
              </span>
            ))}
            . Everything from those pages is included in this specification and labelled with where it comes from.
          </p>
        ) : (
          <p className="mt-1.5">
            This is a core page. Industry and domain pages build on it and add only what they need.
          </p>
        )}
        {lineage && lineage.extendedBy.length > 0 && (
          <p className="mt-1.5">
            Extended by{' '}
            {lineage.extendedBy.map((l, i) => (
              <span key={l.url}>
                {i > 0 && (i === lineage.extendedBy.length - 1 ? ' and ' : ', ')}
                <LayerLink {...l} />
              </span>
            ))}
            .
          </p>
        )}
      </div>

      {data.purpose && <p>{data.purpose}</p>}
      {has(data.scope) && (
        <>
          <p>
            <strong>In scope</strong>
          </p>
          <ul>
            {data.scope!.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </>
      )}
      {has(data.nonGoals) && (
        <>
          <p>
            <strong>Not covered here</strong>
          </p>
          <ul>
            {data.nonGoals!.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

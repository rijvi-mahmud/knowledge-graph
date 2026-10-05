import type { ModuleSpecData } from '@/components/module-spec';
import { SPEC_GROUPS, sectionTitle } from './spec-sections';

/**
 * Serialises the structured SRS frontmatter into Markdown.
 *
 * This is the AI-facing counterpart to <ModuleSpec />: same frontmatter, same
 * sections, same order - one rendered for the browser, one for llms.txt and
 * the /content.md routes. Without this the machine surface would carry only the
 * prose body, which is the smaller half of the spec.
 */

const has = (v: unknown[] | undefined): v is unknown[] => Array.isArray(v) && v.length > 0;

/** Markdown table from a header row and pre-stringified cells. */
function table(head: string[], rows: (string | number | undefined)[][]): string {
  const esc = (c: string | number | undefined) =>
    String(c ?? '-')
      .replace(/\|/g, '\\|')
      .replace(/\n+/g, ' ');

  return [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`),
  ].join('\n');
}

const bullets = (items: string[]) => items.map((i) => `- ${i}`).join('\n');

type Cell = string | number | undefined;
type Provenance = { layer?: string; overrides?: string };

/**
 * `groupId` limits the output to one page of the spec (a sub-page). Without
 * it, the whole spec is returned: that is what the module's own .md serves,
 * so an agent gets the complete spec in one fetch.
 */
export function specToMarkdown(data: ModuleSpecData, groupId?: string): string {
  if (!data.module) return '';

  const out: string[] = [];
  // Reference sections are collected by title, then emitted grouped in the
  // same order as the HTML page (see spec-sections.ts).
  const sections = new Map<string, string>();
  const section = (title: string, body: string) => {
    // A sub-page carries its own group only; purpose and scope live on the module's page.
    if (groupId && title === 'Purpose & scope') return;
    if (
      title === 'Module identity' ||
      title === 'How to read this spec' ||
      title === 'Purpose & scope'
    ) {
      out.push(`## ${title}\n\n${body}`);
    } else {
      sections.set(title, body);
    }
  };

  // Provenance mirrors <ModuleSpec />: a Layer column on tables and a tag on
  // cards, only once the page inherits from another layer.
  const lineage = data.lineage;
  const layered = has(lineage?.basedOn);
  const tag = (i: Provenance) =>
    i.layer ? `${i.layer}${i.overrides ? ` (overrides ${i.overrides})` : ''}` : '';
  const mark = (i: Provenance) => (layered && i.layer ? ` _[${tag(i)}]_` : '');
  const head = (cols: string[]) => (layered ? [...cols, 'Layer'] : cols);
  const rows = <T extends Provenance>(items: T[], fn: (i: T) => Cell[]) =>
    items.map((i) => (layered ? [...fn(i), tag(i)] : fn(i)));
  const links = (ls: { title: string; url: string; layer: string }[]) =>
    ls.map((l) => `${l.title} (${l.layer}, ${l.url})`).join('; ');

  // Identity - lets an assistant know which layer it is reading before anything else.
  const chain = [...(lineage?.basedOn.map((l) => l.layer) ?? []), lineage?.layer ?? 'core'];
  const identity = [
    `- module: ${data.module}`,
    `- layer: ${chain.join(' > ')}`,
    lineage && has(lineage.basedOn) ? `- based on: ${links(lineage.basedOn)}` : null,
    lineage && has(lineage.extendedBy) ? `- extended by: ${links(lineage.extendedBy)}` : null,
    `- version: ${data.version ?? '0.1.0'}`,
    `- status: ${data.status ?? 'draft'}`,
  ]
    .filter(Boolean)
    .join('\n');
  section('Module identity', identity);

  // Written for assistants: what the spec does and does not promise.
  section(
    'How to read this spec',
    bullets([
      'This is the complete spec for this page, with every inherited item already merged in.',
      'If a behaviour is not listed here, it is unspecified. Do not assume or invent it - ask, or record it as an open question.',
      'Ids such as BR-1, FR-2 and AC-3 are stable. Cite them in code, tests and commit messages.',
      layered
        ? 'Tags such as [core] or [healthcare] show which layer an item comes from. "overrides X" means it replaces the item with the same id from layer X.'
        : 'This is a core page: nothing is inherited, and other pages build on it.',
    ]),
  );

  if (data.purpose || has(data.scope) || has(data.nonGoals)) {
    const parts: string[] = [];
    if (data.purpose) parts.push(data.purpose);
    if (has(data.scope)) parts.push(`**In scope**\n\n${bullets(data.scope!)}`);
    if (has(data.nonGoals)) parts.push(`**Out of scope**\n\n${bullets(data.nonGoals!)}`);
    section('Purpose & scope', parts.join('\n\n'));
  }

  if (has(data.actors))
    section(
      'Actors',
      table(
        head(['Actor', 'Description']),
        rows(data.actors!, (a) => [a.name, a.description]),
      ),
    );

  if (has(data.concepts))
    section(
      'Concepts',
      table(
        head(['Concept', 'Meaning']),
        rows(data.concepts!, (c) => [c.name, c.description]),
      ),
    );

  if (has(data.dataModel))
    section(
      'Data model',
      table(
        head(['Field', 'Type', 'Required', 'Description', 'Constraints']),
        rows(data.dataModel!, (f) => [
          f.name,
          f.type,
          f.required ? 'yes' : 'no',
          f.description,
          f.constraints,
        ]),
      ),
    );

  if (has(data.relationships))
    section(
      'Relationships',
      table(
        head(['Edge', 'Target', 'Note']),
        rows(data.relationships!, (r) => [r.type, r.target, r.note]),
      ),
    );

  // Rationale is emitted inline - it is the part that stops an assistant
  // "correcting" a rule it does not understand.
  if (has(data.businessRules))
    section(
      'Business rules',
      data
        .businessRules!.map((r) =>
          [`**${r.id}** ${r.text}${mark(r)}`, r.rationale ? `  - Why: ${r.rationale}` : null]
            .filter(Boolean)
            .join('\n'),
        )
        .join('\n'),
    );

  if (has(data.validations))
    section(
      'Validations',
      table(
        head(['Field', 'Rule', 'Error']),
        rows(data.validations!, (v) => [v.field, v.rule, v.error]),
      ),
    );

  if (data.stateMachine) {
    const sm = data.stateMachine;
    section(
      'State machine',
      [
        `Initial state: \`${sm.initial}\`. States: ${sm.states.map((s) => `\`${s}\``).join(', ')}.${mark(sm)}`,
        'Any transition not listed below is invalid.',
        '',
        table(
          ['From', 'To', 'Trigger', 'Guard'],
          sm.transitions.map((t) => [t.from, t.to, t.trigger, t.guard]),
        ),
      ].join('\n'),
    );
  }

  if (has(data.workflows))
    section(
      'Workflows',
      data
        .workflows!.map((w) =>
          [
            `#### ${w.name}${mark(w)}`,
            w.actor ? `Actor: ${w.actor}` : null,
            w.trigger ? `Trigger: ${w.trigger}` : null,
            '',
            w.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
            w.outcome ? `\nOutcome: ${w.outcome}` : null,
          ]
            .filter((l) => l !== null)
            .join('\n'),
        )
        .join('\n\n'),
    );

  if (has(data.assumptions))
    section(
      'Assumptions',
      data
        .assumptions!.map((a) =>
          [`**${a.id}** ${a.text}${mark(a)}`, a.rationale ? `  - Why: ${a.rationale}` : null]
            .filter(Boolean)
            .join('\n'),
        )
        .join('\n'),
    );

  if (has(data.functionalRequirements))
    section(
      'Functional requirements',
      table(
        head(['ID', 'Requirement', 'Priority', 'Verified by']),
        rows(data.functionalRequirements!, (r) => [r.id, r.text, r.priority, r.verification]),
      ),
    );

  if (has(data.constraints))
    section(
      'Constraints',
      data
        .constraints!.map((c) =>
          [`**${c.id}** ${c.text}${mark(c)}`, c.rationale ? `  - Why: ${c.rationale}` : null]
            .filter(Boolean)
            .join('\n'),
        )
        .join('\n'),
    );

  if (has(data.nonFunctionalRequirements))
    section(
      'Quality requirements',
      table(
        head(['Category', 'Requirement']),
        rows(data.nonFunctionalRequirements!, (n) => [n.category, n.text]),
      ),
    );

  if (has(data.acceptanceCriteria))
    section(
      'Acceptance criteria',
      data
        .acceptanceCriteria!.map(
          (a) =>
            `**${a.id}**${mark(a)}\n- Given ${a.given}\n- When ${a.when}\n- Then ${a.then}` +
            (has(a.verifies) ? `\n- Verifies: ${a.verifies!.join(', ')}` : ''),
        )
        .join('\n\n'),
    );

  if (has(data.api))
    section(
      'API contract',
      data
        .api!.map((e) =>
          [
            `#### \`${e.method} ${e.path}\`${mark(e)}`,
            e.description,
            e.request ? `- Request: ${e.request}` : null,
            e.response ? `- Response: ${e.response}` : null,
            e.errors.length > 0 ? `- Errors: ${e.errors.join(', ')}` : null,
          ]
            .filter(Boolean)
            .join('\n'),
        )
        .join('\n\n'),
    );

  if (has(data.events))
    section(
      'Events',
      table(
        head(['Event', 'Description', 'Payload']),
        rows(data.events!, (e) => [e.name, e.description, e.payload.join(', ')]),
      ),
    );

  if (has(data.permissions))
    section(
      'Permissions',
      table(
        head(['Permission', 'Grants']),
        rows(data.permissions!, (p) => [p.name, p.description]),
      ),
    );

  if (has(data.errors))
    section(
      'Errors',
      table(
        head(['Code', 'HTTP', 'Meaning']),
        rows(data.errors!, (e) => [e.code, e.http, e.message]),
      ),
    );

  if (has(data.dependencies))
    section(
      'Dependencies',
      table(
        head(['Service', 'Direction', 'Criticality', 'Reason']),
        rows(data.dependencies!, (d) => [d.service, d.direction, d.criticality, d.reason]),
      ),
    );

  if (has(data.decisions))
    section(
      'Decisions',
      data
        .decisions!.map((d) =>
          [
            `**${d.id}${d.date ? ` (${d.date})` : ''}** ${d.decision}${mark(d)}`,
            `  - Why: ${d.rationale}`,
            d.alternatives ? `  - Considered: ${d.alternatives}` : null,
          ]
            .filter(Boolean)
            .join('\n'),
        )
        .join('\n'),
    );

  if (has(data.glossary))
    section(
      'Glossary',
      table(
        head(['Term', 'Definition']),
        rows(data.glossary!, (g) => [g.term, g.definition]),
      ),
    );

  if (has(data.openQuestions)) section('Open questions', bullets(data.openQuestions!));

  if (has(data.references))
    section(
      'References',
      table(
        head(['ID', 'Source', 'Note']),
        rows(data.references!, (r) => [r.id, `[${r.title}](${r.url})`, r.note]),
      ),
    );

  if (has(data.changelog))
    section(
      'Version history',
      data
        .changelog!.map((c) =>
          [
            `**v${c.version}${c.date ? ` (${c.date})` : ''}**${c.breaking ? ' (breaking)' : ''}`,
            bullets(c.changes),
          ].join('\n'),
        )
        .join('\n\n'),
    );

  for (const group of SPEC_GROUPS) {
    if (groupId && group.id !== groupId) continue;
    const present = group.sections.filter((id) => sections.has(sectionTitle(id)));
    if (present.length === 0) continue;
    out.push(`## ${group.title}`);
    for (const id of present)
      out.push(`### ${sectionTitle(id)}\n\n${sections.get(sectionTitle(id))}`);
  }

  return out.join('\n\n');
}

import type { ModuleSpecData } from '@/components/module-spec';
import { SPEC_GROUPS, sectionTitle, type SpecSectionId } from './spec-sections';

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
 * `sectionId` limits the output to one section (a sub-page). Without
 * it, the whole spec is returned: that is what the module's own .md serves,
 * so an agent gets the complete spec in one fetch.
 */
export function specToMarkdown(data: ModuleSpecData, sectionId?: SpecSectionId): string {
  if (!data.module) return '';

  const out: string[] = [];
  // Reference sections are collected by title, then emitted grouped in the
  // same order as the HTML page (see spec-sections.ts).
  // Sections are collected by id, then emitted in group order.
  const sections = new Map<string, string>();
  const section = (title: string, body: string) => {
    // A sub-page carries its own section only; purpose and scope live on the module's page.
    if (sectionId && title === 'Purpose & scope') return;
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
      'If a behaviour is not listed here, it is unspecified. Do not assume or invent it. Ask, or record it as an open question.',
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
      'actors',
      table(
        head(['Actor', 'Description']),
        rows(data.actors!, (a) => [a.name, a.description]),
      ),
    );

  if (has(data.concepts))
    section(
      'concepts',
      table(
        head(['Concept', 'Meaning']),
        rows(data.concepts!, (c) => [c.name, c.description]),
      ),
    );

  if (has(data.dataModel))
    section(
      'data-model',
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
      'relationships',
      table(
        head(['Edge', 'Target', 'Note']),
        rows(data.relationships!, (r) => [r.type, r.target, r.note]),
      ),
    );

  // Rationale is emitted inline - it is the part that stops an assistant
  // "correcting" a rule it does not understand.
  if (has(data.businessRules))
    section(
      'business-rules',
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
      'validations',
      table(
        head(['Field', 'Rule', 'Error']),
        rows(data.validations!, (v) => [v.field, v.rule, v.error]),
      ),
    );

  if (data.stateMachine) {
    const sm = data.stateMachine;
    section(
      'state-machine',
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
      'workflows',
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
      'assumptions',
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
      'requirements',
      table(
        head(['ID', 'Requirement', 'Priority', 'Verified by']),
        rows(data.functionalRequirements!, (r) => [r.id, r.text, r.priority, r.verification]),
      ),
    );

  if (has(data.constraints))
    section(
      'constraints',
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
      'nfrs',
      table(
        head(['Category', 'Requirement']),
        rows(data.nonFunctionalRequirements!, (n) => [n.category, n.text]),
      ),
    );

  if (has(data.acceptanceCriteria))
    section(
      'acceptance',
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
      'api',
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
      'events',
      table(
        head(['Event', 'Description', 'Payload']),
        rows(data.events!, (e) => [e.name, e.description, e.payload.join(', ')]),
      ),
    );

  if (has(data.permissions))
    section(
      'permissions',
      table(
        head(['Permission', 'Grants']),
        rows(data.permissions!, (p) => [p.name, p.description]),
      ),
    );

  if (has(data.errors))
    section(
      'errors',
      table(
        head(['Code', 'HTTP', 'Meaning']),
        rows(data.errors!, (e) => [e.code, e.http, e.message]),
      ),
    );

  if (has(data.dependencies))
    section(
      'dependencies',
      table(
        head(['Service', 'Direction', 'Criticality', 'Reason']),
        rows(data.dependencies!, (d) => [d.service, d.direction, d.criticality, d.reason]),
      ),
    );

  if (has(data.decisions))
    section(
      'decisions',
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
      'glossary',
      table(
        head(['Term', 'Definition']),
        rows(data.glossary!, (g) => [g.term, g.definition]),
      ),
    );

  if (has(data.openQuestions)) section('open-questions', bullets(data.openQuestions!));

  if (has(data.dependencies)) {
    const node = (name: string) => name.replace(/[^A-Za-z0-9_]/g, '_');
    const lines = (data.dependencies ?? []).map((d) =>
      d.direction === 'upstream'
        ? `  M -->|${d.criticality}: ${d.reason.replace(/[|"]/g, '')}| ${node(d.service)}[${d.service}]`
        : `  M -.->|${d.reason.replace(/[|"]/g, '')}| ${node(d.service)}[${d.service}]`,
    );
    section(
      'context',
      [
        'Solid arrows are services this module calls; dotted arrows are services it notifies.',
        ['```mermaid', 'flowchart LR', `  M[${data.module}]`, ...lines, '```'].join('\n'),
      ].join('\n\n'),
    );
  }

  if (has(data.apiConventions))
    section(
      'api-conventions',
      table(
        head(['Topic', 'Convention', 'Reference']),
        rows(data.apiConventions!, (c) => [c.topic, c.text, c.reference]),
      ),
    );

  if (has(data.eventEnvelope) || has(data.deliveryGuarantees))
    section(
      'event-delivery',
      [
        has(data.eventEnvelope)
          ? 'Every event carries this envelope, following CloudEvents:\n\n' +
            table(
              head(['Attribute', 'Type', 'Required', 'Description']),
              rows(data.eventEnvelope!, (e) => [e.name, e.type, e.required ? 'yes' : 'no', e.description]),
            )
          : null,
        has(data.deliveryGuarantees)
          ? data
              .deliveryGuarantees!.map((g) =>
                [`**${g.id}** ${g.text}${mark(g)}`, g.rationale ? `  - Why: ${g.rationale}` : null]
                  .filter(Boolean)
                  .join('\n'),
              )
              .join('\n')
          : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
    );

  if (has(data.personalData))
    section(
      'privacy',
      table(
        head(['Field', 'Category', 'Purpose', 'Retention']),
        rows(data.personalData!, (d) => [d.field, d.category, d.purpose, d.retention]),
      ),
    );

  if (has(data.performanceTargets))
    section(
      'performance',
      table(
        head(['Id', 'Indicator', 'Target', 'Measured as']),
        rows(data.performanceTargets!, (t) => [t.id, t.indicator, t.target, t.measurement]),
      ),
    );

  if (has(data.acronyms))
    section(
      'acronyms',
      table(head(['Acronym', 'Meaning']), rows(data.acronyms!, (g) => [g.term, g.definition])),
    );

  if (has(data.risks))
    section(
      'risks',
      data
        .risks!.map((r) =>
          [`**${r.id}** ${r.risk}${mark(r)}`, `  - Impact: ${r.impact}`, `  - Mitigation: ${r.mitigation}`].join('\n'),
        )
        .join('\n'),
    );

  if (has(data.edgeCases))
    section(
      'edge-cases',
      data
        .edgeCases!.map((e) =>
          [
            `**${e.id}** ${e.situation}${mark(e)}`,
            `  - Required behaviour: ${e.behaviour}`,
            has(e.covers) ? `  - Covered by: ${e.covers.join(', ')}` : null,
          ]
            .filter(Boolean)
            .join('\n'),
        )
        .join('\n'),
    );

  if (has(data.accessMatrix)) {
    const rowsIn = data.accessMatrix!;
    const roles = [
      ...new Set([
        ...(data.actors ?? []).map((a) => a.name).filter((n) => rowsIn.some((r) => n in r.roles)),
        ...rowsIn.flatMap((r) => Object.keys(r.roles)),
      ]),
    ];
    section(
      'access-matrix',
      [
        table(
          head(['Action', ...roles]),
          rows(rowsIn, (r) => [r.action, ...roles.map((role) => r.roles[role] ?? 'none')]),
        ),
        'any: every appointment. own: appointments the actor takes part in. none: not allowed.',
        ...rowsIn.filter((r) => r.note).map((r) => `- ${r.action}: ${r.note}`),
      ].join('\n\n'),
    );
  }

  if (has(data.tables))
    section(
      'tables',
      data
        .tables!.map((t) =>
          [
            `#### \`${t.name}\`${mark(t)}`,
            t.description,
            table(
              ['Column', 'Type', 'Null', 'Default', 'Notes'],
              t.columns.map((c) => [c.name, c.type, c.nullable ? 'yes' : 'no', c.default, c.note]),
            ),
            has(t.indexes)
              ? `Indexes:\n${bullets(t.indexes.map((i) => `\`${i.definition}\`${i.note ? ` ${i.note}` : ''}`))}`
              : null,
            has(t.constraints)
              ? `Constraints:\n${bullets(t.constraints.map((c) => `\`${c.definition}\`${c.note ? ` ${c.note}` : ''}`))}`
              : null,
          ]
            .filter(Boolean)
            .join('\n\n'),
        )
        .join('\n\n'),
    );

  if (has(data.settings))
    section(
      'settings',
      table(
        head(['Setting', 'Type', 'Default', 'Description']),
        rows(data.settings!, (st) => [st.name, st.type, st.default ?? 'none', st.description]),
      ),
    );

  if (has(data.technicalNotes))
    section(
      'technical-notes',
      data
        .technicalNotes!.map((n) =>
          [`#### ${n.id}: ${n.title}${mark(n)}`, n.text, n.code ? `\`\`\`\n${n.code}\n\`\`\`` : null]
            .filter(Boolean)
            .join('\n\n'),
        )
        .join('\n\n'),
    );

  if ((data.acceptanceCriteria ?? []).some((a) => has(a.verifies))) {
    const verifiers = new Map<string, string[]>();
    for (const a of data.acceptanceCriteria ?? [])
      for (const id of a.verifies ?? []) verifiers.set(id, [...(verifiers.get(id) ?? []), a.id]);
    const ids = [
      ...(data.businessRules ?? []).map((r) => r.id),
      ...(data.functionalRequirements ?? []).map((r) => r.id),
      ...(data.constraints ?? []).map((c) => c.id),
    ];
    section(
      'traceability',
      table(
        ['Id', 'Verified by'],
        ids.map((id) => [id, (verifiers.get(id) ?? []).join(', ') || 'not verified yet']),
      ),
    );
  }

  if (has(data.references))
    section(
      'references',
      table(
        head(['ID', 'Source', 'Note']),
        rows(data.references!, (r) => [r.id, `[${r.title}](${r.url})`, r.note]),
      ),
    );

  if (has(data.changelog))
    section(
      'changelog',
      data
        .changelog!.map((c) =>
          [
            `**v${c.version}${c.date ? ` (${c.date})` : ''}**${c.breaking ? ' (breaking)' : ''}`,
            bullets(c.changes),
          ].join('\n'),
        )
        .join('\n\n'),
    );

  // A sub-page: its one section, as the page's only heading below the guide.
  if (sectionId) {
    const body = sections.get(sectionId);
    if (body) out.push(`## ${sectionTitle(sectionId)}\n\n${body}`);
    return out.join('\n\n');
  }

  for (const group of SPEC_GROUPS) {
    const present = group.sections.filter((id) => sections.has(id));
    if (present.length === 0) continue;
    out.push(`## ${group.title}`);
    for (const id of present) out.push(`### ${sectionTitle(id)}\n\n${sections.get(id)}`);
  }

  return out.join('\n\n');
}

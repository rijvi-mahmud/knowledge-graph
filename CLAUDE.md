# Knowledge Graph

Open-source, versioned specification of the domain knowledge software teams
rebuild on every project. Not a framework, not code generation, not a SaaS —
knowledge, structured so both engineers and AI assistants read the same source.

## The premise

Roughly 80% of domain requirements repeat across companies in the same industry.
A team building patient scheduling and a team building advisor scheduling
independently derive the same booking lifecycle. This project specifies the
shared ground once, per domain concept, and keeps it versioned. Companies layer
their own 20% on top.

Do not market this as "80% solved" — the exact share varies a lot by domain
(patient registration is standardised; insurance claims and clinical workflows
are not). Position it as a canonical foundation to build from.

## Architecture

Fumadocs (Next.js 16, Turbopack, Tailwind v4, MDX) in `src/`, content in
`content/docs/`.

| Path | Role |
|---|---|
| `source.config.ts` | The graph schema. Zod frontmatter definition — the heart of the project. |
| `content/docs/core/<module>.mdx` | Core layer of a module, industry-neutral. |
| `content/docs/<industry>/` | Industry: `index.mdx` overview, `<module>.mdx` industry layers, `<domain>/` folders. |
| `src/lib/spec-inherit.ts` | Resolves a page's `extends` chain into one merged spec tagged with provenance. |
| `src/lib/spec-sections.ts` | Reference sections and their 6 groups, in reading order. Shared by both renderers. |
| `content/docs/agentic/` | Agentic development: using the graph in a project end to end, plus AGENTS.md, Claude Code, Cursor and Copilot setup. |
| `src/components/module-spec.tsx` | Renders frontmatter to HTML for humans. |
| `src/lib/spec-markdown.ts` | Renders the same frontmatter to Markdown for AI. |
| `src/lib/source.ts` | `getLLMText()` — joins spec markdown + prose for `llms.txt` routes. |

### Frontmatter is the source of truth

Every structured fact (data model, rules, API, events, dependencies, decisions)
lives in frontmatter. The MDX body carries only narrative that does **not**
repeat it. Structure is what makes company overrides, version diffing and
machine queries possible — prose cannot be addressed programmatically. A rule
with id `BR-2` can be overridden by a company layer; paragraph four cannot.

**Both renderers must stay in sync.** Adding a section to `source.config.ts`
means updating `module-spec.tsx` *and* `spec-markdown.ts`. If only the React one
is updated, the section becomes invisible to AI — which defeats the entire
premise. This bug already happened once: `llms.mdx` was serving prose only until
`spec-markdown.ts` was written.

### Content model: Core → Industry → Domain

Knowledge lives at three levels, each inheriting from the one above:

| Level | Holds | Example |
|---|---|---|
| **Core** | Domain-neutral concept, no industry vocabulary | Appointment: provider, subject, time, lifecycle |
| **Industry** | Rules every domain in that industry shares | Healthcare: Person becomes Patient; HIPAA, insurance eligibility, consent |
| **Domain** | A kind of application inside an industry: what it adds, plus domain-only modules | Dental: chair/operatory booking, recall intervals; Treatment plans |

Healthcare and Finance are **industries**. EHR, Dental, Mental health and RCM
are **domains** under Healthcare; Wealth advisory and Lending are domains under
Finance.

```
Core
 ├─ Appointment, Person, Billing, Notification ...
Industries
 ├─ Healthcare
 │   ├─ industry base         shared healthcare rules
 │   └─ domains
 │       ├─ EHR               Patients · Appointments · Encounters
 │       ├─ Dental            Patients · Appointments · Treatment plans
 │       ├─ Mental health     Patients · Appointments · Therapy notes
 │       └─ RCM               Patients · Appointments · Claims · Denials
 └─ Finance
     ├─ industry base         KYC, compliance, audit
     └─ domains
         ├─ Wealth advisory   Clients · Appointments · Portfolios
         └─ Lending           Borrowers · Appointments · Loans
```

Each domain covers the shared modules (patients, appointments, ...) **from its
own purpose**. RCM's Appointments page is about when a visit becomes billable,
not about booking.

Rules:

- **Extend, never fork.** A domain page declares what it extends
  (`core/appointment → healthcare/appointment → dental/appointment`) and writes
  only its delta — extra fields, rules, endpoints, dependencies. The site
  renders the merged result so the reader still sees the full picture.
- **Industry base is real content, not a folder.** A rule that applies to every
  domain in an industry is written once at the industry level. Never copy it
  into EHR, Dental and RCM separately.
- **Promotion path.** A rule repeated in 2+ domains moves up to the industry.
  A rule repeated in 2+ industries moves up to core.
- **Domain-only modules have no core.** Encounters, Treatment plans, Claims live
  only in their domain. Do not invent a fake core for them.
- **Cap at three levels.** Needing a fourth usually means a concept deserves its
  own module.
- **"Reviewed, nothing to add" gets a page.** Where a domain needs nothing extra
  for a shared module, write the page saying so. It must stay distinguishable
  from "nobody has looked at this yet." See `productivity/appointment.mdx`.

### Spec page layout

Reference style: **Mastra docs** - one readable article column, no tabs, no
filters, no card grids (the user tried those and found them hard to read).

Page order: title and description → narrative (MDX body) → **Specification**:
a single tinted callout (status, version, what it builds on, what extends it),
purpose and scope as plain prose and lists, then the reference. Reference
groups (Rules & behaviour, Data, Interface, Requirements, People & terms,
History) are `h2`, sections are `h3`, and every section renders through one
`ItemList`: key (monospace for ids and names), muted metadata, body, note, and
the source layer as small coloured text. The TOC nests sections under groups.

The AI markdown uses the same groups and opens with a "How to read this spec"
guide telling assistants that anything unlisted is unspecified. Change group
order or titles in `spec-sections.ts` only, so both renderers move together.

Sidebar: one plain tree with folder icons (set via `icon` in `meta.json`). No
root tabs, no separators, no nav links repeated in the docs sidebar - the user
found those confusing.

### Navigation and UX

- Top level: **Core** plus one entry per industry.
- Inside an industry: an industry overview, then its domains.
- Inside a domain: shared modules first (Patients, Appointments) in the **same
  order in every domain**, then domain-only modules. A reader moving between
  domains always knows where they are.
- A domain sidebar shows only that domain — no sibling domains leak in.
- Every rule carries a provenance label (`core` · `healthcare` · `dental`) so
  readers know what is universal and companies know which rule id to override.
- Each domain page links "Based on" its parent. Each core page lists "Used in"
  with links to every domain version — that is where cross-domain comparison
  lives.
- A domain overview doubles as a roadmap.sh-style build order (shared modules →
  must-have → nice-to-have). This replaces the earlier "industry roadmap view"
  plan.

### How inheritance is wired

Frontmatter: `industry` (unset = core), `domain` (requires `industry`), and
`extends` = parent page path relative to `content/docs`, e.g.
`extends: core/appointment` or `extends: healthcare/appointment`. A parent
must be the same `module`; a missing parent, a cycle or a module mismatch
throws at render time, so a broken chain fails the build rather than
rendering a partial spec.

`resolveSpec` in `spec-inherit.ts` merges the chain:

- Domain facts (data model, rules, API, events, errors, decisions, ...)
  inherit. Items match on their natural key (rule `id`, field `name`, endpoint
  `method + path`, error `code`, ...). A child item with the same key replaces
  the parent's and records `overrides`. Everything else appends, core first.
- Overview and history (`purpose`, `scope`, `nonGoals`, `openQuestions`,
  `changelog`, `version`, `status`) describe the layer itself and never inherit.
- `stateMachine` is replaced wholesale by the nearest layer defining one.

Both renderers take the resolved spec. Adding a frontmatter list section means
adding its key to `KEYS` in `spec-inherit.ts` too, or it will silently stop
inheriting.

Industry folders use fumadocs `root: true` in `meta.json`, so each industry is
its own sidebar tab. Inside an industry, `---Shared across <industry>---` and
(once domains exist) `---Domains---` separators group the sidebar.

## Writing conventions

The target is a senior technical writer at a Meta/Google-scale company. These
rules were established by explicit user feedback — follow them.

### Titles name the reader's world, not the system's structure

Never `Appointment - Healthcare`. That names the page after the knowledge base's
internal layering. Use domain-native language the practitioner already uses:

- `Clinical appointments` (healthcare)
- `Advisory appointments` (fintech)
- `General scheduling` (productivity)

An engineer scanning a sidebar must recognise their page instantly and ignore
the rest.

### Pages never reference sibling industries or domains

A health-tech engineer does not care about KYC, and a dental engineer does not
care about RCM claims. Cross-industry and cross-domain comparisons belong on the
**core page** ("Used in"), where someone extending the module to a new domain
would look — see "How the industry layers diverge" in `core/appointment.mdx`.
Industry and domain pages link only up their own inheritance chain.

References are fine; forcing an irrelevant industry or domain on a reader is not.

### Headings are claims, not labels

`Consent gates completion, not booking` — not `What this layer adds`. A reader
skimming headings should absorb the actual content.

### Argue from consequence

State the domain rule, then why it holds — in terms of what failure costs.
"Refusing to schedule a patient because a payer's API was slow is a worse
outcome than a delayed claim" explains more than restating the rule.

### No meta-commentary in domain pages

Do not explain the knowledge-graph system inside a module page. Banned patterns:
"This page exists so the graph carries...", "which is the property the whole
knowledge graph is built to preserve". Write about the domain. System
explanation belongs in `content/docs/index.mdx`.

### Research domain facts, never write from memory

Before writing or changing domain content, search for current sources and
verify every concrete claim: code sets and their versions (e.g. CDT changes
every 1 January), regulations, payer rules, and how leading products in the
domain actually behave. A first dental draft written from memory got
procedure-time arithmetic, double-booking defaults and procedure completion
wrong; the user asked explicitly for researched, up-to-date practice. Where
sources disagree or practice varies, model it as a setting or an open question
rather than picking one.

### Rationale is a first-class field

`businessRules[].rationale` and `decisions[].rationale` are not decoration. The
reason behind a constraint is the first thing lost when knowledge moves between
people, and it is what stops an assistant "fixing" a rule it does not
understand. Always fill them.

## Positioning and home page copy

The product is **knowledge sharing**: requirements written once and inherited,
never rewritten. Industries and domains (healthcare, dental, ...) are example
content, never the headline. Rules set by the user, who works in dev-tools
business development and content:

- Lead with what is unique, not what already exists elsewhere: inheritance
  (core → industry → domain), override by id, per-rule provenance, promotion of
  repeated rules, and AI receiving the merged spec for one exact domain.
  Rationale fields, version history and llms.txt exist elsewhere - support
  points at most.
- Hooks, not paragraphs. Short headlines, one-line card copy, minimal body
  text. Devtool analogies land ("method override", "extend, don't copy-paste").
- Visual reference: Supabase / Neon / Upstash - bento cards with live mini
  visuals, two-tone headings, tinted glow, small transitions, no shadows.
- Home page data is read from the specs (`src/app/(home)/page.tsx`), so counts
  and examples stay true as content changes.

## Branding

Amber/orange accent, defined in `src/app/global.css` over the fumadocs neutral
base. Only accent-carrying variables are overridden so long spec tables stay
readable. Light mode uses a deeper amber than dark — the same hue loses contrast
on a light background. Logo mark is three linked nodes in
`src/lib/layout.shared.tsx`.

## Development gotchas

**Never run `pnpm build` while a dev server is running.** Both write to `.next`,
and the build clobbers the dev chunks, producing misleading
`Cannot find module 'fumadocs-ui/provider/next'` errors. Recovery: stop dev,
`rm -rf .next .source`, restart. To verify changes while dev is up, rely on the
dev server's own compile output instead.

**Nav link active states.** `active: 'nested-url'` is a prefix match, so a link
to `/docs` lights up on every docs page. The `/docs` link uses `active: 'url'`
(exact); only the deeper Modules link uses `nested-url`.

**Scaffold defaults.** `create-fumadocs-app` requires the template flag
`+next+fuma-docs-mdx` and prompts interactively without `--linter`/`--search`/
`--install`. Non-graph pages must keep `module` optional in the schema, or the
scaffold's own pages fail validation.

## Known TODO

- `gitConfig` in `src/lib/shared.ts` still points at `fuma-nama/fumadocs`, so
  the GitHub link and every "Edit on GitHub" URL are wrong.
- Only one module exists (`appointment`). The schema has not been stress-tested
  against a second, structurally different concept.
- No validator yet for cross-references (e.g. an endpoint raising an error code
  absent from `errors`, or a dependency naming a service with no page).
- Company-layer overrides are designed for but not implemented — no merge or
  precedence semantics exist yet for a private 20% layer on top of a public
  module.
- Only one domain exists (`healthcare/dental`, appointment module only). EHR,
  Mental health, RCM, Wealth advisory and Lending are listed as "Not yet
  specified" on their industry overviews and have no pages, so they do not
  appear in the sidebar.

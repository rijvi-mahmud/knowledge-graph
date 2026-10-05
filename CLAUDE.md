# Knowledge Graph

Open-source, versioned specification of the domain knowledge software teams
rebuild on every project. Not a framework, not code generation, not a SaaS:
knowledge, structured so both engineers and AI assistants read the same source.

Production: https://knowledge-graph-ecru.vercel.app (Vercel). Pushes to `main`
deploy to production; every PR gets a preview build, which sits behind Vercel
deployment protection (fetch it with `vercel curl`, not plain `curl`).

## Working rules

These apply to every task: writing, coding, configuration and reference
content. The user set them so they don't have to repeat them.

### Research first, from official sources

Don't work from memory. Before you write docs, code, configuration or a
domain fact, search the web and read the official, trusted source:

- **Code and tools**: the framework's or vendor's own docs (nextjs.org,
  fumadocs.dev, code.claude.com, docs.github.com, cursor.com/docs).
- **Standards and formats**: the RFC or specification itself (rfc-editor.org,
  llmstxt.org, agents.md).
- **Domain facts**: regulators, standards bodies, and the documentation of
  leading products in that domain. See
  [Research domain facts](#research-domain-facts-never-write-from-memory).
- **Writing**: the [Mastra docs](https://mastra.ai/docs) first, then the
  [Google developer documentation style guide](https://developers.google.com/style)
  and [Diátaxis](https://diataxis.fr/).

Blogs and forums are only for finding the primary source. When sources
disagree, say so, and model the difference as a setting or an open question
instead of picking one. Tell the user which sources you used.

Example: the user suggested `proxy.ts` belongs outside `src/`. The Next.js
docs say it sits next to `app`, which here is `src/app`, so `src/proxy.ts` is
correct. Check, then answer.

### Write like the Mastra docs, everywhere

Use Mastra's word choice in every page, `CLAUDE.md`, the README and replies
to the user: plain, short, everyday words that are easy to read.

- **Short sentences** in the active voice, with "you" and contractions
  (`don't`, `it's`).
- **Plain words** over formal ones: "use" not "utilise", "about" not
  "approximately", "so" not "therefore".
- **No em dashes (—) or en dashes (–).** Use a period, comma, colon or
  parentheses instead. In "link: description" lists, use a colon.
- **No filler or hype**: no "simply", "just", "easy", "seamless", "powerful",
  "please note" or exclamation marks.

[Guide pages follow the Mastra docs style](#guide-pages-follow-the-mastra-docs-style)
covers page structure.

## The premise

Roughly 80% of domain requirements repeat across companies in the same industry.
A team building patient scheduling and a team building advisor scheduling
independently derive the same booking lifecycle. This project specifies the
shared ground once, per domain concept, and keeps it versioned. Companies layer
their own 20% on top.

Do not market this as "80% solved". The exact share varies a lot by domain
(patient registration is standardised; insurance claims and clinical workflows
are not). Position it as a canonical foundation to build from.

## Architecture

Fumadocs (Next.js 16, Turbopack, Tailwind v4, MDX) in `src/`, content in
`content/docs/`.

| Path | Role |
|---|---|
| `source.config.ts` | The graph schema. Zod frontmatter definition, and the heart of the project. |
| `content/docs/core/<module>.mdx` | Core layer of a module, industry-neutral. |
| `content/docs/<industry>/` | Industry: `index.mdx` overview, `<module>.mdx` industry layers, `<domain>/` folders. |
| `src/lib/spec-inherit.ts` | Resolves a page's `extends` chain into one merged spec tagged with provenance. |
| `src/lib/spec-sections.ts` | Reference sections and their 6 groups, in reading order. Shared by both renderers. |
| `content/docs/agentic/` | Agentic development: the copy-paste `AGENTS.md` section, how agents navigate and read specs, prompts, and Claude Code, Cursor and Copilot notes. |
| `src/app/llms.txt/route.ts` | Agent entry point: a "How agents should use" guide, then every page as an absolute `.md` link. |
| `src/components/module-spec.tsx` | Renders frontmatter to HTML for humans. |
| `src/lib/spec-markdown.ts` | Renders the same frontmatter to Markdown for AI. |
| `src/lib/source.ts` | `getLLMText()` joins spec markdown + prose for `llms.txt` routes. |
| `src/proxy.ts` | Serves markdown for `/docs/<page>.md` and `Accept: text/markdown`. Must stay in `src/`, or Next.js skips it. |
| `src/lib/shared.ts` | `siteUrl`: this deployment's address, from `NEXT_PUBLIC_SITE_URL`, else Vercel's production domain, else localhost. |
| `src/lib/remark-site-url.ts` | Replaces `%SITE_URL%` (https URL) and `%SITE_HOST%` (hostname, for allowlists) in MDX at compile time, in the HTML and in the AI markdown. Changing it needs a dev server restart. |

### How projects use the Knowledge Graph

There is no CLI, MCP server, skill or download. A user copies one section into
their project's `AGENTS.md` (the Quickstart on `content/docs/agentic/index.mdx`)
and the agent does the rest with its own web fetch or search tools: it works
out the project's industry and domain, starts at `/llms.txt`, and fetches the
most specific page as `/docs/<page>.md` when a task needs it. Keep that section
project-agnostic and module-agnostic, so it works pasted unedited. Don't
document vendoring specs or per-module setup.

### Never hardcode the site address in content

Write `%SITE_URL%` wherever a doc shows a full URL to this site (prose, links,
code blocks), never `https://knowledge-graph-ecru.vercel.app`. A self-hosted
copy then documents its own address. Root-relative links (`/docs/...`) need no
token.

### Frontmatter is the source of truth

Every structured fact (data model, rules, API, events, dependencies, decisions)
lives in frontmatter. The MDX body carries only narrative that does **not**
repeat it. Structure is what makes company overrides, version diffing and
machine queries possible. Prose cannot be addressed programmatically. A rule
with id `BR-2` can be overridden by a company layer; paragraph four cannot.

**Both renderers must stay in sync.** Adding a section to `source.config.ts`
means updating `module-spec.tsx` *and* `spec-markdown.ts`. If only the React one
is updated, the section becomes invisible to AI, which defeats the entire
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
  only its delta: extra fields, rules, endpoints and dependencies. The site
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
- A domain sidebar shows only that domain. No sibling domains leak in.
- Every rule carries a provenance label (`core` · `healthcare` · `dental`) so
  readers know what is universal and companies know which rule id to override.
- Each domain page links "Based on" its parent. Each core page lists the
  layers that extend it, by title and industry only. Cross-industry
  comparison lives in `content/docs/index.mdx`.
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
rules were established by explicit user feedback. Follow them.

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
care about RCM claims. Industry and domain pages link only up their own
inheritance chain.

References are fine; forcing an irrelevant industry or domain on a reader is not.

### Core pages use no industry vocabulary

A core page must read as industry-neutral: no patients, clinicians, payers,
KYC or advisors in its spec, examples or narrative, and no healthcare-only
standards (such as FHIR) as evidence. Use neutral examples (host and guest,
customer and consultant) and cross-industry sources (iCalendar, Google
Calendar, Cal.com). The user flagged a core page that read like a healthcare
page. The only industry content allowed is the neutral list of layers that
extend it ("Industry layers": title plus industry name).

Cross-industry comparisons that teach how to design a layer, such as "Industries
decide when a check runs by what failure costs", belong in
`content/docs/index.mdx`, not on a core page.

### Headings are claims, not labels (domain pages)

`Consent gates completion, not booking`, not `What this layer adds`. A reader
skimming headings should absorb the actual content. This applies to module
narrative. Guide pages use task headings instead (see below).

### Guide pages follow the Mastra docs style

Pages that tell the reader how to do something (`content/docs/agentic/`, and
any future setup or contributor guides) follow [Mastra's docs](https://mastra.ai/docs),
which the user chose as the model. The user found the earlier versions of these
pages correct but not written like an expert technical writer.

- **Title** is a short noun or task: `Agent instructions`, `Set up a project`.
- **Open** with one or two sentences saying what the thing is and what it does,
  then what this page covers. No rhetorical hooks ("Plausible is the problem").
- **`When to use X`** early on, including when to use something else instead.
- **`Quickstart`** with the smallest working example, when the page has one.
- **Headings** are tasks in sentence case: `Download the specs`,
  `Load a spec for matching files`, `Verify the setup`.
- **One page, one job** ([Diátaxis](https://diataxis.fr/)): steps, reference
  tables and explanation each live in one place. Link instead of repeating.
- **Steps**: condition before instruction ("To update specs, run ..."), one
  action per step, the result straight after it. Show expected output.
- **Introduce every code block** with a sentence ending in a colon; follow it
  with one or two sentences on what happens.
- **Voice**: second person, active, contractions (`don't`, `it's`). No "simply",
  "just", "easy", "please note", exclamation marks or figurative language.
  Recommend directly: "We recommend X because Y."
- **Callouts** are rare and start `> **Note:**`, `> **Tip:**` or
  `> **Warning:**`.
- **Never a placeholder** the reader has to fill from another page
  (`<paste the block here>`). Show the content, or link to the section.
- **Tool-specific pages** end their setup with
  `[More info on X in <tool>](vendor docs)`, verified against those docs.
- **End** with `## Next steps` (a Goal | Start here table) and/or `## Related`
  (link, colon, one-line description).
- Pages read by agents may open with a `**For AI agents:**` paragraph.

### Argue from consequence

State the domain rule, then why it holds, in terms of what failure costs.
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
readable. Light mode uses a deeper amber than dark, because the same hue loses contrast
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

- Only one module exists (`appointment`). The schema has not been stress-tested
  against a second, structurally different concept.
- No validator yet for cross-references (e.g. an endpoint raising an error code
  absent from `errors`, or a dependency naming a service with no page).
- Company-layer overrides are designed for but not implemented. No merge or
  precedence semantics exist yet for a private 20% layer on top of a public
  module.
- Only one domain exists (`healthcare/dental`, appointment module only). EHR,
  Mental health, RCM, Wealth advisory and Lending are listed as "Not yet
  specified" on their industry overviews and have no pages, so they do not
  appear in the sidebar.

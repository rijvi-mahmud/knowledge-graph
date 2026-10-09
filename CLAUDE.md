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
| `src/lib/spec-sections.ts` | Reference sections and their groups (one sub-page each), in reading order. Shared by both renderers and the source loader. |
| `content/docs/agentic/` | Agentic development: the copy-paste `AGENTS.md` section, how agents navigate and read specs, prompts, and Claude Code, Cursor and Copilot notes. |
| `src/app/llms.txt/route.ts` | Agent entry point, following llmstxt.org: H1, blockquote, the agent guide as plain paragraphs (no headings before the first H2), then one H2 file list per top-level group (Docs, Agentic development, Core, each industry) and `## Optional` (reference implementation pages, `llms-full.txt`). Generated from the page tree. |
| `src/app/openapi/[...slug]/route.ts`, `src/lib/spec-openapi.ts` | `/openapi/<module>.json`: OpenAPI 3.1 generated from each module's merged operations and errors. Inputs and outputs stay prose. Validate with `npx @redocly/cli lint --extends=minimal`. |
| `.github/workflows/check.yml` | CI on every pull request and push to `main`: `check:specs --strict`, `build` (which type-checks), and Redocly lint of the generated OpenAPI files. |
| `.github/workflows/snapshot.yml` | Runs `snapshot:specs` after each successful Vercel production deployment (`repository_dispatch` `vercel.deployment.success`) and commits new snapshots. Can also be run by hand (`workflow_dispatch`). |
| `contentLicense`, `attribution()` in `src/lib/shared.ts` | Content is CC BY-SA 4.0 (code is AGPL-3.0). Every markdown response ends with a TASL attribution line, `/llms.txt` states the license, and OpenAPI files carry `CC-BY-SA-4.0`. Never label content with the code license. |
| `scripts/snapshot-specs.ts`, `src/app/versions/[...slug]/route.ts` | `pnpm snapshot:specs` saves each module's published merged markdown once per version to `content/versions/<module>/<version>.md`, served at `/versions/...` and listed in `/llms.txt` Optional. It only saves when production shows the source version. |
| `src/app/sitemap.ts`, `src/app/robots.ts` | Every page (module, section and variant pages included) in `/sitemap.xml`, and `/robots.txt` allowing all crawlers and pointing to it, so agents' web searches can find pages. Both generated, so new modules need no change. |
| `src/components/module-spec.tsx` | Renders frontmatter to HTML for humans. |
| `src/lib/spec-markdown.ts` | Renders the same frontmatter to Markdown for AI. |
| `src/lib/source.ts` | `getLLMText()` joins spec markdown + prose for `llms.txt` routes. |
| `src/proxy.ts` | Serves markdown for `/docs/<page>.md` and `Accept: text/markdown`. Must stay in `src/`, or Next.js skips it. |
| `src/lib/shared.ts` | `siteUrl`: this deployment's address, from `NEXT_PUBLIC_SITE_URL`, else Vercel's production domain, else localhost. |
| `scripts/check-specs.ts` | `pnpm check:specs`: validates every module page (schema, inheritance, ids, error codes, dashes, verification coverage). |
| `src/lib/remark-site-url.ts` | Replaces `%SITE_URL%` (https URL) and `%SITE_HOST%` (hostname, for allowlists) in MDX at compile time, in the HTML and in the AI markdown. Changing it needs a dev server restart. |

### How projects use the Knowledge Graph

There is no CLI, MCP server, skill or download. A user copies one section into
their project's `AGENTS.md` (the Quickstart on `content/docs/agentic/index.mdx`)
and the agent does the rest with its own web fetch or search tools: it works
out the project's industry and domain, starts at `/llms.txt`, and fetches the
most specific page as `/docs/<page>.md` when a task needs it. Keep that section
project-agnostic, module-agnostic and industry-agnostic, so it works pasted
unedited in any domain. Write the rules with placeholders such as
`<industry>` and `<module>`, never healthcare words (the user caught this
once), then add short examples labelled as examples so agents see the rule
applied: one real path (such as healthcare > ehr) and one from another
industry marked illustrative, because it may not exist yet. It must also keep agents on their own path
(core, their industry, their domain) and never on a sibling domain's page. Don't
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
| **Domain** | A kind of application inside an industry: what it adds, plus domain-only modules | EHR: hospital outpatient scheduling, the handoff to an encounter; Encounters, Admission/discharge/transfer |

**Current focus: a hospital EHR.** The user is building a hospital management
system, so the content is only what serves that: the core modules, the
Healthcare industry, and EHR as its one domain. Finance, Productivity, Dental
and other domains were removed on 2026-10-05; don't add other industries or
domains unless the user asks.

```
Core
 └─ Appointment (complete, the reference example)
Industries
 └─ Healthcare
     ├─ industry base         rules every healthcare app shares (privacy of health data, ...),
     │                        and shared modules: Patients, Appointments, Encounters,
     │                        Clinical documentation, Practitioners, Terminology,
     │                        Identity and access, Consent
     └─ domains
         └─ EHR               Patients · Appointments · Encounters · ADT · Clinical documentation · Terminology
                              · Practitioners · Identity and access · Consent
                              · Orders and results · Medications and allergies
```

The EHR overview (`content/docs/healthcare/ehr/index.mdx`) is the build order.
Each domain covers the shared modules (patients, appointments, ...) **from its
own purpose**.

Rules:

- **Extend, never fork.** A domain page declares what it extends
  (`core/appointment → healthcare/appointment → ehr/appointment`) and writes
  only its delta: extra fields, rules, endpoints and dependencies. The site
  renders the merged result so the reader still sees the full picture.
- **Industry base is real content, not a folder.** A rule that applies to every
  domain in an industry is written once at the industry level. Never copy it
  into each domain separately.
- **Promotion path.** A rule repeated in 2+ domains moves up to the industry.
  A rule repeated in 2+ industries moves up to core.
- **Domain-only modules have no core.** Encounters and admission, discharge and
  transfer live only in their domain. Do not invent a fake core for them.
- **A module can start at the industry level** when there is no neutral
  concept worth sharing yet. The user chose this for Patients
  (`healthcare/patient`, no core page) and for Terminology
  (`healthcare/terminology`, with an EHR page that adds nothing). Add a core
  page only when a second industry needs the concept.
- **Reusable modules live in the healthcare core; each domain holds only its
  own rules.** The user will add many kinds of health application later (EMR,
  mental health, dental, pharmacy, laboratory, telehealth and more). So any
  module or rule that another kind of application could reuse goes at the
  healthcare level, even while EHR is the only domain, and each domain page
  holds only what is specific to that kind of application: EHR rules stay in
  EHR, EMR rules in EMR, dental rules in dental. A module whose whole job is
  specific to one kind of application (ADT for hospitals) stays in that
  domain. Before writing a module, decide which of its rules are reusable and
  which are domain-only, and split it into a healthcare page and a domain
  layer. Set by the user on 2026-10-09. Done that day: Terminology,
  Encounters and Clinical documentation each have a healthcare page and an EHR
  layer, and Appointments and Patients moved their reusable EHR items up.
  When the healthcare page is new, moved items keep their number with an H
  prefix (BR-E7 becomes BR-H7); when it already exists, they take the next
  free H numbers, and the changelog lists the mapping. To split a module, move whole items, override an item in the domain
  layer by reusing its id when only its wording is hospital-specific, and check
  that the healthcare page never names an id, field, setting, event, error or
  operation that exists only in the domain layer, or calls the provider "the
  hospital" (cite hospital law as hospital law, but say "the organization"
  otherwise), and that it passes the
  structural audit on its own. Audit with overrides applied: an upper layer that
  replaces an operation or dependency must keep every error and contract line
  of the item it replaces, or they silently disappear.
- **Cap at three levels.** Needing a fourth usually means a concept deserves its
  own module.
- **"Reviewed, nothing to add" gets a page.** Where a domain needs nothing extra
  for a shared module, write the page saying so. It must stay distinguishable
  from "nobody has looked at this yet."

### Spec page layout: one module, several short pages

Reference style: **Mastra docs**. One readable article column, no tabs, no
filters, no card grids (the user tried those and found them hard to read).

A long spec on one page was hard to read, so every module is a subtree in the
sidebar: one folder per group, one focused page per section. Its frontmatter
still lives in **one** MDX file; `src/lib/source.ts` turns that file into the
folder's index (the overview) and adds a virtual page for every section that
has content. Inheritance and both renderers work on the one file, unchanged.
Folders are open by default. Groups and titles follow ISO/IEC/IEEE 29148 and
are defined only in `spec-sections.ts`:

| Folder | Pages |
|---|---|
| (module page) | Narrative, the Specification callout, purpose and scope, product perspective (diagram from dependencies), actors, assumptions and dependencies, and an "In this specification" list |
| Functions | Business rules, state machine, workflows, validations, edge cases |
| Data | Data model (logical), relationships |
| External interfaces | API (each operation with its HTTP method, path and success status), API conventions, events, event delivery guarantees, errors (with HTTP status), dependencies |
| Security | Permission matrix (actions × actors: any, own, none or a condition), permissions, privacy and retention, compliance (each HIPAA, GDPR or other legal obligation, how it's met, status and covering ids, `CMP-`) |
| Requirements | Functional requirements (with verification method), performance requirements (SLIs and targets), quality attributes (ISO/IEC 25010), design constraints, configuration |
| Reference implementation | Non-normative. Storage design (reference PostgreSQL tables, indexes, constraints) and implementation notes |
| Verification | Acceptance criteria, traceability matrix (derived from each criterion's `verifies`) |
| Supporting information | Concepts, glossary, acronyms, decisions, risks, open questions, references, version history |

**Variants.** When kinds of one module differ in only a few items, such as
outpatient and inpatient appointments, don't split the module. Declare
`variants` (id, title, description, summary) and tag the items that apply to
only one with `variant:`. Each variant gets its own sidebar page right after
the Introduction, listing its summary and its tagged items; untagged items
apply to every variant. `pnpm check:specs` fails on a tag that isn't declared.

**Jurisdiction tags.** An item that applies in only one jurisdiction carries
`jurisdiction: us` or `jurisdiction: eu`; untagged items apply everywhere.
`resolveSpec` prefixes its lead text with "US only:" or "EU only:", so both
renderers show it without separate code, and the AGENTS.md section, `/llms.txt`
and each spec's "How to read this spec" tell agents to skip items for
jurisdictions their project doesn't operate in. Tag an item only when the item
itself applies in one place (Medicare notices, TCPA limits, GDPR Article 14),
not when its rationale merely cites a law or it states values for both. Every
compliance item is tagged: `pnpm check:specs` fails on a HIPAA, CFR, Medicare,
ONC or No Surprises item not tagged `us`, or a GDPR or EHDS item not tagged `eu`.

**Filtering by jurisdiction.** Agents add `?jurisdiction=us` or `eu` to any
`.md` URL; `src/proxy.ts` rewrites it to the static `content.us.md` file the
markdown route generates, because a static route never sees the query. People
use the Jurisdiction selector on spec pages, which sets the `kg-jurisdiction`
cookie; the proxy rewrites the HTML page to a static `__us` segment that the
page route strips off. Both filter with `jurisdictionSpec`
(`src/lib/spec-jurisdiction.ts`). Constants live in `src/lib/jurisdictions.ts`,
which imports nothing, so the proxy and client code can use it. `/openapi/<module>.json?jurisdiction=us`
is served from a static `<module>.us.json` the same way. `pnpm check:specs`
filters each spec for every jurisdiction and fails when a kept item cites,
names or uses an item the filter hid, so a filtered page never dead-ends.
Narrative prose can't be tagged or filtered, so prose about one region names
it in its heading or first sentence ("In the United States, ...").

Adding a section to `spec-sections.ts` (plus its schema field, `KEYS` entry and
both renderers) gives it a page in every module. URLs are
`/docs/<module>/<group>/<section>`.

Markdown: `/docs/<module>.md` returns the **complete** spec, so an agent gets
everything in one fetch; `/docs/<module>/<group>/<section>.md` returns one section. The AI
markdown opens with a "How to read this spec" guide telling assistants that
anything unlisted is unspecified. Sub-pages carry no `module` in their data, so
listings, inheritance, `llms-full.txt` and Ask AI skip them.

Sidebar: one plain tree with folder icons (set via `icon` in `meta.json`). No
root tabs, no separators, no nav links repeated in the docs sidebar. The user
found those confusing.

### Every id is a link, and every reference is specific

- Any id in a module page (BR-4, FR-E2, AC-3, EC-1, ADR-11, CON-2, AS-1, DG-1,
  PERF-4, RISK-2, REF-5, CMP-3) links to its item, in the prose
  (`remark-spec-ids.ts`) and in the spec pages (`linkIds` in
  `module-spec.tsx`). The prefix-to-section map lives only in
  `src/lib/spec-ids.ts`. A new id prefix must be added there.
- `pnpm check:specs` fails if a page mentions an id that doesn't exist
  (changelogs excepted, since they mention removed ids).
- Never say "core" alone for a module. Core will hold many modules, so write
  "the core Appointment specification" or link the page. "The module's core
  page" is fine in general guidance.

### Each module is its own bounded context

A module specifies only its own job. When it needs another module, it states
only what it needs from it or gives it, never how that module works. The user's
example: Appointment needs a patient, but doesn't need to know how a patient is
created. In domain-driven design this is a bounded context; the relationships
between contexts are a context map (Fowler).

- Every dependency lists its **contract** (`contract:` in frontmatter):
  "Asks: does this identity exist?", "Gives: appointment.checked_in". The
  Dependencies page is the module's context map. `pnpm check:specs` warns
  about a dependency without one.
- Name who owns a concept ("owned by the Organization module", "Identity's
  concern"), then stop. Never describe the other module's rules, data model
  or workflow, and never prescribe how it behaves.
- Refer to another module's data by id, plus the few fields this module reads.
- If a rule really belongs to another module, it goes on that module's page
  when that page is written, not here.

### Requirements say what, including the interface; never how it's stored or coded

Requirements must be implementation-free (an ISO/IEC/IEEE 29148
characteristic) and singular: one requirement, stated in one place.

- **Normative**: business rules, operations, errors, events and quality
  attributes. The HTTP interface counts as an external interface requirement,
  because HTTP is a standard, not a vendor choice. Each operation carries its
  method, path and success status, and each error its HTTP status, so an
  endpoint is never described twice. `pnpm check:specs` fails if two
  operations share a method and path.
- **Non-normative**: storage (tables, SQL) and code live only in the
  Reference implementation group, marked as one way to build it. No
  requirement may reference them, so a team on another store or language
  replaces only that group.
- When the same fact appears in two places, keep it in one and remove the
  other (for example DG-3 was dropped because FR-15 states it).

### Every module page is a complete SRS

Treat each module, at every layer, as a complete software requirements
specification (ISO/IEC/IEEE 29148), not a feature summary. Writing it that way
is what surfaces the edge cases. Before calling a module done, check it has:

- **Assumptions** (`AS-`) and **constraints** (`CON-`), each with a reason
- A **verification method** on every functional requirement (test,
  demonstration, inspection or analysis)
- **Acceptance criteria** whose `verifies` list cites rule, requirement or
  constraint ids that exist, with no "Not verified yet" left in the
  traceability matrix
- A **permission matrix**, a reference **storage design** (non-normative), **edge cases**
  (`EC-`, each citing the ids that cover it), **configuration** and
  **technical notes** (`TN-`)
- **Privacy and retention** for every field holding personal data, and an
  erasure rule that respects GDPR Article 17(3)
- **Compliance** (`CMP-`): every HIPAA (Privacy, Security and Breach
  Notification Rules) and GDPR obligation that applies, plus other law such
  as 42 CFR Part 2, EMTALA or the EHDS, with how it's met and the ids that
  meet it. Status is met, partly met, deployment (an organisational duty,
  such as a risk analysis or DPIA) or other module (named). The core page
  lists only GDPR, which isn't industry-specific. Verify every provision in
  eCFR or EUR-Lex before citing it.
- **Delivery guarantees** (`DG-`, including what every event carries), **API
  conventions**, **performance requirements** (`PERF-`, measurable; targets
  that vary by deployment say so instead of inventing a number), **risks**
  (`RISK-`) and **acronyms**
- **Error codes** for every failure, including upstream outages
- **Edge cases** researched from standards and leading products: concurrency,
  retries, time zones and daylight saving gaps and overlaps, terminal states,
  deletion, and what happens when a dependency is down
- **References** (`REF-`) to the official sources used

`core/appointment.mdx` is the reference example. Bring other modules to the
same depth with the same pattern.

### How to bring a module to full SRS depth

This is the approach that produced Appointments and Patients. Follow it for
every module and layer, and for every "is there any gap?" request.

1. **Read before you change.** Read the page and every layer that extends it.
   Check which fields, error codes and ids the layers use, because a change to
   a parent reaches all of them through inheritance.
2. **Research from official sources** (see [Working rules](#working-rules)):
   standards (ISO/IEC/IEEE 29148, ISO/IEC 25010, the relevant RFCs),
   regulators, and the docs of leading products in the domain. Check concrete
   facts against real data. For example, compute daylight saving dates and
   durations with the IANA database (`python3` and `zoneinfo`) instead of
   writing them from memory. See [Research sources that worked](#research-sources-that-worked).
3. **Run a gap check** in two parts, then report before fixing. Deep web
   research against official sources is mandatory in every gap check, not
   only the automated checks (the user requires it):
   - **Structural**: a short Python audit over the merged frontmatter. Look
     for errors no operation or validation raises, events nothing emits,
     settings nothing references, permissions unused, fields missing from
     Privacy and retention or from the storage design, operations with no
     permission matrix row, events no contract consumes, coded fields with no
     `codes:`, and error codes or events no acceptance criterion tests (each
     error needs one naming its code and HTTP status).
   - **Cross-module business logic**: walk every lifecycle event through each
     module that receives it (merge, unmerge, death, entered in error,
     check-in, discharge, legal hold) and check the result still obeys each
     module's own rules. Check that linked records (an appointment and its
     encounter) can't drift apart, that one fact has one owner (retention,
     sensitivity, charges), and that every mistake can be undone.
   - **Relations and standard workflows**: search the web for the standard
     workflow and check every relation and step against it. Compare
     relations with FHIR R5 reference cardinalities (such as
     Encounter.appointment 0..*, basedOn, account, identifier), encounter
     workflows with IHE PAM ITI-31 (pending events, cancels, temporary
     transfers, historic movements), imaging with IHE Scheduled Workflow,
     and pre-visit steps with HFMA patient access practice and US law
     (No Surprises Act good faith estimates, 45 CFR 149.610). Where two
     standards disagree, make it a setting.
   - **Domain**: compare against the SRS checklist above and the sources.
     For healthcare, the ONC SAFER Guides are the best checklist of what
     hospitals get wrong.
   - Fix every finding directly, then report a table, worst first (patient
     safety, legal exposure, then missing sections), split into: gaps inside
     this module, gaps that belong to another module (contract only), and
     internal inconsistencies. The user asked (2026-10-09) not to stop for a
     go-ahead on content fixes.
   - Ask before changing the structure (schema, sections, sidebar); content
     inside the agreed structure doesn't need approval beyond the go-ahead.
4. **Touch only what the module needs.** A feature that deserves its own
   module (theatre, waitlist, consent, coverage, printing, ...) gets a
   non-goal and a dependency `contract` here ("Asks: ...", "Gives: ...",
   "Receives: ..."), and is specified later in its own module. Add it to the
   domain roadmap as "Not yet specified". When this module's change affects
   another written module, update that module's contract and rules too (for
   example Patients merges made Appointments follow patient.merged).
5. **Write a validation layer.** Every field gets a validation rule with its
   error code, from the field's own standard, and a request reports every
   failing field at once. What worked for Patients:
   - Names: loose (W3C "Personal names around the world"): any letters and
     marks, spaces, hyphens, apostrophes, periods; single names and
     single letters valid; case kept; never truncate.
   - Phone E.164, email RFC 5321 (64 and 254 octets), address Project US@
     (US) and ISO 3166-1, language BCP 47, identifiers by their system's
     format and check digit.
   - No placeholders such as UNKNOWN or 1900-01-01: leave blank, partial or
     estimated, and never match on them.
   - Values a person must decide (merge conflicts) are chosen field by field,
     never by a rule such as newest wins.
6. **Name the standard codes.** Every coded field ends its `constraints`
   with `codes: ...`: the code system and, where useful, the codes (HL7 v2
   tables, HL7 v3 code systems, FHIR value sets, LOINC, SNOMED CT, CDCREC,
   ISO). Name the exchange profiles (US Core for the US, HL7 Europe Base for
   the EU), and message mappings such as HL7 v2 ADT events, as constraints
   or compatibility requirements. Verify every code before writing it.
7. **Model what varies as a setting.** Law that differs by US state or EU
   member state (age of majority, retention, minors' records) is a setting,
   never one place's answer. Say in the setting which places you verified
   from the statute, and that the rest need legal advice.
8. **Add a new kind of section in all five places**, or it disappears
   somewhere: the field in `source.config.ts`, its key in `KEYS` in
   `spec-inherit.ts`, the section and group in `spec-sections.ts`, and a
   renderer in both `module-spec.tsx` and `spec-markdown.ts`.
9. **Write the content.**
   - Edit frontmatter with a PyYAML script in the scratchpad (load, change
     the dict, dump with `sort_keys=False`, `width=100000`), keeping the MDX
     body. Never hand-edit long YAML.
   - Keep ids in numeric order, and never reuse or renumber one. A module
     that starts at the industry level (no `extends`) uses `-H` ids and must
     be complete on its own; a domain layer uses `-E` ids and overrides a
     parent item by reusing its id.
   - Every rule has a rationale citing its source, every functional
     requirement a verification method, every acceptance criterion a
     `verifies` list, every edge case a `covers` list, and every reference an
     official URL you checked returns 200.
   - Keep the storage design and Privacy and retention in step with the data
     model, and add implementation notes (`TN-`) for anything hard to build.
   - Core stays industry-neutral. No em or en dashes, and no spaced hyphens
     used as dashes.
   - YAML: quote any value that contains `: `, starts with `[`, or is a number
     meant as text (`'0'`). An unquoted colon in a description broke the build
     once.
10. **Validate** before reporting done:
    - `pnpm check:specs --strict` reports 0 errors and 0 warnings. It checks
      every module page: the schema, inheritance chains, duplicate ids,
      `verifies` and `covers` ids that don't exist, error codes raised but
      not defined, ids mentioned that don't exist, em and en dashes, and
      rules, requirements and constraints no acceptance criterion verifies.
    - Rerun the structural audit from step 3.
    - `pnpm exec tsc --noEmit` passes, if code changed.
    - The module page, a few section pages and their `.md` render on the dev
      server. Use the user's running server; if none is running, validate
      without one rather than starting your own.
11. **Ship.** Bump `version`, add a changelog entry (mark `breaking` honestly),
    update the versions in [Known TODO](#known-todo), commit, push to `main`
    (the user's usual flow), check the pages on production, run
    let the Snapshot specs workflow save the new version (or run
    `pnpm snapshot:specs` and commit it if the workflow didn't run), and tell the user
    what changed, which judgment calls need their review, and which sources
    you used.

### Research sources that worked

- **eCFR** (US regulations): `https://www.ecfr.gov/api/versioner/v1/full/<date>/title-45.xml?part=164&section=164.526`
  with `curl --compressed`. Get `<date>` from `/api/versioner/v1/titles.json`.
- **Journal abstracts**: the Europe PMC API
  (`/europepmc/webservices/rest/search?query=PMCID:...&resultType=core&format=json`),
  because PMC and publishers block automated reads.
- **HL7 code systems**: `https://terminology.hl7.org/CodeSystem-<name>.json`.
  **LOINC and CDCREC lookups**: `https://tx.fhir.org/r4/CodeSystem/$lookup?system=...&code=...`
  with `Accept: application/fhir+json` (loinc.org blocks scripts).
- **Blocked sites** (hhs.gov, ssa.gov, state legislatures): read through
  `https://web.archive.org/web/2025/<url>`.
- **GDPR article text**: gdpr-info.eu mirrors it; cite EUR-Lex as the
  reference URL. The EHDS Regulation (EU) 2025/327 text is in the
  scratchpad as `ehds.txt` when available.
- **Patient identification**: ONC SAFER Guide 6 (2025) and The Joint
  Commission's 2026 hospital goals (NPG.01.01.01).

### Navigation and UX

- Top level: **Core** plus one entry per industry.
- Inside an industry: an industry overview, then its domains.
- Inside a domain: shared modules first (Patients, Appointments) in the **same
  order in every domain**, then domain-only modules. A reader moving between
  domains always knows where they are.
- A domain sidebar shows only that domain. No sibling domains leak in.
- Every rule carries a provenance label (`core` · `healthcare` · `ehr`) so
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
- `stateMachine` is replaced wholesale by the nearest layer defining one. Its
  `initial` is one state, or a list when how an item starts depends on a
  setting (an appointment starts booked, or pending when it needs
  confirmation).

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
- `Appointments` (EHR), with `Outpatient appointments` and `Inpatient appointments` variant pages

An engineer scanning a sidebar must recognise their page instantly and ignore
the rest.

### Pages never reference sibling industries or domains

An engineer on one domain does not care about another domain's concepts. Industry and domain pages link only up their own
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

The project is **for AI agents first, people second**. The headline promise is
that a coding agent fetches the spec for each task instead of guessing domain
rules from memory, and cites what it used. Inheritance is how the specs stay
complete without rewriting; it supports the promise rather than leading it.
Industries and domains (healthcare, EHR, ...) are example content, never the
headline. Rules set by the user, who works in dev-tools business development
and content:

- Lead with the agent: fetched not remembered, cite every rule id, say "not
  specified" instead of inventing, fetch only the sections a task needs. Then
  what is unique: inheritance (core → industry → domain), override by id,
  per-rule provenance, promotion of repeated rules, and the merged spec for
  one exact domain. Rationale fields, version history and llms.txt exist
  elsewhere: support points at most.
- The hero's primary action is "Connect your agent" (the Agentic development
  Quickstart), and the copy button gives `/llms.txt`, never
  `/llms-full.txt`, which agents are told not to load.
- Hooks, not paragraphs. Short headlines, one-line card copy, minimal body
  text. Devtool analogies land ("method override", "extend, don't copy-paste").
- Visual reference: Supabase / Neon / Upstash - bento cards with live mini
  visuals, two-tone headings, tinted glow, small transitions, no shadows.
- Home page data is read from the specs (`src/app/(home)/page.tsx`), so counts
  and examples stay true as content changes. That includes the hero badge,
  which names the richest domain's modules. Never list modules by hand in
  copy; link the domain overview instead.

### Agents are grounded, not trusted

Everything written for agents (`AGENTS.md` Quickstart, `/llms.txt`, the
agentic pages) follows Anthropic's guidance on reducing hallucinations: fetch
the page for this task in this session, treat anything unlisted as
unspecified, cite id + version + URL, and check each cited id against the
fetched text before finishing. Module markdown is 100 KB or more, and many
fetch tools summarise long pages with a smaller model, so agents are told to
fetch section pages (`/docs/<module>/<group>/<section>.md`, a few KB).

Don't assume agents read `/llms.txt` on their own. llms.txt is a proposal
agents are expected to consult, but web search lands agents on HTML pages. So
every docs page also carries `<link rel="alternate" type="text/markdown">` and
a screen-reader-hidden line pointing to its `.md` and to `/llms.txt`
(`src/app/docs/[[...slug]]/page.tsx`), and the `AGENTS.md` section tells the
agent to start at `/llms.txt`. Keep all three.

## Branding

Amber/orange accent, defined in `src/app/global.css` over the fumadocs neutral
base. Only accent-carrying variables are overridden so long spec tables stay
readable. Light mode uses a deeper amber than dark, because the same hue loses contrast
on a light background. Logo mark is three linked nodes in
`src/lib/layout.shared.tsx`.

## Development gotchas

**Don't stop or restart the user's dev server.** The user runs it in their own
terminal. If a cache has to be cleared, tell them the command, or ask before
doing it. To find a server, use `ss -ltnp` and the port. Never use `pkill -f`
with a pattern that also appears in your own command: it kills your own shell.

**Sidebar folders aren't links.** A folder's overview page is listed first
inside it as "Introduction" (an `index` entry in `pages`, renamed by the
`sidebarIntroduction` plugin in `src/lib/source.ts`), and the folder name only
opens and closes. The user found a folder name that both links and toggles
confusing. Every folder with an `index.mdx` lists `"index"` first in its
`meta.json`.

**No sidebar folder starts open.** The user wants every folder collapsed by
default, including the module and Functions. Fumadocs still opens whichever
folder holds the current page.

**Pull before you push.** The Snapshot specs workflow commits to `main` after each production deploy, so run `git pull --rebase origin main` before pushing.

**`pnpm types:check` fails on GitHub's runners**: the standalone `fumadocs-mdx` command writes empty `.source` files there, so CI relies on `next build` for type checking. Locally it works.

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

- EHR is specified in the order of its overview's build list. Done as
  drafts: Consent (`healthcare/consent` 0.3.1, healthcare level, and `healthcare/ehr/consent` 0.1.2 for hospital consent rules), Identity and access (`healthcare/identity` 0.8.1, healthcare level, and `healthcare/ehr/identity` 0.2.1 for shared clinical workstations and downtime access), Practitioners (`healthcare/practitioner` 0.3.4, healthcare level, and `healthcare/ehr/practitioner` 0.1.4 for medical staff and privileges), Terminology (`healthcare/terminology` 0.3.1, healthcare level, and `healthcare/ehr/terminology` 0.1.4, nothing to add), Clinical documentation (`healthcare/clinical-documentation` 0.4.3 and `healthcare/ehr/clinical-documentation` 0.4.8; its data model prefixes fields with the entity, such as `note.status`), Admission, discharge and transfer (`healthcare/ehr/adt` 0.9.2, EHR-only), Encounters (`healthcare/encounter` 0.3.0 and `healthcare/ehr/encounter` 0.13.14), Patients (`healthcare/patient` 0.13.7, which has no core page by the
  user's choice, and `healthcare/ehr/patient` 0.4.6) and Appointments
  (`healthcare/appointment` 0.13.0, `healthcare/ehr/appointment` 0.11.8; `core/appointment` 0.12.4). All
  support the US and EU through the `jurisdiction` setting. Next: Organization, then Orders and results.
  Follow [How to bring a module to full SRS depth](#how-to-bring-a-module-to-full-srs-depth).
- Modules that start at the industry level (no `extends`, like
  `healthcare/patient`) use `-H` ids and must be complete on their own: API
  conventions, delivery guarantees and the rest have no core to inherit from.
- `pnpm check:specs` validates ids and error codes, but not dependencies that
  name a service with no page.
- Company-layer overrides are designed for but not implemented. No merge or
  precedence semantics exist yet for a private 20% layer on top of a public
  module.

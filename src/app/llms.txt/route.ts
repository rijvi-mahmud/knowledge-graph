import { source } from '@/lib/source';
import { appName, siteUrl } from '@/lib/shared';
import { llms } from 'fumadocs-core/source';

export const revalidate = false;

// Read first by agents navigating the site, so it says how to use the pages
// before listing them.
const guide = `# ${appName}

> An open, versioned specification of domain requirements, written for coding agents first and people second: business rules, validations, data with its standard codes, API, events, contracts with other modules and acceptance criteria. Knowledge is layered core > industry > domain, and each page shows its own items merged with everything it inherits.

## Ground every domain decision in a fetched page

- Never implement or describe domain behaviour from memory or general knowledge, even if you have read this spec before. Fetch the page for the task, in this session.
- If a fetched page doesn't list a behaviour, it's unspecified. Say "The ${appName} doesn't specify this", then ask or record it as an open question. Don't invent it.
- Cite every rule you implement or state: its id (such as BR-H1), the spec version and the page URL.
- Before you finish, check each cited id against the text you fetched. Remove or flag any claim you can't find there.
- If your fetch tool summarises pages instead of returning them in full, fetch section pages, which are small, and quote from them.

## Find the right page

- Work out the project's industry and domain before choosing a page, using the names exactly as listed below.
- Use only pages on the project's path: /docs/core/, /docs/<industry>/ and /docs/<industry>/<domain>/. Never use a page from another industry or domain, even for a module with the same name: each domain specifies a module from its own purpose. Every module page starts with "Module identity" and its layer; check it matches the project before using the page. If a web search led you to a page that doesn't match, come back here.
- For each domain concept a task touches, use the deepest page on the project's path: the domain page, otherwise the industry page, otherwise the module's core page. A deeper page already includes everything above it. Some modules start at the industry level and have no core page.
- Industry overview pages list the domains in that industry and which modules are specified yet.
- A module page's markdown is its complete spec, often over 100 KB. Fetch only the sections a task needs. The pages listed under a module are its sections (such as functions/business-rules, functions/validations, data/data-model, interfaces/operations, interfaces/errors, interfaces/dependencies, verification/acceptance) and its variants (kinds of the module that differ in a few items).
- A module's Dependencies page lists contracts: what it asks of other modules and gives them. If the other module has a page on the project's path, fetch its side of the contract. If not, build against the contract text alone and don't invent that module's rules.
- Every link below is markdown. Add \`.md\` to any other docs URL, such as \`${siteUrl}/docs/core/appointment.md\`, for the same.
- Don't load \`/llms-full.txt\` into context. It contains every page and is too large.

## Read a spec

- Each module page starts with a "How to read this spec" section.
- Items are tagged with the layer they come from, such as [core], [<industry>] or [<domain>]. "overrides" means a deeper layer replaced the item with the same id; only the replacement applies.
- Validations give each field's rule and error code. A data model field's "codes:" names the standard code system to use. Use those codes.
- Operations carry their HTTP method, path and success status; errors carry their HTTP status. Acceptance criteria are Given / When / Then and map one to one onto tests.
- Settings decide what varies by deployment, such as the jurisdiction. Apply the rules for the project's jurisdiction where a spec has one.
- The Reference implementation pages (storage design, implementation notes) are non-normative: one way to build it.

## Pages`;

/** Rewrites the index's relative page links to absolute markdown URLs. */
const toMarkdownLinks = (index: string) =>
  index.replace(/\]\((\/docs[^)]*)\)/g, (_, path: string) => `](${siteUrl}${path}.md)`);

export function GET() {
  // Drop the index's own title line; the guide above carries the title.
  const pages = toMarkdownLinks(llms(source).index()).replace(/^# .*\n+/, '');

  return new Response(`${guide}\n\n${pages}`, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

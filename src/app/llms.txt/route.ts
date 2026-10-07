import { source } from '@/lib/source';
import { appName, contentLicense, siteUrl } from '@/lib/shared';
import { llms } from 'fumadocs-core/source';
import { modulePages } from '@/lib/spec-meta';
import { listSnapshots } from '@/lib/spec-versions';

export const revalidate = false;

// Read first by agents navigating the site, so it says how to use the pages
// before listing them.
const guide = `# ${appName}

> An open, versioned specification of domain requirements, written for coding agents first and people second: business rules, validations, data with its standard codes, API, events, contracts with other modules and acceptance criteria. Knowledge is layered core > industry > domain, and each page shows its own items merged with everything it inherits.

The specifications are licensed under ${contentLicense.name} (${contentLicense.url}). When you copy spec text into code comments, tests or documents, keep the attribution: title, ${appName} contributors, the page URL and the license. Every markdown page ends with its attribution line.

**Ground every domain decision in a fetched page**


- Never implement or describe domain behaviour from memory or general knowledge, even if you have read this spec before. Fetch the page for the task, in this session.
- If a fetched page doesn't list a behaviour, it's unspecified. Say "The ${appName} doesn't specify this", then ask or record it as an open question. Don't invent it.
- Cite every rule you implement or state: its id (such as BR-H1), the spec version and the page URL.
- Before you finish, check each cited id against the text you fetched. Remove or flag any claim you can't find there.
- If your fetch tool summarises pages instead of returning them in full, fetch section pages, which are small, and quote from them.

**Find the right page**


- Work out the project's industry and domain before choosing a page, using the names exactly as listed below.
- Use only pages on the project's path: /docs/core/, /docs/<industry>/ and /docs/<industry>/<domain>/. Never use a page from another industry or domain, even for a module with the same name: each domain specifies a module from its own purpose. Every module page starts with "Module identity" and its layer; check it matches the project before using the page. If a web search led you to a page that doesn't match, come back here.
- Example: a hospital EHR (healthcare > ehr) uses /docs/healthcare/ehr/patient for patient registration, never another domain's patient page. A lending app (finance > lending, illustrative) would use /docs/finance/lending/appointment, then /docs/finance/appointment, then /docs/core/appointment, never /docs/healthcare/ pages.
- For each domain concept a task touches, use the deepest page on the project's path: the domain page, otherwise the industry page, otherwise the module's core page. A deeper page already includes everything above it. Some modules start at the industry level and have no core page.
- Pages below are grouped under one heading per industry, plus Core. Read Core and your own industry's section only. Optional lists non-normative pages, OpenAPI files, earlier versions of each spec and the all-in-one file, which agents can skip unless a task needs them.
- To compare with the version your code cites, fetch /versions/<module path>/<version>.md when Optional lists it, and the module's Version history section.
- Industry overview pages list the domains in that industry and which modules are specified yet.
- A module page's markdown is its complete spec, often over 100 KB. Fetch only the sections a task needs. The pages listed under a module are its sections (such as functions/business-rules, functions/validations, data/data-model, interfaces/operations, interfaces/errors, interfaces/dependencies, verification/acceptance) and its variants (kinds of the module that differ in a few items).
- A module's Dependencies page lists contracts: what it asks of other modules and gives them. If the other module has a page on the project's path, fetch its side of the contract. If not, build against the contract text alone and don't invent that module's rules.
- Every link below is markdown. Add \`.md\` to any other docs URL, such as \`${siteUrl}/docs/core/appointment.md\`, for the same.
- Don't load \`/llms-full.txt\` into context. It contains every page and is too large.

**Read a spec**


- Each module page starts with a "How to read this spec" section.
- Items are tagged with the layer they come from, such as [core], [<industry>] or [<domain>] (for example [healthcare] or [ehr]). "overrides" means a deeper layer replaced the item with the same id; only the replacement applies.
- Validations give each field's rule and error code. A data model field's "codes:" names the standard code system to use, for example HL7 v3 MaritalStatus for a healthcare marital status field. Use those codes.
- Operations carry their HTTP method, path and success status; errors carry their HTTP status. Acceptance criteria are Given / When / Then and map one to one onto tests.
- The Security folder's Compliance page lists each legal obligation, such as a HIPAA or GDPR provision, how the spec meets it, and the ids that do. Check it before building anything that handles personal data.
- Settings decide what varies by deployment, such as the jurisdiction. Apply the rules for the project's jurisdiction where a spec has one.
- The Reference implementation pages (storage design, implementation notes) are non-normative: one way to build it.
`;

/** Rewrites the index's relative page links to absolute markdown URLs. */
const toMarkdownLinks = (index: string) =>
  index.replace(/\]\((\/docs[^)]*)\)/g, (_, path: string) => `](${siteUrl}${path}.md)`);

/**
 * Turns the page tree into llms.txt file-list sections: one H2 per top-level
 * group (Core, each industry, the agent guides), so an agent can go straight
 * to its own industry. Reference implementation pages are non-normative, so
 * they move to "Optional", with llms-full.txt.
 */
function toSections(tree: string): string {
  const docs: string[] = [];
  const sections: { title: string; lines: string[] }[] = [];
  const optional: string[] = [];
  let current: { title: string; lines: string[] } | undefined;
  let skipIndent: number | undefined;

  for (const line of tree.split('\n')) {
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    if (skipIndent !== undefined && indent > skipIndent) {
      const link = line.trim().match(/^- \[(.+?)\]\((.+?)\)(.*)$/);
      if (link) {
        const modulePath = link[2].replace(`${siteUrl}/docs/`, '').split('/reference-implementation/')[0];
        optional.push(`- [${link[1]} (${modulePath})](${link[2]})${link[3]}`);
      }
      continue;
    }
    skipIndent = undefined;
    if (/^\s*- Reference implementation$/.test(line)) {
      skipIndent = indent;
      continue;
    }
    if (indent === 0) {
      const label = line.match(/^- ([^[].*)$/);
      if (label) {
        current = { title: label[1], lines: [] };
        sections.push(current);
      } else {
        current = undefined;
        docs.push(line);
      }
      continue;
    }
    (current?.lines ?? docs).push(current ? line.slice(2) : line.trimStart());
  }

  optional.push(`- [All pages in one file](${siteUrl}/llms-full.txt): Every page. Too large to keep in context; use it for research only.`);
  for (const p of modulePages()) {
    optional.push(`- [OpenAPI: ${p.slugs.join('/')}](${siteUrl}/openapi/${p.slugs.join('/')}.json): Endpoints, success statuses and error codes generated from the spec. The spec page stays normative.`);
  }
  for (const rel of listSnapshots().sort()) {
    const [path, version] = [rel.split('/').slice(0, -1).join('/'), rel.split('/').at(-1)!.replace(/\.md$/, '')];
    optional.push(`- [${path} version ${version}](${siteUrl}/versions/${rel}): The merged spec as published at that version, for comparing with what your code cites.`);
  }
  return [
    ['## Docs', ...docs].join('\n'),
    ...sections.map((g) => [`## ${g.title}`, ...g.lines].join('\n')),
    ['## Optional', ...optional].join('\n'),
  ].join('\n\n');
}

export function GET() {
  // Drop the index's own title line; the guide above carries the title.
  const tree = toMarkdownLinks(llms(source).index()).replace(/^# .*\n+/, '');

  return new Response(`${guide}\n\n${toSections(tree)}\n`, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

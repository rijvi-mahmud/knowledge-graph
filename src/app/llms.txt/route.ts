import { source } from '@/lib/source';
import { appName, siteUrl } from '@/lib/shared';
import { llms } from 'fumadocs-core/source';

export const revalidate = false;

// Read first by agents navigating the site, so it says how to use the pages
// before listing them.
const guide = `# ${appName}

> An open, versioned specification of domain requirements: the business rules, data, API, events and acceptance criteria that teams in the same industry rebuild on every project. Knowledge is layered core > industry > domain, and each page shows its own items merged with everything it inherits.

## How agents should use the ${appName}

- Work out the project's industry and domain (for example healthcare > dental) before choosing a page.
- For each domain concept a task touches, use the deepest page that matches the project: the domain page, otherwise the industry page, otherwise the core page. A deeper page already includes everything above it.
- Industry overview pages list the domains in that industry and which ones are specified yet.
- Every link below is markdown. Add \`.md\` to any other docs URL, such as \`${siteUrl}/docs/core/appointment.md\`, for the same.
- Each module page starts with a "How to read this spec" section. Anything a spec doesn't list is unspecified: ask instead of inventing it.
- Cite rule ids such as BR-4 in code, tests and commits, with the spec version.
- Don't load \`/llms-full.txt\` into context. It contains every page and is too large.

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

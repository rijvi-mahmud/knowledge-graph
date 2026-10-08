import { getLLMText, getPageMarkdownUrl, source, specViewOf } from '@/lib/source';
import { siteUrl } from '@/lib/shared';
import { JURISDICTIONS, isJurisdiction } from '@/lib/spec-jurisdiction';
import { notFound } from 'next/navigation';

export const revalidate = false;

/** "content.md", or "content.us.md" for the spec as one jurisdiction sees it. */
function parseFile(file: string | undefined) {
  const match = /^content(?:\.(\w+))?\.md$/.exec(file ?? '');
  if (!match) return null;
  const jurisdiction = match[1];
  if (jurisdiction !== undefined && !isJurisdiction(jurisdiction)) return null;
  return { jurisdiction };
}

export async function GET(_req: Request, { params }: RouteContext<'/llms.mdx/docs/[[...slug]]'>) {
  const { slug } = await params;
  const file = parseFile(slug?.at(-1));
  const page = source.getPage(slug?.slice(0, -1));
  if (!page || !file) notFound();

  return new Response(await getLLMText(page, file.jurisdiction), {
    headers: {
      // RFC 7763 requires the charset parameter for text/markdown.
      'Content-Type': 'text/markdown; charset=utf-8',
      // The HTML page is canonical for search engines; agents fetch this copy directly.
      Link: `<${siteUrl}${page.url}>; rel="canonical"`,
    },
  });
}

export function generateStaticParams() {
  return source.getPages().flatMap((page) => {
    const { segments } = getPageMarkdownUrl(page);
    const base = { lang: page.locale, slug: segments };
    // Only spec pages have jurisdiction-specific items to leave out.
    if (!page.data.module && !specViewOf(page)) return [base];
    const files = JURISDICTIONS.map((j) => ({
      lang: page.locale,
      slug: [...segments.slice(0, -1), `content.${j}.md`],
    }));
    return [base, ...files];
  });
}

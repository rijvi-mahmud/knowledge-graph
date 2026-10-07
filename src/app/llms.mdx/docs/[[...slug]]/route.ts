import { getLLMText, getPageMarkdownUrl, source } from '@/lib/source';
import { siteUrl } from '@/lib/shared';
import { notFound } from 'next/navigation';

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'/llms.mdx/docs/[[...slug]]'>) {
  const { slug } = await params;
  const page = source.getPage(slug?.slice(0, -1));
  if (!page) notFound();

  return new Response(await getLLMText(page), {
    headers: {
      // RFC 7763 requires the charset parameter for text/markdown.
      'Content-Type': 'text/markdown; charset=utf-8',
      // The HTML page is canonical for search engines; agents fetch this copy directly.
      Link: `<${siteUrl}${page.url}>; rel="canonical"`,
    },
  });
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageMarkdownUrl(page).segments,
  }));
}

import { notFound } from 'next/navigation';
import { getResolvedSpec, source } from '@/lib/source';
import { modulePages } from '@/lib/spec-meta';
import { specToOpenApi } from '@/lib/spec-openapi';
import { siteUrl } from '@/lib/shared';

export const revalidate = false;

/** /openapi/<module page path>.json, for example /openapi/healthcare/ehr/patient.json */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const last = slug.at(-1) ?? '';
  if (!last.endsWith('.json')) notFound();
  const page = source.getPage([...slug.slice(0, -1), last.replace(/\.json$/, '')]);
  if (!page || !modulePages().includes(page)) notFound();

  const doc = specToOpenApi(getResolvedSpec(page), page.data.title ?? page.url, page.url);
  return new Response(JSON.stringify(doc, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Link: `<${siteUrl}${page.url}>; rel="describedby"`,
    },
  });
}

export function generateStaticParams() {
  return modulePages().map((p) => ({ slug: [...p.slugs.slice(0, -1), `${p.slugs.at(-1)}.json`] }));
}

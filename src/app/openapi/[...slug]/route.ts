import { notFound } from 'next/navigation';
import { getResolvedSpec, source } from '@/lib/source';
import { modulePages } from '@/lib/spec-meta';
import { specToOpenApi } from '@/lib/spec-openapi';
import { siteUrl } from '@/lib/shared';
import { JURISDICTIONS, isJurisdiction, jurisdictionSpec } from '@/lib/spec-jurisdiction';

export const revalidate = false;

/**
 * /openapi/<module page path>.json, for example /openapi/healthcare/ehr/patient.json.
 * <name>.us.json leaves out operations that apply only in other jurisdictions;
 * the proxy serves it for ?jurisdiction=us.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const match = /^(.+?)(?:\.(\w+))?\.json$/.exec(slug.at(-1) ?? '');
  if (!match) notFound();
  const [, name, jurisdiction] = match;
  if (jurisdiction !== undefined && !isJurisdiction(jurisdiction)) notFound();
  const page = source.getPage([...slug.slice(0, -1), name]);
  if (!page || !modulePages().includes(page)) notFound();

  const resolved = getResolvedSpec(page);
  const spec = jurisdiction ? jurisdictionSpec(resolved, jurisdiction) : resolved;
  const doc = specToOpenApi(spec, page.data.title ?? page.url, page.url);
  return new Response(JSON.stringify(doc, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Link: `<${siteUrl}${page.url}>; rel="describedby"`,
    },
  });
}

export function generateStaticParams() {
  return modulePages().flatMap((p) => {
    const dir = p.slugs.slice(0, -1);
    const name = p.slugs.at(-1);
    return [
      { slug: [...dir, `${name}.json`] },
      ...JURISDICTIONS.map((j) => ({ slug: [...dir, `${name}.${j}.json`] })),
    ];
  });
}

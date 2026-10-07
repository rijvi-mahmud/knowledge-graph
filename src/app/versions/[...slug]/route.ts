import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { notFound } from 'next/navigation';
import { siteUrl } from '@/lib/shared';
import { listSnapshots, VERSIONS_DIR } from '@/lib/spec-versions';

export const revalidate = false;

/** /versions/<module path>/<version>.md: a module's merged spec as published at that version. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const rel = slug.join('/');
  if (!rel.endsWith('.md') || !listSnapshots().includes(rel)) notFound();

  const modulePath = slug.slice(0, -1).join('/');
  return new Response(readFileSync(join(VERSIONS_DIR, rel), 'utf8'), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Link: `<${siteUrl}/docs/${modulePath}>; rel="canonical"`,
    },
  });
}

export function generateStaticParams() {
  return listSnapshots().map((p) => ({ slug: p.split('/') }));
}

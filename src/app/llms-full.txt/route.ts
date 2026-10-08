import { getLLMText, source, specViewOf } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  // Sub-pages repeat parts of their module's spec, which is already included in full.
  const scan = source.getPages().filter((page) => !specViewOf(page)).map((page) => getLLMText(page));
  const scanned = await Promise.all(scan);

  return new Response(scanned.join('\n\n'));
}

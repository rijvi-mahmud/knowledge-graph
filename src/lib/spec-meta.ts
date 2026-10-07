import type { ModuleSpecData } from '@/components/module-spec';
import { getResolvedSpec, source, specViewOf } from './source';

type Page = ReturnType<typeof source.getPages>[number];

/** Module pages only: the pages that own a spec, not their section or variant sub-pages. */
export const modulePages = () =>
  source.getPages().filter((p) => (p.data as ModuleSpecData).module && !specViewOf(p));

/** The module page a page belongs to: itself, or the owner of a section or variant page. */
export function moduleOf(page: Page): Page | undefined {
  const view = specViewOf(page);
  if (view) return source.getPage(view.root.split('/'));
  return (page.data as ModuleSpecData).module ? page : undefined;
}

/**
 * When a module's merged spec last changed: the newest version-history date
 * of the page and every layer it inherits from, since a parent's change
 * changes the merged spec too. Undefined for pages that aren't specs, so the
 * sitemap only claims dates it can back up.
 */
export function specLastModified(page: Page): Date | undefined {
  const owner = moduleOf(page);
  if (!owner) return undefined;
  const chain = [
    owner,
    ...(getResolvedSpec(owner).lineage?.basedOn ?? []).flatMap((l) => {
      const p = source.getPage(l.url.replace(/^\/docs\/?/, '').split('/').filter(Boolean));
      return p ? [p] : [];
    }),
  ];
  const dates = chain
    .map((p) => (p.data as ModuleSpecData).changelog?.[0]?.date)
    .filter((d): d is string => Boolean(d))
    .sort();
  return dates.length ? new Date(dates[dates.length - 1]) : undefined;
}

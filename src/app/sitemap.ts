import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { siteUrl } from '@/lib/shared';
import { specLastModified } from '@/lib/spec-meta';

export const revalidate = false;

/**
 * Every page, including each module's section and variant pages, so search
 * engines index them and agents that arrive from a web search can find them.
 * Generated from the page tree, so new modules appear without changes here.
 *
 * Google ignores priority and changefreq, and uses lastmod only when it is
 * accurate, so lastmod is set only for spec pages, from their version history.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl },
    { url: `${siteUrl}/llms.txt` },
    ...source.getPages().map((page) => {
      const lastModified = specLastModified(page);
      return lastModified ? { url: `${siteUrl}${page.url}`, lastModified } : { url: `${siteUrl}${page.url}` };
    }),
  ];
}

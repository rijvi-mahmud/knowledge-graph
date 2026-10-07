import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { siteUrl } from '@/lib/shared';

export const revalidate = false;

/**
 * Every page, including each module's section and variant pages, so search
 * engines index them and agents that arrive from a web search can find them.
 * Generated from the page tree, so new modules appear without changes here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/llms.txt`, changeFrequency: 'weekly', priority: 0.9 },
    ...source.getPages().map((page) => ({
      url: `${siteUrl}${page.url}`,
      changeFrequency: 'weekly' as const,
      // Module pages first, their sections next, then the rest.
      priority: page.slugs.length <= 3 ? 0.8 : 0.6,
    })),
  ];
}

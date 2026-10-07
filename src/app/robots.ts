import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/shared';

/**
 * Lets every crawler, including AI search crawlers, read the site, and points
 * them to the sitemap (RFC 9309).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

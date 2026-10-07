export const appName = 'Knowledge Graph';
export const appTagline = 'Versioned domain knowledge that humans read and AI can query.';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

export const gitConfig = {
  user: 'rijvi-mahmud',
  repo: 'knowledge-graph',
  branch: 'main',
};

/**
 * Public address of this deployment, used wherever docs show a full URL.
 * Set NEXT_PUBLIC_SITE_URL for a custom domain or a self-hosted copy; on
 * Vercel the project's production domain is provided automatically.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
).replace(/\/+$/, '');

/** Hostname of siteUrl, without port, for domain allowlists such as WebFetch(domain:...). */
export const siteHost = new URL(siteUrl).hostname;

/**
 * Licence of the knowledge content (content/), stated wherever specs are
 * served so readers and agents reusing the text know the terms. The code is
 * licensed separately (AGPL-3.0); see README.
 */
export const contentLicense = {
  name: 'CC BY-SA 4.0',
  spdx: 'CC-BY-SA-4.0',
  url: 'https://creativecommons.org/licenses/by-sa/4.0/',
};

/** A TASL attribution line (Title, Author, Source, License), as Creative Commons recommends. */
export const attribution = (title: string, url: string) =>
  `"${title}" by ${appName} contributors, ${url}, licensed under ${contentLicense.name} (${contentLicense.url}).`;

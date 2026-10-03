import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';
import { specToMarkdown } from './spec-markdown';
import { resolveSpec, type SpecNode } from './spec-inherit';
import type { ModuleSpecData } from '@/components/module-spec';

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

export function getPageImageUrl(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: '/' + [page.locale, ...docsImageRoute.split('/'), ...segments].filter(Boolean).join('/'),
  };
}

export function getPageMarkdownUrl(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'content.md'];

  return {
    segments,
    url: '/' + [page.locale, ...docsContentRoute.split('/'), ...segments].filter(Boolean).join('/'),
  };
}

type Page = (typeof source)['$inferPage'];

function toNode(page: Page): SpecNode {
  return {
    path: page.slugs.join('/'),
    title: page.data.title ?? page.slugs.join('/'),
    url: page.url,
    data: page.data as ModuleSpecData,
  };
}

/** The page's spec merged with every layer it extends, tagged with provenance. */
export function getResolvedSpec(page: Page): ModuleSpecData {
  return resolveSpec(
    toNode(page),
    (path) => {
      const parent = source.getPage(path.split('/'));
      return parent ? toNode(parent) : undefined;
    },
    source.getPages().map(toNode),
  );
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed');
  // The structured spec lives in frontmatter, so it has to be serialised
  // explicitly - the processed body carries only the prose half of the page.
  const spec = specToMarkdown(getResolvedSpec(page));

  return [`# ${page.data.title} (${page.url})`, spec, processed]
    .filter((part) => part.trim().length > 0)
    .join('\n\n');
}

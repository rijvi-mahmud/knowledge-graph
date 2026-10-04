import { siteUrl } from './shared';

/**
 * Replaces the `%SITE_URL%` token in MDX content with this deployment's
 * address, so docs never hardcode a host. Runs at compile time, which covers
 * prose, links, inline code and fenced code blocks - and the processed
 * markdown served to AI, since that is captured after remark plugins run.
 */
export const SITE_URL_TOKEN = '%SITE_URL%';

type Node = { type: string; value?: unknown; url?: unknown; children?: Node[] };

function replace(node: Node) {
  if (typeof node.value === 'string') node.value = node.value.replaceAll(SITE_URL_TOKEN, siteUrl);
  if (typeof node.url === 'string') node.url = node.url.replaceAll(SITE_URL_TOKEN, siteUrl);
  node.children?.forEach(replace);
}

export function remarkSiteUrl() {
  return (tree: Node) => replace(tree);
}

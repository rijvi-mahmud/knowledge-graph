import { siteHost, siteUrl } from './shared';

/**
 * Replaces `%SITE_URL%` (https://host) and `%SITE_HOST%` (host only, for
 * domain allowlists) in MDX content with this deployment's address, so docs
 * never hardcode a host. Runs at compile time, which covers prose, links,
 * inline code and fenced code blocks - and the processed markdown served to
 * AI, since that is captured after remark plugins run.
 */
const tokens: [string, string][] = [
  ['%SITE_URL%', siteUrl],
  ['%SITE_HOST%', siteHost],
];

type Node = { type: string; value?: unknown; url?: unknown; children?: Node[] };

const fill = (text: string) =>
  tokens.reduce((out, [token, value]) => out.replaceAll(token, value), text);

function replace(node: Node) {
  if (typeof node.value === 'string') node.value = fill(node.value);
  if (typeof node.url === 'string') node.url = fill(node.url);
  node.children?.forEach(replace);
}

export function remarkSiteUrl() {
  return (tree: Node) => replace(tree);
}

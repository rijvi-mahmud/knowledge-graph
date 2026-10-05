import { specIdHref, splitIds } from './spec-ids';

/**
 * Links every id (BR-4, FR-E2, ADR-11, ...) in a module page's prose to the
 * item it names, on that module's own section pages. Runs only on module
 * pages: other pages mention ids as examples and have no spec to link to.
 * Text in links, code and headings is left alone.
 */

type Node = { type: string; value?: string; url?: string; children?: Node[] };
type File = { path?: string; value?: unknown; data?: Record<string, unknown> };

const SKIP = new Set(['link', 'linkReference', 'inlineCode', 'code', 'heading', 'mdxJsxFlowElement', 'mdxJsxTextElement']);

/** "/abs/content/docs/healthcare/ehr/appointment.mdx" -> "/docs/healthcare/ehr/appointment" */
function moduleUrl(file: File): string | undefined {
  const frontmatter = file.data?.frontmatter as Record<string, unknown> | undefined;
  const source = typeof file.value === 'string' ? file.value : '';
  const isModule = frontmatter ? Boolean(frontmatter.module) : /^---[\s\S]*?\nmodule: /.test(source);
  if (!isModule || !file.path) return undefined;
  const match = file.path.replace(/\\/g, '/').match(/content\/docs\/(.+?)(?:\/index)?\.mdx?$/);
  return match ? `/docs/${match[1]}` : undefined;
}

function linkIds(node: Node, baseUrl: string) {
  if (!node.children || SKIP.has(node.type)) return;
  node.children = node.children.flatMap((child) => {
    if (child.type !== 'text' || !child.value) {
      linkIds(child, baseUrl);
      return [child];
    }
    return splitIds(child.value).map((part) => {
      const href = part.id ? specIdHref(baseUrl, part.text) : undefined;
      return href
        ? { type: 'link', url: href, children: [{ type: 'text', value: part.text }] }
        : { type: 'text', value: part.text };
    });
  });
}

export function remarkSpecIds() {
  return (tree: Node, file: File) => {
    const baseUrl = moduleUrl(file);
    if (baseUrl) linkIds(tree, baseUrl);
  };
}

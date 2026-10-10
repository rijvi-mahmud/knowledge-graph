import { docs } from 'collections/server';
import { loader, update, type LoaderPlugin } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { attribution, docsContentRoute, docsImageRoute, docsRoute, siteUrl } from './shared';
import { specToMarkdown } from './spec-markdown';
import { resolveSpec, type SpecNode } from './spec-inherit';
import { activeSpecGroups, variantSpec, type ModuleSpecData } from '@/components/module-spec';
import { sectionSummary, sectionTitle, type SpecSectionId } from './spec-sections';
import { jurisdictionSpec, type Jurisdiction } from './spec-jurisdiction';

/** Set on a spec sub-page: which module page it belongs to, and the section or variant it shows. */
export interface SpecView {
  /** Path of the module's own page, relative to content/docs, e.g. "core/appointment". */
  root: string;
  section?: SpecSectionId;
  /** A variant page, such as inpatient appointments. */
  variant?: string;
}

type Extra = { view?: SpecView; sourcePath?: string };

const mdx = docs.toFumadocsSource();
type MdxFile = (typeof mdx)['files'][number];
type MdxPage = Extract<MdxFile, { type: 'page' }>;
type MdxMeta = Extract<MdxFile, { type: 'meta' }>;
type PageData = MdxPage['data'] & Extra;
type OutFile =
  | (Omit<MdxPage, 'data'> & { data: PageData })
  | MdxMeta;

const stripExt = (path: string) => path.replace(/\.mdx?$/, '');
const isModulePage = (f: MdxFile): f is MdxPage =>
  f.type === 'page' && Boolean((f.data as ModuleSpecData).module);

/**
 * Turns every module page into a folder, so a long spec reads as short,
 * focused pages. The module's own file becomes the folder's index (the
 * overview). Each spec group with content becomes a sub-folder (Functions,
 * Data, ...), holding one virtual page per section (Business rules, State
 * machine, ...). The frontmatter stays in one file, so inheritance and both
 * renderers work on it unchanged.
 */
const withSpecPages = update(mdx)
  .files<PageData, MdxMeta['data']>((files) => {
    const nodes = new Map<string, SpecNode>(
      files.filter(isModulePage).map((f) => {
        const path = stripExt(f.path);
        return [
          path,
          { path, title: f.data.title, url: `${docsRoute}/${path}`, data: f.data as ModuleSpecData },
        ];
      }),
    );
    const all = [...nodes.values()];

    return files.flatMap((file): OutFile[] => {
      if (!isModulePage(file)) return [file as OutFile];

      const dir = stripExt(file.path);
      const title = file.data.title;
      const resolved = resolveSpec(nodes.get(dir)!, (p) => nodes.get(p), all);
      const groups = activeSpecGroups(resolved).filter((g) => g.slug);

      const out: OutFile[] = [
        { ...file, path: `${dir}/index.mdx`, data: { ...file.data, sourcePath: file.path } },
      ];
      const folder = (path: string, folderTitle: string, pages: string[], defaultOpen: boolean) =>
        ({ type: 'meta', path, data: { title: folderTitle, defaultOpen, pages } }) as MdxMeta;

      // Listing "index" makes the overview a child item instead of the folder's
      // link, so the folder only opens and closes (see sidebarIntroduction).
      // Variant pages (such as outpatient and inpatient) come right after the
      // introduction, before the spec's groups. Every folder starts collapsed
      // (the user's choice); Fumadocs still opens the one holding the current page.
      const variants = resolved.variants ?? [];
      out.push(
        folder(`${dir}/meta.json`, title, ['index', ...variants.map((v) => v.id), ...groups.map((g) => g.slug!)], false),
      );
      for (const v of variants)
        out.push({
          ...file,
          path: `${dir}/${v.id}.mdx`,
          data: {
            ...file.data,
            module: undefined,
            title: v.title,
            description: v.description,
            toc: [],
            structuredData: { headings: [], contents: [] },
            sourcePath: file.path,
            view: { root: dir, variant: v.id },
          },
        });
      for (const g of groups) {
        out.push(folder(`${dir}/${g.slug}/meta.json`, g.title, [...g.sections], false));
        for (const id of g.sections)
          out.push({
            ...file,
            path: `${dir}/${g.slug}/${id}.mdx`,
            data: {
              ...file.data,
              // Not a module page itself: listings, inheritance and search skip it.
              module: undefined,
              title: sectionTitle(id),
              description: `${sectionSummary(id)}. Part of the ${title} specification.`,
              toc: [],
              structuredData: { headings: [], contents: [] },
              sourcePath: file.path,
              view: { root: dir, section: id },
            },
          });
      }
      return out;
    });
  })
  .build();

/**
 * In the sidebar, a folder's overview page is listed as "Introduction" under
 * the folder, and the folder itself isn't a link. A clickable folder name
 * that also toggles was confusing. The page keeps its real title.
 */
const sidebarIntroduction: LoaderPlugin = {
  name: 'sidebar-introduction',
  transformPageTree: {
    file(node, filePath) {
      const isFolderIndex = filePath && /\/index\.mdx?$/.test(filePath);
      return isFolderIndex ? { ...node, name: 'Introduction' } : node;
    },
  },
};

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: withSpecPages,
  plugins: [lucideIconsPlugin(), sidebarIntroduction],
});

/** The spec view of a sub-page, or undefined for any other page. */
export const specViewOf = (page: Page) => (page.data as Extra).view;

/** Path of the MDX file a page comes from, relative to content/docs. */
export const sourcePathOf = (page: Page) => (page.data as Extra).sourcePath ?? page.path;

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

/**
 * The page's spec merged with every layer it extends, tagged with provenance.
 * A sub-page resolves the spec of the module page it belongs to.
 */
export function getResolvedSpec(page: Page): ModuleSpecData {
  const view = specViewOf(page);
  const owner = view ? source.getPage(view.root.split('/')) : page;
  if (!owner) return page.data as ModuleSpecData;
  return resolveSpec(
    toNode(owner),
    (path) => {
      const parent = source.getPage(path.split('/'));
      return parent ? toNode(parent) : undefined;
    },
    source.getPages().map(toNode),
  );
}

/** The TASL attribution line every markdown response ends with. */
const licenseLine = (page: Page) => `License: ${attribution(page.data.title ?? page.url, `${siteUrl}${page.url}`)}`;

/**
 * The page as markdown. With a jurisdiction, items tagged for another
 * jurisdiction are left out, so an agent never reads the other region's rules.
 */
export async function getLLMText(page: (typeof source)['$inferPage'], jurisdiction?: Jurisdiction) {
  const note = jurisdiction && page.data.module
    ? `> Filtered for jurisdiction ${jurisdiction}: items that apply only in another jurisdiction are left out. Items without a jurisdiction label apply everywhere.\n\n`
    : '';
  return `${await llmBody(page, jurisdiction, note)}\n\n${licenseLine(page)}\n`;
}

/**
 * Prose wrapped in `<Only jurisdiction="us">` stays for that jurisdiction and
 * for the unfiltered page, without the wrapper, and is left out otherwise:
 * the same rule the HTML page applies through the Only component.
 */
export function onlyProse(markdown: string, jurisdiction?: Jurisdiction) {
  return markdown.replace(
    /<Only\s+jurisdiction="(\w+)"\s*>\s*\n?([\s\S]*?)\n?\s*<\/Only>/g,
    (_, only: string, inner: string) => (!jurisdiction || only === jurisdiction ? inner.trim() : ''),
  );
}

async function llmBody(page: (typeof source)['$inferPage'], jurisdiction: Jurisdiction | undefined, note: string) {
  const resolved = () => {
    const spec = getResolvedSpec(page);
    return jurisdiction ? jurisdictionSpec(spec, jurisdiction) : spec;
  };
  // A sub-page is one section or one variant of the spec, with no prose of its own.
  const view = specViewOf(page);
  if (view?.variant) {
    const full = resolved();
    const v = full.variants?.find((x) => x.id === view.variant);
    const spec = specToMarkdown(variantSpec(full, view.variant));
    return [`# ${page.data.title} (${page.url})`, note.trim(), v?.summary ?? '', 'Only the items specific to this variant are listed. Every other item in the full specification applies too.', spec]
      .filter(Boolean)
      .join('\n\n');
  }
  if (view) {
    const spec = specToMarkdown(resolved(), view.section);
    return `# ${page.data.title} (${page.url})\n\n${note}${spec}`;
  }

  const processed = onlyProse(await page.data.getText('processed'), jurisdiction);
  // The structured spec lives in frontmatter, so it has to be serialised
  // explicitly. The processed body carries only the prose half of the page.
  const spec = specToMarkdown(resolved());

  return [`# ${page.data.title} (${page.url})`, note.trim(), spec, processed]
    .filter((part) => part.trim().length > 0)
    .join('\n\n');
}

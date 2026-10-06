import {
  getPageImageUrl,
  getPageMarkdownUrl,
  getResolvedSpec,
  source,
  sourcePathOf,
  specViewOf,
} from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { appName, gitConfig, siteUrl } from '@/lib/shared';
import { activeSpecGroups, ModuleSpec, specToc, variantSpec } from '@/components/module-spec';
import { sectionTitle } from '@/lib/spec-sections';
import { OpenTarget } from '@/components/open-target';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;
  const view0 = specViewOf(page);
  // A variant page shows the spec cut down to that variant's items.
  const spec = view0?.variant ? variantSpec(getResolvedSpec(page), view0.variant) : getResolvedSpec(page);
  // A spec sub-page shows one section of its module's spec and has no prose.
  const view = specViewOf(page);
  const section = view?.section;
  const baseUrl = view ? `/docs/${view.root}` : page.url;

  // The spec renders outside MDX, so its headings are added to the TOC by
  // hand. On the module's own page they sit under a "Specification" entry.
  const specEntries = view?.variant
    ? activeSpecGroups(spec)
        .flatMap((g) => g.sections)
        .map((id) => ({ title: sectionTitle(id), url: `#${id}`, depth: 2 }))
    : specToc(spec, section);
  const toc = view
    ? specEntries
    : [
        ...page.data.toc,
        ...(specEntries.length > 0 || spec.module
          ? [{ title: 'Specification', url: '#specification', depth: 2 }]
          : []),
        ...specEntries,
      ];

  return (
    <DocsPage toc={toc} full={page.data.full}>
      <DocsTitle className="font-display tracking-tight">{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      {/* Agents often land here from a web search, not from llms.txt. HTML-to-text
          tools keep this line; people and screen readers don't see it. */}
      <p className="sr-only" aria-hidden="true">
        For AI agents: this page is available as markdown at {siteUrl}
        {page.url}.md. Start at {siteUrl}/llms.txt for how to navigate the {appName}, and
        fetch only the sections a task needs.
      </p>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${sourcePathOf(page)}`}
        />
      </div>
      <DocsBody>
        {!view && (
          <MDX
            components={getMDXComponents({
              // this allows you to link to other pages with relative file paths
              a: createRelativeLink(source, page),
            })}
          />
        )}
        <ModuleSpec data={spec} section={section} variant={view?.variant} baseUrl={baseUrl} />
        <OpenTarget />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  // "Data" alone is ambiguous in a browser tab, so sub-pages carry their module's title.
  const view = specViewOf(page);
  const owner = view && source.getPage(view.root.split('/'));
  return {
    title: owner ? `${page.data.title} · ${owner.data.title}` : page.data.title,
    description: page.data.description,
    // Points agents and tools that read <head> to the markdown version.
    alternates: { types: { 'text/markdown': `${siteUrl}${page.url}.md` } },
    openGraph: {
      images: getPageImageUrl(page).url,
    },
  };
}

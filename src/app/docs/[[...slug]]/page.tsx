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
import { gitConfig } from '@/lib/shared';
import { ModuleSpec, specToc } from '@/components/module-spec';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;
  const spec = getResolvedSpec(page);
  // A spec sub-page shows one group of its module's spec and has no prose.
  const view = specViewOf(page);
  const group = view?.group ?? 'overview';
  const baseUrl = view ? `/docs/${view.root}` : page.url;

  // The spec renders outside MDX, so its headings are added to the TOC by
  // hand. On the module's own page they sit under a "Specification" entry.
  const specEntries = specToc(spec, group);
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
        <ModuleSpec data={spec} group={group} baseUrl={baseUrl} />
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
    openGraph: {
      images: getPageImageUrl(page).url,
    },
  };
}

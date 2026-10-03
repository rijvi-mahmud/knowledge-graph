import Link from 'next/link';
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react';
import { INHERITED_FIELDS } from '@/lib/spec-inherit';
import { getPageMarkdownUrl, getResolvedSpec, source } from '@/lib/source';
import { specToMarkdown } from '@/lib/spec-markdown';
import { docsRoute } from '@/lib/shared';
import type { ModuleSpecData } from '@/components/module-spec';
import { Bento, type BentoData } from '@/components/home/bento';
import { CopyUrl } from '@/components/home/copy-url';
import { HeroGraph, type GraphNode } from '@/components/home/hero-graph';
import { IndustryTabs, type IndustryTab } from '@/components/home/industry-tabs';
import {
  Glow,
  PrimaryButton,
  SecondaryButton,
  SectionHeading,
  type LayerKind,
} from '@/components/home/ui';

// --- data: everything below is read from the published specs ---------------

type Page = ReturnType<typeof source.getPages>[number];

const specPages = () =>
  source.getPages().filter((p) => (p.data as ModuleSpecData).module) as Page[];

const dataOf = (p: Page) => p.data as ModuleSpecData;

const kindOf = (d: ModuleSpecData): LayerKind =>
  d.domain ? 'domain' : d.industry ? 'industry' : 'core';

const byPath = (path: string) => source.getPage(path.split('/'));

const ruleOf = (path: string, id: string) => {
  const page = byPath(path);
  return page ? dataOf(page).businessRules?.find((r) => r.id === id) : undefined;
};

const HERO_CHAIN = ['core/appointment', 'healthcare/appointment', 'healthcare/dental/appointment'];

const DEEPEST = HERO_CHAIN[HERO_CHAIN.length - 1];

function bentoData(): BentoData {
  const chain = HERO_CHAIN.flatMap((path) => {
    const page = byPath(path);
    if (!page) return [];
    const d = dataOf(page);
    return [
      {
        path,
        title: page.data.title ?? path,
        url: page.url,
        kind: kindOf(d),
        added: d.businessRules?.length ?? 0,
      },
    ];
  });

  // Provenance and the AI view both read the deepest page, fully merged.
  const deepest = byPath(DEEPEST);
  const merged = deepest ? getResolvedSpec(deepest) : undefined;
  const layerKind = new Map(chain.map((c) => [c.path.split('/').at(-2) ?? 'core', c.kind]));
  const kindOfLayer = (layer: string): LayerKind =>
    layer === 'core' ? 'core' : (layerKind.get(layer) ?? 'industry');

  // One rule per layer, so the card shows the whole spread of origins.
  const rules = merged?.businessRules ?? [];
  const provenance = [...new Set(rules.map((r) => r.layer ?? 'core'))].flatMap((layer) => {
    const r = rules.find((x) => (x.layer ?? 'core') === layer && !x.overrides);
    return r ? [{ id: r.id, text: r.text, layer, kind: kindOfLayer(layer) }] : [];
  });

  const markdown = merged ? specToMarkdown(merged).split('\n') : [];
  // "**BR-4** text _[dental (overrides core)]_" -> "BR-4 [dental (overrides core)] text",
  // so the provenance tag survives truncation.
  const ruleLine = (l: string) => {
    const m = l.match(/^\*\*(\S+)\*\* (.*?)(?: _\[(.+)\]_)?$/);
    return m ? `${m[1]} [${m[3] ?? 'core'}] ${m[2]}` : l;
  };
  const ruleLines = markdown.filter((l) => /^\*\*BR-/.test(l));
  const resolvedLines = [
    ...markdown.filter((l) => l.startsWith('- layer:')),
    ...ruleLines
      .filter((l) => l.includes('overrides'))
      .slice(0, 1)
      .map(ruleLine),
    ...ruleLines
      .filter((l) => l.includes('[healthcare]'))
      .slice(0, 1)
      .map(ruleLine),
    ...ruleLines
      .filter((l) => l.includes('[core]'))
      .slice(0, 1)
      .map(ruleLine),
  ];

  return {
    chain,
    provenance,
    override: {
      id: 'BR-4',
      before: ruleOf('core/appointment', 'BR-4')?.text ?? '',
      after: ruleOf(DEEPEST, 'BR-4')?.text ?? '',
      layer: 'dental',
      replaced: 'core',
    },
    resolved: { url: deepest ? getPageMarkdownUrl(deepest).url : '', lines: resolvedLines },
  };
}

function toSpec(p: Page) {
  const d = dataOf(p);
  const markdown = [`# ${p.data.title}`, '', specToMarkdown(getResolvedSpec(p))].join('\n');
  return {
    title: p.data.title ?? p.url,
    url: p.url,
    mdUrl: getPageMarkdownUrl(p).url,
    kind: kindOf(d),
    level: d.domain ?? d.industry ?? 'core',
    points: (d.scope ?? []).slice(0, 2),
    lines: markdown.split('\n').slice(0, 14),
  };
}

function industryTabs(): IndustryTab[] {
  const specs = specPages();
  const keys = [...new Set(specs.map((p) => dataOf(p).industry).filter(Boolean))] as string[];

  // Richest industry first - it is the best first impression of the layering.
  const count = (key: string) => specs.filter((p) => dataOf(p).industry === key).length;
  keys.sort((a, b) => count(b) - count(a) || a.localeCompare(b));

  const coreTab: IndustryTab = {
    key: 'core',
    name: 'Core',
    description: 'What every app shares.',
    url: specs.find((p) => !dataOf(p).industry)?.url ?? docsRoute,
    specs: specs.filter((p) => !dataOf(p).industry).map(toSpec),
  };

  return [
    coreTab,
    ...keys.map((key) => {
      const overview = source.getPage([key]);
      return {
        key,
        name: overview?.data.title ?? key,
        description: overview?.data.description?.split(',')[0] ?? '',
        url: overview?.url ?? `${docsRoute}/${key}`,
        specs: specs
          .filter((p) => dataOf(p).industry === key)
          .sort((a, b) => a.slugs.length - b.slugs.length)
          .map(toSpec),
      };
    }),
  ];
}

/** One node per core module, industry and domain, linked by inheritance. */
function graphNodes(): GraphNode[] {
  const specs = specPages().map(dataOf);
  const titleOf = (path: string) => source.getPage(path.split('/'))?.data.title ?? path;

  const core = specs
    .filter((d) => !d.industry && d.module)
    .map((d) => ({ id: `core/${d.module}`, label: d.module!, kind: 'core' as const }));
  const industries = [...new Set(specs.map((d) => d.industry).filter(Boolean))] as string[];
  const domains = [
    ...new Set(specs.filter((d) => d.domain).map((d) => `${d.industry}/${d.domain}`)),
  ];

  return [
    ...core,
    ...industries.map((i) => ({
      id: i,
      label: titleOf(i).toLowerCase(),
      kind: 'industry' as const,
      parent: core[0]?.id,
    })),
    ...domains.map((path) => ({
      id: path,
      label: titleOf(path).toLowerCase(),
      kind: 'domain' as const,
      parent: path.split('/')[0],
    })),
  ];
}

function stats() {
  const pages = specPages();
  let written = 0;
  let reused = 0;
  let overrides = 0;
  for (const p of pages) {
    const own = dataOf(p) as Record<string, unknown[] | undefined>;
    const merged = getResolvedSpec(p) as Record<string, { overrides?: string }[] | undefined>;
    for (const f of INHERITED_FIELDS) {
      const ownCount = own[f]?.length ?? 0;
      const mergedItems = merged[f] ?? [];
      written += ownCount;
      reused += mergedItems.length - ownCount;
      overrides += mergedItems.filter((i) => i.overrides).length;
    }
  }

  return [
    { value: pages.length, label: 'Specs' },
    { value: written, label: 'Items written once' },
    { value: reused, label: 'Items inherited, not rewritten' },
    { value: overrides, label: 'Overrides' },
  ];
}

// --- page ------------------------------------------------------------------

export default function HomePage() {
  return (
    <main className="relative isolate overflow-hidden">
      {/* Hero */}
      <section className="relative overflow-x-clip">
        <div aria-hidden="true" className="kg-grid absolute inset-0 -z-10" />
        <HeroGraph nodes={graphNodes()} />
        <Glow className="top-[-12rem] left-1/2 h-[32rem] w-[60rem] -translate-x-1/2" />

        <div className="mx-auto flex w-full max-w-fd-container flex-col items-center px-4 pt-20 pb-16 text-center sm:pt-28">
          <Link
            href={`${docsRoute}#core-industries-and-domains`}
            className="group inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-background/80 py-1 pr-3 pl-1 text-sm backdrop-blur transition-colors duration-150 hover:border-fd-primary/40"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-fd-primary/10 px-2 py-0.5 text-xs font-medium text-fd-primary">
              <Sparkles className="size-3" />
              New
            </span>
            Requirements now inherit across three levels
            <ArrowRight className="size-3.5 text-fd-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>

          <h1 className="font-display mt-8 max-w-3xl text-5xl leading-[1.02] font-semibold tracking-tight text-balance sm:text-6xl">
            Stop rewriting requirements.{' '}
            <span className="bg-gradient-to-r from-fd-primary to-orange-500 bg-clip-text text-transparent">
              Inherit them.
            </span>
          </h1>

          <p className="mt-5 text-lg text-fd-muted-foreground">
            Open, layered specs your team and your AI build from.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <PrimaryButton href={docsRoute} icon={ArrowRight}>
              Browse the graph
            </PrimaryButton>
            <SecondaryButton href={`${docsRoute}#core-industries-and-domains`} icon={BookOpen}>
              How it works
            </SecondaryButton>
          </div>

          <div className="mt-6">
            <CopyUrl path="/llms-full.txt" label="Add to your AI" />
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-fd-container px-4">
        {/* Bento */}
        <section className="py-16 sm:py-20">
          <SectionHeading claim="Extend. Override." rest="Never copy." />
          <div className="mt-10">
            <Bento data={bentoData()} />
          </div>
        </section>

        {/* Industries */}
        <section className="py-16 sm:py-20">
          <SectionHeading claim="Don't start from a blank PRD." />
          <div className="mt-10">
            <IndustryTabs industries={industryTabs()} />
          </div>
        </section>

        {/* Stats */}
        <section className="py-10">
          <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-fd-border bg-fd-card lg:grid-cols-4">
            {stats().map((s, i) => (
              <div
                key={s.label}
                className={`flex flex-col gap-1 p-6 ${i % 2 === 1 ? 'border-l border-fd-border' : ''} ${
                  i >= 2 ? 'border-t border-fd-border lg:border-t-0' : ''
                } ${i === 2 ? 'lg:border-l' : ''}`}
              >
                <dt className="order-2 text-sm text-fd-muted-foreground">{s.label}</dt>
                <dd className="font-display order-1 text-4xl font-semibold tracking-tight tabular-nums">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-fd-muted-foreground">Counted live from the specs.</p>
        </section>

        {/* Closing */}
        <section className="relative py-24 text-center sm:py-32">
          <Glow className="top-1/2 left-1/2 h-72 w-[40rem] -translate-x-1/2 -translate-y-1/2" />
          <h2 className="font-display mx-auto max-w-2xl text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            Write only what's yours.
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <PrimaryButton href={docsRoute} icon={ArrowRight}>
              Browse the graph
            </PrimaryButton>
            <SecondaryButton href={`${docsRoute}#core-industries-and-domains`} icon={BookOpen}>
              How inheritance works
            </SecondaryButton>
          </div>
        </section>
      </div>
    </main>
  );
}

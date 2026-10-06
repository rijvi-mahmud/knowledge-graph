import Link from 'next/link';
import { ArrowDown, ArrowUp, Bot, GitBranch, Replace, Tags } from 'lucide-react';
import type { ReactNode } from 'react';
import { Spotlight } from './spotlight';
import { LAYER_DOT, type Icon, type LayerKind } from './ui';

export interface BentoData {
  chain: { path: string; title: string; url: string; kind: LayerKind; added: number }[];
  /** A few merged rules from the deepest page, each with the layer it came from. */
  provenance: { id: string; text: string; layer: string; kind: LayerKind }[];
  /** The first rule a layer overrides, if any layer overrides one yet. */
  override?: { id: string; before: string; after: string; layer: string; replaced: string };
  /** Lines from the merged markdown an assistant receives for the deepest page. */
  resolved: { url: string; lines: string[] };
}

const LAYER_CHIP: Record<LayerKind, string> = {
  core: 'bg-layer-core/10 text-layer-core',
  industry: 'bg-layer-industry/10 text-layer-industry',
  domain: 'bg-layer-domain/10 text-layer-domain',
};

function Card({
  icon: IconCmp,
  title,
  body,
  className = '',
  children,
}: {
  icon: Icon;
  title: string;
  body: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Spotlight
      className={`flex flex-col overflow-hidden rounded-2xl border border-fd-border bg-fd-card transition-colors duration-200 hover:border-fd-primary/40 ${className}`}
    >
      <div className="relative p-5 pb-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <IconCmp className="size-4 text-fd-muted-foreground transition-colors duration-200 group-hover:text-fd-primary" />
          {title}
        </div>
        <p className="mt-1 text-sm text-fd-muted-foreground">{body}</p>
      </div>
      <div className="relative mt-auto px-5 pb-5">{children}</div>
    </Spotlight>
  );
}

export function Bento({ data }: { data: BentoData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card
        icon={Bot}
        title="Fetched per task, never from memory"
        body="Your agent loads the merged spec for your exact domain."
        className="lg:col-span-2"
      >
        <div className="rounded-lg bg-neutral-950 p-4 font-code text-xs leading-relaxed text-neutral-400">
          <p className="truncate text-neutral-300">
            <span className="text-neutral-500">$ </span>curl {data.resolved.url}
          </p>
          {data.resolved.lines.map((line) => (
            <p key={line} className="truncate">
              {line}
            </p>
          ))}
          <span className="kg-caret mt-1 inline-block h-3.5 w-1.5 translate-y-0.5 bg-fd-primary" />
        </div>
      </Card>

      <Card icon={Tags} title="Every rule it uses is citable" body="Id, layer and version. Check the agent.">
        <ul className="flex flex-col divide-y divide-fd-border rounded-lg border border-fd-border bg-fd-background text-sm">
          {data.provenance.map((r) => (
            <li key={`${r.id}-${r.layer}`} className="flex items-center gap-3 px-3 py-2">
              <span className="w-12 shrink-0 font-code text-xs text-fd-muted-foreground">
                {r.id}
              </span>
              <span className="min-w-0 flex-1 truncate">{r.text}</span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${LAYER_CHIP[r.kind]}`}
              >
                {r.layer}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card icon={GitBranch} title="Extend, don't copy-paste" body="Core, then industry, then domain.">
        <InheritanceTree chain={data.chain} />
      </Card>

      {data.override && (
      <Card
        icon={Replace}
        title="Override one rule, keep the rest"
        body="By id, like a method override."
      >
        <div className="flex flex-col gap-2 text-sm">
          <div className="rounded-lg border border-dashed border-fd-border p-3 text-fd-muted-foreground">
            <span className="font-code text-xs">
              {data.override.id} in {data.override.replaced}
            </span>
            <p className="mt-1 truncate line-through decoration-fd-muted-foreground/50">
              {data.override.before}
            </p>
          </div>
          <ArrowDown className="mx-auto size-4 text-fd-muted-foreground" aria-hidden="true" />
          <div className="rounded-lg border border-layer-domain/40 bg-layer-domain/5 p-3">
            <span className="font-code text-xs text-layer-domain">
              {data.override.id} in {data.override.layer}
            </span>
            <p className="mt-1 truncate">{data.override.after}</p>
          </div>
        </div>
      </Card>
      )}

      <Card
        icon={ArrowUp}
        title="Duplicates move up"
        body="Written twice? It belongs one level higher."
      >
        <PromotionDiagram />
      </Card>
    </div>
  );
}

/** The chain drawn as a branch graph, with a pulse travelling down its spine. */
function InheritanceTree({ chain }: { chain: BentoData['chain'] }) {
  return (
    <div className="relative rounded-xl border border-fd-border bg-fd-background p-4">
      <div
        aria-hidden="true"
        className="absolute top-8 bottom-8 left-[1.4rem] w-px overflow-hidden bg-fd-border"
      >
        <span className="kg-travel absolute inset-x-0 top-0 block h-1/4 bg-gradient-to-b from-transparent via-fd-primary to-transparent" />
      </div>

      <ul className="flex flex-col gap-3">
        {chain.map((node, depth) => (
          <li key={node.path} className="relative flex items-center gap-3">
            <span
              className={`relative z-10 size-2.5 shrink-0 rounded-full ring-4 ring-fd-background ${LAYER_DOT[node.kind]}`}
              aria-hidden="true"
            />
            <span
              aria-hidden="true"
              className="h-px shrink-0 bg-fd-border"
              style={{ width: `${depth * 1.25}rem` }}
            />
            <Link
              href={node.url}
              className="min-w-0 flex-1 rounded-lg border border-fd-border px-3 py-2 transition-colors duration-150 hover:border-fd-primary/40"
            >
              <span className="block truncate font-code text-xs text-fd-muted-foreground">
                {node.path}
              </span>
            </Link>
            <span
              className={`hidden shrink-0 rounded-md px-2 py-1 text-xs font-medium sm:inline ${LAYER_CHIP[node.kind]}`}
            >
              {depth === 0 ? `${node.added} rules` : `+${node.added}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Two domains holding the same rule, merged into one at their industry. */
function PromotionDiagram() {
  return (
    <div className="flex flex-col items-center gap-1 text-xs">
      <span className={`rounded-md px-3 py-1.5 font-medium ${LAYER_CHIP.industry}`}>industry</span>
      <svg viewBox="0 0 200 36" className="h-9 w-48 text-fd-border" aria-hidden="true">
        <path d="M40 34 C40 14, 100 22, 100 2" fill="none" stroke="currentColor" />
        <path d="M160 34 C160 14, 100 22, 100 2" fill="none" stroke="currentColor" />
      </svg>
      <div className="flex w-full justify-between gap-2">
        {['domain a', 'domain b'].map((d) => (
          <span
            key={d}
            className="flex-1 rounded-md border border-dashed border-fd-border px-2 py-1.5 text-center text-fd-muted-foreground"
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  FileText,
  HeartPulse,
  Landmark,
  Layers,
} from 'lucide-react';
import { LAYER_DOT, type Icon, type LayerKind } from './ui';

export interface IndustrySpec {
  title: string;
  url: string;
  mdUrl: string;
  kind: LayerKind;
  level: string; // "healthcare", "dental"
  points: string[];
  lines: string[]; // opening lines of the markdown an assistant receives
}

export interface IndustryTab {
  key: string;
  name: string;
  description: string;
  url: string;
  specs: IndustrySpec[];
}

const ICONS: Record<string, Icon> = {
  healthcare: HeartPulse,
  finance: Landmark,
  productivity: CalendarDays,
};

const focus =
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fd-ring';

export function IndustryTabs({ industries }: { industries: IndustryTab[] }) {
  const [tab, setTab] = useState(0);
  const [spec, setSpec] = useState(0);
  const industry = industries[tab];
  const current = industry.specs[spec] ?? industry.specs[0];

  return (
    <div>
      <div role="tablist" aria-label="Industry" className="flex gap-2 overflow-x-auto pb-px">
        {industries.map((ind, i) => {
          const IconCmp = ICONS[ind.key] ?? Layers;
          const selected = i === tab;
          return (
            <button
              key={ind.key}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => {
                setTab(i);
                setSpec(0);
              }}
              className={`flex shrink-0 items-center gap-2 rounded-t-xl border border-b-0 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${focus} ${
                selected
                  ? 'border-fd-border bg-fd-card text-fd-foreground'
                  : 'border-transparent text-fd-muted-foreground hover:text-fd-foreground'
              }`}
            >
              <IconCmp className={`size-4 ${selected ? 'text-fd-primary' : ''}`} />
              {ind.name}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        className="-mt-px rounded-2xl rounded-tl-none border border-fd-border bg-fd-card p-4 sm:p-6"
      >
        <div key={industry.key} className="kg-fade">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-fd-muted-foreground">{industry.description}</p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href={industry.url}
                className={`group inline-flex items-center gap-1.5 rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-sm font-medium transition-colors duration-150 hover:border-fd-primary/40 ${focus}`}
              >
                Explore {industry.name.toLowerCase()}
                <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
              {current && (
                <Link
                  href={current.mdUrl}
                  className={`inline-flex items-center gap-1.5 rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-sm font-medium transition-colors duration-150 hover:border-fd-primary/40 ${focus}`}
                >
                  <FileText className="size-3.5 text-fd-muted-foreground" />
                  Read as markdown
                </Link>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {industry.specs.map((s) => (
              <Link
                key={s.url}
                href={s.url}
                className="group rounded-xl border border-fd-border bg-fd-background p-5 transition-colors duration-150 hover:border-fd-primary/40"
              >
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${LAYER_DOT[s.kind]}`} aria-hidden="true" />
                  <span className="text-xs text-fd-muted-foreground">{s.level}</span>
                </div>
                <p className="font-display mt-2 text-lg font-semibold tracking-tight">{s.title}</p>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {s.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-fd-primary" />
                      <span className="text-fd-muted-foreground">{p}</span>
                    </li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>

          {current && (
            <div className="mt-6 grid overflow-hidden rounded-xl bg-neutral-950 text-neutral-300 md:grid-cols-[14rem_1fr]">
              <div className="border-b border-neutral-800 p-3 md:border-r md:border-b-0">
                <p className="px-2 pb-2 text-xs text-neutral-500">What your assistant reads</p>
                <ul className="flex flex-col gap-1">
                  {industry.specs.map((s, i) => (
                    <li key={s.url}>
                      <button
                        type="button"
                        onClick={() => setSpec(i)}
                        className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150 ${focus} ${
                          i === spec
                            ? 'bg-neutral-800 text-neutral-100'
                            : 'text-neutral-400 hover:text-neutral-100'
                        }`}
                      >
                        {s.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-2.5">
                  <span className="size-2.5 rounded-full bg-neutral-700" />
                  <span className="size-2.5 rounded-full bg-neutral-700" />
                  <span className="size-2.5 rounded-full bg-neutral-700" />
                  <span className="ml-2 truncate font-code text-xs text-neutral-500">
                    {current.mdUrl}
                  </span>
                </div>
                <pre
                  key={current.url}
                  className="overflow-x-auto p-4 font-code text-xs leading-relaxed"
                >
                  {current.lines.map((line, i) => (
                    <div
                      key={i}
                      className="kg-fade flex gap-4"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <span className="w-5 shrink-0 text-right text-neutral-600 select-none">
                        {i + 1}
                      </span>
                      <span
                        className={
                          line.startsWith('#')
                            ? 'text-amber-300'
                            : line.startsWith('- ')
                              ? 'text-neutral-300'
                              : 'text-neutral-400'
                        }
                      >
                        {line || ' '}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

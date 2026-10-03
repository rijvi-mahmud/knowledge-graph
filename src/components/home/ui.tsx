import Link from 'next/link';
import type { ComponentType, ReactNode, SVGProps } from 'react';

export type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export type LayerKind = 'core' | 'industry' | 'domain';

/** One colour per knowledge level - see the layer tokens in global.css. */
export const LAYER_DOT: Record<LayerKind, string> = {
  core: 'bg-layer-core',
  industry: 'bg-layer-industry',
  domain: 'bg-layer-domain',
};

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring';

export function PrimaryButton({
  href,
  icon: IconCmp,
  children,
}: {
  href: string;
  icon?: Icon;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 rounded-lg bg-fd-primary px-4 py-2.5 text-sm font-medium text-fd-primary-foreground transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] ${focus}`}
    >
      {children}
      {IconCmp && (
        <IconCmp className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
      )}
    </Link>
  );
}

export function SecondaryButton({
  href,
  icon: IconCmp,
  children,
}: {
  href: string;
  icon?: Icon;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-lg border border-fd-border bg-fd-background px-4 py-2.5 text-sm font-medium transition-colors duration-150 hover:border-fd-primary/40 hover:bg-fd-accent ${focus}`}
    >
      {IconCmp && <IconCmp className="size-4 text-fd-muted-foreground" />}
      {children}
    </Link>
  );
}

/** Section heading: a short claim, with an optional muted continuation. */
export function SectionHeading({ claim, rest }: { claim: string; rest?: string }) {
  return (
    <h2 className="font-display max-w-2xl text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl">
      {claim}
      {rest && <span className="text-fd-muted-foreground"> {rest}</span>}
    </h2>
  );
}

/** Soft brand-tinted glow. Decorative, sits behind content. */
export function Glow({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -z-10 rounded-full bg-[radial-gradient(closest-side,var(--color-brand-soft),transparent)] blur-2xl ${className}`}
    />
  );
}

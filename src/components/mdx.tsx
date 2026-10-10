import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import type { ReactNode } from 'react';
import type { Jurisdiction } from '@/lib/jurisdictions';

/**
 * Prose that applies in one jurisdiction only: `<Only jurisdiction="us">`.
 * Unfiltered pages show it; a page filtered for another jurisdiction leaves
 * it out (see `onlyFor`). The markdown route applies the same rule.
 */
export function Only({ children }: { jurisdiction: Jurisdiction; children?: ReactNode }) {
  return <>{children}</>;
}

/** The Only component for a page filtered to one jurisdiction. */
export function onlyFor(chosen: Jurisdiction | undefined) {
  return function FilteredOnly({ jurisdiction, children }: { jurisdiction: Jurisdiction; children?: ReactNode }) {
    return !chosen || jurisdiction === chosen ? <>{children}</> : null;
  };
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Only,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}

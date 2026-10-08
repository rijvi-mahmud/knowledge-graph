// Plain constants and helpers with no imports, so the proxy and client
// components can use them without pulling in the spec loader.

/** Jurisdictions an item can be tagged with (see `jurisdiction` in source.config.ts). */
export const JURISDICTIONS = ['us', 'eu'] as const;
export type Jurisdiction = (typeof JURISDICTIONS)[number];

export function isJurisdiction(value: unknown): value is Jurisdiction {
  return JURISDICTIONS.includes(value as Jurisdiction);
}

/** Cookie holding a reader's jurisdiction choice on the HTML pages. */
export const JURISDICTION_COOKIE = 'kg-jurisdiction';

/**
 * The last slug segment the proxy adds for a filtered HTML page, such as
 * "__us". The double underscore can't clash with a real page slug.
 */
export const jurisdictionSegment = (j: Jurisdiction) => `__${j}`;

export function splitJurisdictionSlug(slug: string[] | undefined) {
  const last = slug?.at(-1);
  const match = last ? /^__(\w+)$/.exec(last) : null;
  if (match && isJurisdiction(match[1])) return { slug: slug!.slice(0, -1), jurisdiction: match[1] };
  return { slug, jurisdiction: undefined };
}

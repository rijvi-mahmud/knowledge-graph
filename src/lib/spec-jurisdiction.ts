import type { ModuleSpecData } from '@/components/module-spec';
import { INHERITED_FIELDS } from '@/lib/spec-inherit';
import type { Jurisdiction } from '@/lib/jurisdictions';

export { JURISDICTIONS, isJurisdiction, type Jurisdiction } from '@/lib/jurisdictions';

/**
 * The spec as one jurisdiction sees it: items tagged for another jurisdiction
 * are dropped, and untagged items, which apply everywhere, stay.
 */
export function jurisdictionSpec(data: ModuleSpecData, jurisdiction: Jurisdiction): ModuleSpecData {
  const out = { ...data } as Record<string, unknown>;
  for (const list of INHERITED_FIELDS) {
    const items = out[list];
    if (!Array.isArray(items)) continue;
    out[list] = items.filter((i: { jurisdiction?: string }) => !i.jurisdiction || i.jurisdiction === jurisdiction);
  }
  return out as ModuleSpecData;
}

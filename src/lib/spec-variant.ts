import type { ModuleSpecData } from '@/components/module-spec';

/**
 * The merged spec for a business that runs only some kinds of a module, such
 * as a clinic with outpatient appointments and no inpatient ones: items tagged
 * with a variant it doesn't keep are left out, and so are those variants.
 * Untagged items apply to every variant and always stay.
 */
export function keepVariants(spec: ModuleSpecData, keep: string[]): ModuleSpecData {
  const out: Record<string, unknown> = { ...spec };
  for (const [field, value] of Object.entries(spec)) {
    if (!Array.isArray(value)) continue;
    out[field] =
      field === 'variants'
        ? (value as { id: string }[]).filter((v) => keep.includes(v.id))
        : (value as { variant?: unknown }[]).filter((i) => typeof i?.variant !== 'string' || keep.includes(i.variant));
  }
  return out as ModuleSpecData;
}

import type { ModuleSpecData } from '@/components/module-spec';
import { INHERITED_FIELDS } from '@/lib/spec-inherit';
import { textJurisdiction, type Jurisdiction } from '@/lib/jurisdictions';

export { JURISDICTIONS, isJurisdiction, textJurisdiction, type Jurisdiction } from '@/lib/jurisdictions';

type Tagged = { jurisdiction?: string };

/** Lines of plain text, such as scope entries, that open by naming another jurisdiction are left out. */
const keepLines = (lines: unknown, jurisdiction: Jurisdiction) =>
  Array.isArray(lines)
    ? lines.filter((line) => typeof line !== 'string' || (textJurisdiction(line) ?? jurisdiction) === jurisdiction)
    : lines;

/**
 * The spec as one jurisdiction sees it: items tagged for another jurisdiction
 * are dropped, and untagged items, which apply everywhere, stay. Lines of text
 * that can't carry a tag (scope, non-goals, open questions, contract lines,
 * workflow steps and state machine triggers) are dropped when they open by
 * naming another jurisdiction.
 */
export function jurisdictionSpec(data: ModuleSpecData, jurisdiction: Jurisdiction): ModuleSpecData {
  const out = { ...data } as Record<string, unknown>;
  for (const list of INHERITED_FIELDS) {
    const items = out[list];
    if (!Array.isArray(items)) continue;
    out[list] = items.filter((i: Tagged) => !i.jurisdiction || i.jurisdiction === jurisdiction);
  }
  for (const list of ['scope', 'nonGoals', 'openQuestions']) out[list] = keepLines(out[list], jurisdiction);
  if (Array.isArray(out.dependencies))
    out.dependencies = (out.dependencies as Record<string, unknown>[]).map((d) => ({ ...d, contract: keepLines(d.contract, jurisdiction) }));
  if (Array.isArray(out.workflows))
    out.workflows = (out.workflows as Record<string, unknown>[]).map((w) => ({ ...w, steps: keepLines(w.steps, jurisdiction) }));
  // An operation lists only the errors this jurisdiction can raise.
  if (Array.isArray(out.errors) && Array.isArray(out.operations)) {
    const kept = new Set((out.errors as { code: string }[]).map((e) => e.code));
    const known = new Set((data.errors ?? []).map((e) => e.code));
    out.operations = (out.operations as { errors?: string[] }[]).map((o) => ({
      ...o,
      errors: o.errors?.filter((code) => kept.has(code) || !known.has(code)),
    }));
  }
  const machine = out.stateMachine as { transitions?: { trigger?: string }[] } | undefined;
  if (machine?.transitions)
    out.stateMachine = {
      ...machine,
      transitions: machine.transitions.filter((t) => (textJurisdiction(t.trigger ?? '') ?? jurisdiction) === jurisdiction),
    };
  return out as ModuleSpecData;
}

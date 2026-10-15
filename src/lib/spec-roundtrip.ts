import type { ModuleSpecData } from '@/components/module-spec';
import { INHERITED_FIELDS, JURISDICTION_LABEL, LEAD_FIELD } from './spec-inherit';
import { specToMarkdown } from './spec-markdown';
import { readSpecMarkdown } from './spec-read';

/**
 * Writes a resolved spec to Markdown, reads it back, and lists every value
 * that came back different. Empty means the Markdown carries the whole spec.
 */
export function roundTrip(spec: ModuleSpecData): string[] {
  const md = specToMarkdown(spec);
  const { data: back, problems } = readSpecMarkdown(md);
  const layered = (spec.lineage?.basedOn.length ?? 0) > 0;
  const diffs = problems.map((p) => `line ${p.line}: ${p.message}`);

  const fields = ['purpose', 'scope', 'nonGoals', 'openQuestions', 'changelog', 'version', 'status', 'stateMachine', ...INHERITED_FIELDS];
  for (const field of fields) {
    const a = normalise(field, (spec as Record<string, unknown>)[field], layered, true);
    const b = normalise(field, (back as Record<string, unknown>)[field], layered, false);
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        diffs.push(`${field}: ${a.length} items written, ${b.length} read back`);
        continue;
      }
      a.forEach((x, i) => {
        const y = b[i];
        if (JSON.stringify(x) === JSON.stringify(y)) return;
        const keys = [...new Set([...Object.keys(x ?? {}), ...Object.keys(y ?? {})])];
        const k = keys.find((key) => JSON.stringify((x as Record<string, unknown>)?.[key]) !== JSON.stringify((y as Record<string, unknown>)?.[key]));
        diffs.push(`${field}[${i}]${k ? `.${k}` : ''}: wrote ${JSON.stringify(k ? (x as Record<string, unknown>)[k] : x)}, read ${JSON.stringify(k ? (y as Record<string, unknown>)?.[k] : y)}`);
      });
    } else diffs.push(`${field}: wrote ${JSON.stringify(a)}, read ${JSON.stringify(b)}`);
  }
  return diffs;
}

/** The comparable form of a value: no empty values, single spaces, no jurisdiction label in the text. */
function normalise(field: string, value: unknown, layered: boolean, written: boolean): unknown {
  const tidy = (v: unknown, key?: string): unknown => {
    if (typeof v === 'string') return v.replace(/\s+/g, ' ').trim();
    if (Array.isArray(v)) {
      const out = v.map((x) => tidy(x)).filter((x) => x !== undefined && x !== '');
      return out.length ? out : undefined;
    }
    if (v && typeof v === 'object') {
      const entries = Object.entries(v as Record<string, unknown>)
        .filter(([k]) => layered || (k !== 'layer' && k !== 'overrides'))
        // An access matrix cell left out means none.
        .filter(([k, x]) => !(key === 'roles' && x === 'none') && k !== 'lineage')
        .map(([k, x]) => [k, tidy(x, k)] as const)
        .filter(([, x]) => x !== undefined && x !== '' && x !== false);
      return entries.length ? Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b))) : undefined;
    }
    return v === null ? undefined : v;
  };
  if (written && Array.isArray(value) && LEAD_FIELD[field]) {
    const lead = LEAD_FIELD[field];
    value = value.map((item: Record<string, unknown>) => {
      const label = JURISDICTION_LABEL[String(item.jurisdiction ?? '')];
      const text = item[lead];
      return label && typeof text === 'string' && text.startsWith(`${label}: `) ? { ...item, [lead]: text.slice(label.length + 2) } : item;
    });
  }
  return tidy(value);
}

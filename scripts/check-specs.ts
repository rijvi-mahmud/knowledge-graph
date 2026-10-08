/**
 * Checks every module page in content/docs, the validation in CLAUDE.md
 * ("How to bring a module to full SRS depth", step 6).
 *
 * Errors (exit code 1):
 * - frontmatter that doesn't parse or doesn't match the schema
 * - a broken inheritance chain (missing parent, cycle, module mismatch)
 * - a duplicate id within one page's own list, or two operations on one endpoint
 * - an id in a `verifies` or `covers` list that doesn't exist
 * - an error code returned by an operation or validation but not defined
 * - an id mentioned in the page (outside its changelog) that doesn't exist
 * - an item tagged with a variant the module doesn't declare
 * - a compliance item under US law not tagged us, or under EU law not tagged eu
 * - in a jurisdiction's filtered view, an item that cites or names an item
 *   hidden from that view (a verifies, covers or covered_by id, an id in its
 *   text, an error code, or a setting)
 * - an em or en dash anywhere in the page
 *
 * Warnings (exit code 0, or 1 with --strict):
 * - rules, requirements and constraints no acceptance criterion verifies
 * - dependencies without a contract (what this module needs from them)
 * - an item that opens with "In the United States" or "In the European Union"
 *   but has no jurisdiction tag
 *
 * Usage: pnpm check:specs [--strict]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { docs } from '../source.config';
import { resolveSpec, type SpecNode } from '@/lib/spec-inherit';
import type { ModuleSpecData } from '@/components/module-spec';
import { SPEC_ID } from '@/lib/spec-ids';
import { JURISDICTIONS, jurisdictionSpec } from '@/lib/spec-jurisdiction';

const root = join(import.meta.dirname, '..', 'content', 'docs');
const strict = process.argv.includes('--strict');

const errors: string[] = [];
const warnings: string[] = [];

function mdxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? mdxFiles(join(dir, e.name)) : e.name.endsWith('.mdx') ? [join(dir, e.name)] : [],
  );
}

// --- parse and validate every page ------------------------------------------

const schema = (docs as unknown as { docs: { schema: { safeParse: (v: unknown) => any } } }).docs
  .schema;
const nodes = new Map<string, SpecNode>();
const own = new Map<string, ModuleSpecData>(); // each page's own data, before inheritance
const rawText = new Map<string, string>(); // each page's frontmatter (minus changelog) and body

for (const file of mdxFiles(root)) {
  const path = relative(root, file).replace(/\.mdx$/, '');
  const raw = readFileSync(file, 'utf8');

  const dashes = raw.split('\n').flatMap((line, i) => (/[—–]/.test(line) ? [i + 1] : []));
  if (dashes.length > 0) errors.push(`${path}: em or en dash on line ${dashes.join(', ')}`);

  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) continue;

  let frontmatter: unknown;
  try {
    frontmatter = parse(match[1]);
  } catch (e) {
    errors.push(`${path}: frontmatter is not valid YAML. ${(e as Error).message.split('\n')[0]}`);
    continue;
  }

  const result = schema.safeParse(frontmatter);
  if (!result.success) {
    for (const issue of result.error.issues)
      errors.push(`${path}: ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    continue;
  }

  const data = result.data as ModuleSpecData & { title: string };
  if (!data.module) continue;
  own.set(path, data);
  // The changelog may mention ids that were removed, so it is not checked.
  const { changelog: _history, ...rest } = frontmatter as Record<string, unknown>;
  rawText.set(path, JSON.stringify(rest) + '\n' + raw.slice(match[0].length));
  nodes.set(path, { path, title: data.title, url: `/docs/${path}`, data });
}

// --- per-module checks -------------------------------------------------------

const ID_LISTS = [
  'compliance',
  'businessRules',
  'functionalRequirements',
  'constraints',
  'assumptions',
  'acceptanceCriteria',
  'edgeCases',
  'deliveryGuarantees',
  'decisions',
  'performanceTargets',
  'risks',
  'references',
] as const;

const all = [...nodes.values()];
let modules = 0;

for (const node of all) {
  modules++;
  const where = node.path;

  // Duplicate ids within the page's own lists.
  for (const list of ID_LISTS) {
    const ids = ((own.get(where) as Record<string, { id: string }[] | undefined>)[list] ?? []).map(
      (i) => i.id,
    );
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length > 0) errors.push(`${where}: duplicate ${list} id ${[...new Set(dupes)].join(', ')}`);
  }

  let spec: ModuleSpecData;
  try {
    spec = resolveSpec(node, (p) => nodes.get(p), all);
  } catch (e) {
    errors.push(`${where}: ${(e as Error).message}`);
    continue;
  }

  // Every id a criterion verifies or an edge case covers must exist.
  const known = new Set(
    ID_LISTS.flatMap((list) =>
      ((spec as Record<string, { id: string }[] | undefined>)[list] ?? []).map((i) => i.id),
    ),
  );
  // Every id mentioned anywhere in the page, outside its changelog, must exist:
  // each one is rendered as a link to its item.
  const mentioned = new Set([...(rawText.get(where) ?? '').matchAll(SPEC_ID)].map((m) => m[0]));
  for (const id of mentioned)
    if (!known.has(id)) errors.push(`${where}: mentions ${id}, which doesn't exist`);

  for (const a of spec.acceptanceCriteria ?? [])
    for (const id of a.verifies ?? [])
      if (!known.has(id)) errors.push(`${where}: ${a.id} verifies ${id}, which doesn't exist`);
  for (const e of spec.edgeCases ?? [])
    for (const id of e.covers ?? [])
      if (!known.has(id)) errors.push(`${where}: ${e.id} covers ${id}, which doesn't exist`);
  // A compliance item says which ids meet it; they must exist.
  for (const c of spec.compliance ?? [])
    for (const id of c.covered_by ?? [])
      if (!known.has(id)) errors.push(`${where}: ${c.id} is covered by ${id}, which doesn't exist`);

  // Each endpoint is defined once: no two operations share a method and path.
  const endpoints = new Map<string, string>();
  for (const op of spec.operations ?? []) {
    if (!op.method || !op.path) continue;
    const key = `${op.method} ${op.path}`;
    if (endpoints.has(key))
      errors.push(`${where}: "${op.name}" and "${endpoints.get(key)}" both use ${key}`);
    else endpoints.set(key, op.name);
  }

  // Every error code an endpoint or validation raises must be defined.
  const codes = new Set((spec.errors ?? []).map((e) => e.code));
  for (const op of spec.operations ?? [])
    for (const code of op.errors ?? [])
      if (!codes.has(code)) errors.push(`${where}: operation "${op.name}" returns undefined error ${code}`);
  for (const v of spec.validations ?? [])
    if (!codes.has(v.error)) errors.push(`${where}: validation on ${v.field} raises undefined error ${v.error}`);

  // A variant tag must name a variant the module declares.
  const variantIds = new Set((spec.variants ?? []).map((v) => v.id));
  for (const list of ['dataModel', 'businessRules', 'workflows', 'edgeCases', 'functionalRequirements', 'acceptanceCriteria', 'operations'] as const)
    for (const item of ((spec as Record<string, unknown>)[list] ?? []) as { variant?: string; id?: string; name?: string }[])
      if (item.variant && !variantIds.has(item.variant))
        errors.push(`${where}: ${item.id ?? item.name} is tagged with variant "${item.variant}", which isn't declared`);

  // Compliance items name the law they follow, so their jurisdiction is known.
  // Agents skip the other region's items, so a missing tag hides a duty.
  const US_LAW = /HIPAA|CFR|Medicare|ONC|No Surprises|Affordable Care|CMS-|Social Security/;
  const EU_LAW = /GDPR|European|EHDS|\(EU\)/;
  for (const c of (spec.compliance ?? []) as { id: string; regulation: string; provision: string; jurisdiction?: string }[]) {
    const law = `${c.regulation} ${c.provision}`;
    const want = US_LAW.test(law) ? 'us' : EU_LAW.test(law) ? 'eu' : undefined;
    if (want && c.jurisdiction !== want)
      errors.push(`${where}: ${c.id} (${c.regulation}) should be tagged jurisdiction: ${want}`);
  }

  // A filtered view (?jurisdiction=us) must stand on its own: nothing kept may
  // point at an item the filter hid, or the agent reading it hits a dead end.
  for (const j of JURISDICTIONS) {
    const view = jurisdictionSpec(spec, j) as Record<string, unknown>;
    const full = spec as Record<string, unknown>;
    const keptIds = new Set<string>();
    const hidden = new Set<string>();
    const hiddenSettings: string[] = [];
    for (const [list, items] of Object.entries(full)) {
      if (!Array.isArray(items)) continue;
      const kept = new Set((view[list] as unknown[]) ?? []);
      for (const item of items as { id?: string; name?: string }[]) {
        if (kept.has(item)) { if (item.id) keptIds.add(item.id); continue; }
        if (item.id) hidden.add(item.id);
        if (list === 'settings' && item.name) hiddenSettings.push(item.name);
      }
    }
    for (const id of keptIds) hidden.delete(id);
    const problems = new Set<string>();
    for (const list of ['acceptanceCriteria', 'edgeCases', 'compliance'] as const)
      for (const item of (view[list] ?? []) as { id: string; verifies?: string[]; covers?: string[]; covered_by?: string[] }[])
        for (const ref of [...(item.verifies ?? []), ...(item.covers ?? []), ...(item.covered_by ?? [])])
          if (hidden.has(ref)) problems.add(`${item.id} cites ${ref}`);
    const viewErrors = new Set(((view.errors ?? []) as { code: string }[]).map((e) => e.code));
    for (const op of (view.operations ?? []) as { name: string; errors?: string[] }[])
      for (const code of op.errors ?? []) if (!viewErrors.has(code)) problems.add(`operation "${op.name}" raises ${code}`);
    for (const [list, items] of Object.entries(view)) {
      if (!Array.isArray(items) || list === 'changelog') continue;
      for (const item of items as Record<string, unknown>[]) {
        const text = JSON.stringify(item);
        const name = String(item.id ?? item.name ?? item.field ?? item.code ?? list);
        for (const id of hidden) if (new RegExp(`\\b${id}\\b`).test(text)) problems.add(`${name} mentions ${id}`);
        if (list !== 'settings') for (const s of hiddenSettings) if (new RegExp(`\\b${s}\\b`).test(text)) problems.add(`${name} uses setting ${s}`);
      }
    }
    for (const p of problems) errors.push(`${where}: in the ${j} view, ${p}, which only applies elsewhere; tag it or remove the reference`);
  }

  // An item that opens by naming one jurisdiction almost always applies only there.
  for (const [list, items] of Object.entries(spec as Record<string, unknown>)) {
    if (!Array.isArray(items) || list === 'changelog') continue;
    for (const item of items as Record<string, unknown>[]) {
      const lead = String(item.text ?? item.rule ?? item.situation ?? item.given ?? item.description ?? '');
      if (!item.jurisdiction && /^(In the United States|In the US|In the European Union|In the EU)\b/.test(lead))
        warnings.push(`${where}: ${String(item.id ?? item.name ?? item.field)} opens with one jurisdiction but has no jurisdiction tag`);
    }
  }

  // Every dependency states its contract: what this module needs or gives.
  for (const dep of spec.dependencies ?? [])
    if (!dep.contract || dep.contract.length === 0)
      warnings.push(`${where}: dependency ${dep.service} has no contract`);

  // Rules, requirements and constraints with no acceptance criterion.
  const verified = new Set((spec.acceptanceCriteria ?? []).flatMap((a) => a.verifies ?? []));
  const unverified = [
    ...(spec.businessRules ?? []),
    ...(spec.functionalRequirements ?? []),
    ...(spec.constraints ?? []),
  ]
    .map((i) => i.id)
    .filter((id) => !verified.has(id));
  if (unverified.length > 0)
    warnings.push(`${where}: not verified by any acceptance criterion: ${unverified.join(', ')}`);
}

// --- report ------------------------------------------------------------------

for (const w of warnings) console.log(`warning  ${w}`);
for (const e of errors) console.log(`error    ${e}`);
console.log(
  `\nChecked ${modules} module pages: ${errors.length} errors, ${warnings.length} warnings.`,
);

if (errors.length > 0 || (strict && warnings.length > 0)) process.exit(1);

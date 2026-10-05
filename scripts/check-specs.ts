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
 * - an em or en dash anywhere in the page
 *
 * Warnings (exit code 0, or 1 with --strict):
 * - rules, requirements and constraints no acceptance criterion verifies
 *
 * Usage: pnpm check:specs [--strict]
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { docs } from '../source.config';
import { resolveSpec, type SpecNode } from '@/lib/spec-inherit';
import type { ModuleSpecData } from '@/components/module-spec';

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
  nodes.set(path, { path, title: data.title, url: `/docs/${path}`, data });
}

// --- per-module checks -------------------------------------------------------

const ID_LISTS = [
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
  for (const a of spec.acceptanceCriteria ?? [])
    for (const id of a.verifies ?? [])
      if (!known.has(id)) errors.push(`${where}: ${a.id} verifies ${id}, which doesn't exist`);
  for (const e of spec.edgeCases ?? [])
    for (const id of e.covers ?? [])
      if (!known.has(id)) errors.push(`${where}: ${e.id} covers ${id}, which doesn't exist`);

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

/**
 * Loads module pages straight from MDX files, outside Next.js: walks each
 * root, parses the YAML frontmatter, validates it with the page schema and
 * returns the pages as inheritance nodes. Used by `pnpm check:specs`, and by
 * tools that add their own pages (such as a company layer) on top of
 * content/docs.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { docs } from '../../source.config';
import type { ModuleSpecData } from '@/components/module-spec';
import type { SpecNode } from './spec-inherit';

/** A folder of MDX pages. `prefix` is prepended to each page's path, so pages from two roots can't collide. */
export interface SpecRoot {
  dir: string;
  prefix?: string;
}

export interface LoadedSpecs {
  /** Every module page, keyed by path (relative to its root, after the prefix). */
  nodes: Map<string, SpecNode>;
  /** Each page's own data, before inheritance. */
  own: Map<string, ModuleSpecData>;
  /** Each page's frontmatter (minus changelog) and body, for text checks. */
  rawText: Map<string, string>;
  /** Pages that don't parse or don't match the schema, and em or en dashes. */
  errors: string[];
}

export const docsRoot = join(import.meta.dirname, '..', '..', 'content', 'docs');

function mdxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? mdxFiles(join(dir, e.name)) : e.name.endsWith('.mdx') ? [join(dir, e.name)] : [],
  );
}

const schema = (docs as unknown as { docs: { schema: { safeParse: (v: unknown) => any } } }).docs
  .schema;

export function loadSpecs(roots: SpecRoot[] = [{ dir: docsRoot }]): LoadedSpecs {
  const out: LoadedSpecs = { nodes: new Map(), own: new Map(), rawText: new Map(), errors: [] };

  for (const root of roots) {
    for (const file of mdxFiles(root.dir)) {
      const path = (root.prefix ? `${root.prefix}/` : '') + relative(root.dir, file).replace(/\.mdx$/, '');
      const raw = readFileSync(file, 'utf8');

      const dashes = raw.split('\n').flatMap((line, i) => (/[—–]/.test(line) ? [i + 1] : []));
      if (dashes.length > 0) out.errors.push(`${path}: em or en dash on line ${dashes.join(', ')}`);

      const match = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!match) continue;

      let frontmatter: unknown;
      try {
        frontmatter = parse(match[1]);
      } catch (e) {
        out.errors.push(`${path}: frontmatter is not valid YAML. ${(e as Error).message.split('\n')[0]}`);
        continue;
      }

      const result = schema.safeParse(frontmatter);
      if (!result.success) {
        for (const issue of result.error.issues)
          out.errors.push(`${path}: ${issue.path.join('.') || '(root)'}: ${issue.message}`);
        continue;
      }

      const data = result.data as ModuleSpecData & { title: string };
      if (!data.module) continue;
      if (out.nodes.has(path)) {
        out.errors.push(`${path}: two pages share this path`);
        continue;
      }
      out.own.set(path, data);
      // The changelog may mention ids that were removed, so it is not checked.
      const { changelog: _history, ...rest } = frontmatter as Record<string, unknown>;
      out.rawText.set(path, JSON.stringify(rest) + '\n' + raw.slice(match[0].length));
      out.nodes.set(path, { path, title: data.title, url: `/docs/${path}`, data });
    }
  }

  return out;
}

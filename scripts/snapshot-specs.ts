/**
 * Saves each module's merged markdown, as published, once per version, so a
 * version an agent cited stays fetchable at /versions/<module path>/<version>.md.
 *
 *   pnpm snapshot:specs                     # from production
 *   SITE_URL=http://localhost:3000 pnpm snapshot:specs
 *
 * Run it after a push is live. It only writes versions that have no snapshot
 * yet, and only when the published page shows the same version as the source,
 * so a snapshot never holds content from another version.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { parse } from 'yaml';

const ROOT = join(import.meta.dirname, '..');
const DOCS = join(ROOT, 'content/docs');
const OUT = join(ROOT, 'content/versions');
const SITE = (process.env.SITE_URL ?? 'https://knowledge-graph-ecru.vercel.app').replace(/\/+$/, '');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.mdx') ? [p] : [];
  });
}

async function main() {
let written = 0;
for (const file of walk(DOCS)) {
  const fm = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  const data = fm ? (parse(fm[1]) as { module?: string; version?: string }) : {};
  if (!data.module || !data.version) continue;

  const path = relative(DOCS, file).replace(/(\/index)?\.mdx$/, '');
  const target = join(OUT, path, `${data.version}.md`);
  if (existsSync(target)) continue;

  const res = await fetch(`${SITE}/docs/${path}.md`);
  if (!res.ok) {
    console.warn(`skip ${path}: ${res.status}`);
    continue;
  }
  const text = await res.text();
  const published = text.match(/^- version: (.+)$/m)?.[1]?.trim();
  if (published !== data.version) {
    console.warn(`skip ${path}: published ${published ?? 'unknown'}, source ${data.version}. Deploy first.`);
    continue;
  }

  const header = `> Snapshot of ${path} version ${data.version}, saved ${new Date().toISOString().slice(0, 10)}. The current version is at ${SITE}/docs/${path}.md.\n\n`;
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, header + text);
  written++;
  console.log(`saved ${path} ${data.version}`);
}
console.log(`${written} snapshot(s) written.`);
}

main();

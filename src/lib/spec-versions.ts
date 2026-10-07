import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const VERSIONS_DIR = join(process.cwd(), 'content/versions');

/** Every saved snapshot (scripts/snapshot-specs.ts), as paths relative to content/versions. */
export function listSnapshots(dir = VERSIONS_DIR): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? listSnapshots(p) : p.endsWith('.md') ? [relative(VERSIONS_DIR, p)] : [];
  });
}

import { createMDX } from 'fumadocs-mdx/next';
import { fileURLToPath } from 'node:url';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Pin the workspace root - a lockfile higher up the tree otherwise makes
  // Turbopack infer the wrong one.
  turbopack: {
    root: fileURLToPath(new URL('.', import.meta.url)),
  },
};

export default withMDX(config);

import type { ModuleSpecData } from '@/components/module-spec';
import { siteUrl } from './shared';

/**
 * An OpenAPI 3.1 description generated from a merged spec's operations and
 * errors: paths, methods, success statuses and every error with its HTTP
 * status. Inputs and outputs are prose in the spec, so they are carried as
 * descriptions, not schemas. The spec page stays the source of truth.
 */
export function specToOpenApi(spec: ModuleSpecData, title: string, url: string) {
  const errors = new Map((spec.errors ?? []).map((e) => [e.code, e]));
  const paths: Record<string, Record<string, unknown>> = {};

  for (const op of spec.operations ?? []) {
    if (!op.method || !op.path) continue;
    const params = [...op.path.matchAll(/\{(\w+)\}/g)].map((m) => ({
      name: m[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));

    // Group the operation's error codes by HTTP status, as OpenAPI keys responses by status.
    const byStatus = new Map<string, string[]>();
    for (const code of op.errors ?? []) {
      const status = String(errors.get(code)?.http ?? 'default');
      byStatus.set(status, [...(byStatus.get(status) ?? []), code]);
    }
    const errorResponses = Object.fromEntries(
      [...byStatus].map(([status, codes]) => [
        status,
        {
          description: codes.map((c) => `${c}: ${errors.get(c)?.message ?? ''}`).join('\n'),
          content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } } },
        },
      ]),
    );

    paths[op.path] ??= {};
    paths[op.path][op.method.toLowerCase()] = {
      operationId: op.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      summary: op.name,
      description: [op.description, op.input && `Input: ${op.input}`, op.actor && `Actor: ${op.actor}`]
        .filter(Boolean)
        .join('\n\n'),
      ...(params.length ? { parameters: params } : {}),
      responses: {
        [String(op.success ?? 200)]: { description: op.output ?? 'Success' },
        ...errorResponses,
      },
      ...(op.layer ? { 'x-layer': op.layer } : {}),
      ...(op.variant ? { 'x-variant': op.variant } : {}),
    };
  }

  return {
    openapi: '3.1.0',
    info: {
      title,
      version: spec.version ?? '0.0.0',
      description: `Generated from the ${title} specification (${siteUrl}${url}). The specification is normative; this file lists its endpoints, success statuses and error codes. Inputs and outputs are described in prose there. Authentication is set by each deployment (see the spec's API conventions).`,
      license: { name: 'CC BY-SA 4.0', identifier: 'CC-BY-SA-4.0' },
    },
    servers: [{ url: '/', description: 'Your deployment of this module' }],
    externalDocs: { url: `${siteUrl}${url}`, description: 'The full specification' },
    paths,
    components: {
      schemas: {
        Problem: {
          type: 'object',
          description: 'Problem details (RFC 9457), with the error code in code.',
          properties: {
            type: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'integer' },
            detail: { type: 'string' },
            code: { type: 'string', enum: [...errors.keys()] },
          },
        },
      },
    },
  };
}

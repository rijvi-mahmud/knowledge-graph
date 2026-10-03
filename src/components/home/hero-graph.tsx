import type { LayerKind } from './ui';

export interface GraphNode {
  id: string; // page path, e.g. "healthcare/dental"
  label: string;
  kind: LayerKind;
  parent?: string; // id of the node it inherits from
}

const FILL: Record<LayerKind, string> = {
  core: 'var(--color-layer-core)',
  industry: 'var(--color-layer-industry)',
  domain: 'var(--color-layer-domain)',
};

const W = 1200;
const H = 560;

/**
 * Lays the graph out around the hero copy: core on the left, industries in a
 * column on the right, each domain just below its industry. Every coordinate
 * stays inside the viewBox with room for its label, so nothing can overflow.
 */
function layout(nodes: GraphNode[]) {
  const pos = new Map<string, { x: number; y: number }>();
  const spread = (count: number, i: number, top: number, bottom: number) =>
    count === 1 ? (top + bottom) / 2 : top + ((bottom - top) * i) / (count - 1);

  const core = nodes.filter((n) => n.kind === 'core');
  core.forEach((n, i) => pos.set(n.id, { x: 170, y: spread(core.length, i, 240, 360) }));

  const industries = nodes.filter((n) => n.kind === 'industry');
  industries.forEach((n, i) =>
    pos.set(n.id, { x: 1000, y: spread(industries.length, i, 110, 470) }),
  );

  const perParent = new Map<string, number>();
  nodes
    .filter((n) => n.kind === 'domain')
    .forEach((n) => {
      const p = n.parent ? pos.get(n.parent) : undefined;
      const k = perParent.get(n.parent ?? '') ?? 0;
      perParent.set(n.parent ?? '', k + 1);
      pos.set(n.id, { x: 1090 + k * 60, y: (p?.y ?? 280) + 60 });
    });

  return pos;
}

function edgePath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
}

export function HeroGraph({ nodes }: { nodes: GraphNode[] }) {
  const pos = layout(nodes);
  const edges = nodes.flatMap((n) => {
    const from = n.parent ? pos.get(n.parent) : undefined;
    const to = pos.get(n.id);
    return from && to ? [{ id: `${n.parent}->${n.id}`, d: edgePath(from, to), kind: n.kind }] : [];
  });

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="kg-graph-mask absolute inset-y-0 left-1/2 -z-10 hidden h-full w-full max-w-[1400px] -translate-x-1/2 lg:block"
    >
      {edges.map((e, i) => (
        <g key={e.id}>
          <path
            id={`kg-edge-${i}`}
            d={e.d}
            fill="none"
            stroke="var(--color-fd-border)"
            strokeWidth="1"
          />
          {/* A packet of knowledge travelling down the inheritance edge. */}
          <circle r="2.5" fill={FILL[e.kind]} className="kg-packet">
            <animateMotion dur={`${5 + i * 0.7}s`} begin={`-${i * 0.9}s`} repeatCount="indefinite">
              <mpath href={`#kg-edge-${i}`} />
            </animateMotion>
          </circle>
        </g>
      ))}

      {nodes.map((n) => {
        const p = pos.get(n.id);
        if (!p) return null;
        // Core labels sit left of the node, industries right, domains
        // underneath - the right edge is too close for a trailing label.
        const label =
          n.kind === 'core'
            ? { x: -14, y: 4, anchor: 'end' as const }
            : n.kind === 'industry'
              ? { x: 14, y: 4, anchor: 'start' as const }
              : { x: 0, y: 24, anchor: 'middle' as const };
        return (
          <g key={n.id} transform={`translate(${p.x} ${p.y})`}>
            <circle r="9" fill={FILL[n.kind]} opacity="0.12" />
            <circle r="3.5" fill={FILL[n.kind]} />
            <text
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              className="fill-fd-muted-foreground font-code text-[11px]"
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

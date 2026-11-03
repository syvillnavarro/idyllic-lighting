/**
 * Coordinates match the generated night photograph (1280 × 720).
 * The ground sits near y = 640; lights follow the fascia, not the shingles.
 */

export type Point = readonly [number, number];
export type Polygon = readonly Point[];

export const PHOTO_W = 1280;
export const PHOTO_H = 720;
export const GROUND_Y = 640;

/** Tight box around the house so framing can park it in the free stage area. */
export const HOUSE_BOUNDS = { left: 198, right: 1174, top: 108, bottom: GROUND_Y } as const;

export const points = (polygon: Polygon) => polygon.map(([x, y]) => `${x},${y}`).join(" ");

/** Spill stays on the house, not the sky. */
export const SILHOUETTE: Polygon[] = [
  [
    [200, 360],
    [248, 250],
    [400, 130],
    [545, 250],
    [750, 250],
    [878, 150],
    [1008, 250],
    [1148, 250],
    [1148, 338],
    [1158, 338],
    [1170, 600],
    [198, 600],
  ],
];

type Strand = {
  id: string;
  points: Polygon;
  /** A strand on another roof level starts when the light below reaches `atX`. */
  branch?: { from: string; atX: number };
};

/**
 * Far-left garage eave first, then the main gables, porch beam and bay roof.
 */
export const STRANDS: Strand[] = [
  { id: "garage-eave", points: [[200, 360], [548, 360]] },
  {
    id: "upper-roofline",
    branch: { from: "garage-eave", atX: 255 },
    points: [
      [248, 250],
      [290, 250],
      [400, 130],
      [545, 250],
      [750, 250],
      [878, 150],
      [1008, 250],
      [1148, 250],
      [1148, 332],
    ],
  },
  {
    id: "porch-bay-eave",
    branch: { from: "garage-eave", atX: 548 },
    points: [
      [640, 338],
      [1152, 338],
      [1152, 368],
    ],
  },
];

const SPACING = 15;

/** Width of each bulb's soft turn-on, as a share of the whole route. */
export const RAMP = 0.02;

export type Bulb = {
  x: number;
  y: number;
  /** Activation threshold on the 0-1 illumination progress. */
  t: number;
  /** Previous bulb on the same strand, or -1. */
  prev: number;
};

const length = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Route distance at which a strand's light reaches `x`, extended straight past its end. */
function distanceAtX(strand: Strand, x: number, offsets: Map<string, number>) {
  const start = offsets.get(strand.id) ?? 0;
  let travelled = 0;
  for (let i = 1; i < strand.points.length; i++) {
    const a = strand.points[i - 1];
    const b = strand.points[i];
    if (b[0] === a[0]) {
      travelled += length(a, b);
      continue;
    }
    if (x <= b[0]) return start + travelled + length(a, b) * ((x - a[0]) / (b[0] - a[0]));
    travelled += length(a, b);
  }
  return start + travelled + (x - strand.points[strand.points.length - 1][0]);
}

function buildBulbs(): Bulb[] {
  const offsets = new Map<string, number>();
  const placed: { x: number; y: number; d: number; prev: number }[] = [];

  for (const strand of STRANDS) {
    const source = strand.branch && STRANDS.find((s) => s.id === strand.branch!.from);
    const offset = source ? distanceAtX(source, strand.branch!.atX, offsets) : 0;
    offsets.set(strand.id, offset);

    let travelled = 0;
    let prev = -1;
    strand.points.forEach((b, i) => {
      if (i === 0) {
        placed.push({ x: b[0], y: b[1], d: offset, prev });
        prev = placed.length - 1;
        return;
      }
      const a = strand.points[i - 1];
      const span = length(a, b);
      const steps = Math.max(1, Math.round(span / SPACING));
      for (let k = 1; k <= steps; k++) {
        const f = k / steps;
        placed.push({
          x: a[0] + (b[0] - a[0]) * f,
          y: a[1] + (b[1] - a[1]) * f,
          d: offset + travelled + span * f,
          prev,
        });
        prev = placed.length - 1;
      }
      travelled += span;
    });
  }

  const longest = Math.max(...placed.map((bulb) => bulb.d));
  return placed.map(({ x, y, d, prev }) => ({
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    t: (d / longest) * (1 - RAMP),
    prev,
  }));
}

export const BULBS: readonly Bulb[] = buildBulbs();

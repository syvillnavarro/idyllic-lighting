/**
 * One master coordinate system for the house, the bulbs and every framing.
 * Units are arbitrary; the ground line is y = 860.
 */

export type Point = readonly [number, number];
export type Polygon = readonly Point[];

export const GROUND_Y = 860;

/** Everything that must stay in frame: far-left bulb to right wing, chimney to ground. */
export const HOUSE_BOUNDS = { left: 548, right: 1584, top: 252, bottom: GROUND_Y } as const;

export const points = (polygon: Polygon) => polygon.map(([x, y]) => `${x},${y}`).join(" ");

export const WALLS = {
  upper: [[690, 446], [1342, 446], [1342, 592], [690, 592]],
  ground: [[574, 652], [1342, 652], [1342, 842], [574, 842]],
  leftGable: [[690, 446], [815, 312], [940, 446], [940, 592], [690, 592]],
  centreGable: [[984, 446], [1060, 374], [1136, 446], [1136, 592], [984, 592]],
  wing: [[1342, 446], [1447, 326], [1552, 446], [1552, 842], [1342, 842]],
  bay: [[1362, 680], [1532, 680], [1532, 842], [1362, 842]],
} satisfies Record<string, Polygon>;

/** Drawn behind the facade: the main roof between the gables, and the chimney. */
export const BACK_ROOFS = {
  main: [[668, 449], [748, 332], [1268, 332], [1350, 449]],
} satisfies Record<string, Polygon>;

export const CHIMNEY = { x: 1490, y: 262, width: 36, height: 140, capOverhang: 6 } as const;

/** Drawn in front of the facade: the lower roof, the three gable rakes and the bay roof. */
export const FRONT_ROOFS = {
  lower: [[552, 653], [646, 588], [1352, 588], [1352, 653]],
  leftRake: [[664, 452], [815, 288], [966, 452], [940, 446], [815, 312], [690, 446]],
  centreRake: [[958, 452], [1060, 350], [1162, 452], [1136, 446], [1060, 374], [984, 446]],
  wingRake: [[1316, 452], [1447, 302], [1578, 452], [1552, 446], [1447, 326], [1342, 446]],
  bay: [[1352, 673], [1378, 641], [1536, 641], [1562, 673]],
} satisfies Record<string, Polygon>;

/** Fascia boards the light strings are mounted on. */
export const FASCIAS: Polygon[] = [
  [[552, 648], [1352, 648]],
  [[668, 444], [1350, 444]],
  [[670, 448], [815, 296], [960, 448]],
  [[962, 448], [1060, 356], [1158, 448]],
  [[1320, 448], [1447, 308], [1574, 448]],
  [[1352, 668], [1562, 668]],
];

/** Light only falls on the house, never on the sky. */
export const SILHOUETTE: Polygon[] = [
  ...Object.values(WALLS),
  ...Object.values(BACK_ROOFS),
  ...Object.values(FRONT_ROOFS),
];

type Strand = {
  id: string;
  points: Polygon;
  /** A strand on another roof level starts when the light below reaches `atX`. */
  branch?: { from: string; atX: number };
};

/**
 * The authored illumination route. It starts at the far-left roof edge and
 * runs along the lower eave; the upper roofline and the bay roof are branches.
 */
export const STRANDS: Strand[] = [
  { id: "lower-eave", points: [[562, 648], [1340, 648]] },
  {
    id: "upper-roofline",
    branch: { from: "lower-eave", atX: 680 },
    points: [
      [680, 444], [815, 302], [954, 444],
      [970, 444], [1060, 360], [1150, 444],
      [1322, 444], [1447, 314], [1572, 444],
    ],
  },
  { id: "bay-eave", branch: { from: "lower-eave", atX: 1362 }, points: [[1362, 668], [1552, 668]] },
];

const SPACING = 16;

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
        placed.push({ x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, d: offset + travelled + span * f, prev });
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

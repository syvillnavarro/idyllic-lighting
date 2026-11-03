import { memo, type ReactNode } from "react";
import {
  BACK_ROOFS,
  BULBS,
  CHIMNEY,
  FASCIAS,
  FRONT_ROOFS,
  GROUND_Y,
  SILHOUETTE,
  WALLS,
  points,
  type Polygon,
} from "./geometry";
import type { Assembly } from "./timeline";

const C = {
  skyTop: "#05070B",
  skyMid: "#0A0E15",
  skyLow: "#111725",
  treeFar: "#0B1019",
  spruce: "#06090C",
  lawnTop: "#0E1311",
  lawnBottom: "#080B0A",
  drive: "#191B1F",
  driveFar: "#111316",
  foundation: "#1E1F22",
  foundationTop: "#2A2B2F",
  wall: "#2B2722",
  wallUpper: "#282420",
  gable: "#302B26",
  wing: "#2D2924",
  bay: "#322D27",
  trim: "#464036",
  trimLight: "#524C40",
  glassTop: "#151C26",
  glassBottom: "#0A0E13",
  garage: "#35312A",
  garageLine: "#26231D",
  garageLight: "#413C35",
  door: "#2B231C",
  roof: "#15181D",
  roofTop: "#1C2028",
  shingle: "#0D0F13",
  ridge: "#252A33",
  fascia: "#2D2A25",
  socket: "#50493C",
  chimney: "#1C1C20",
  chimneyCap: "#2B2B30",
  shrub: "#0C150F",
  shrubLight: "#132019",
  bulbCore: "#FFF6E2",
  fasciaGlow: "#F4CF94",
};

type Ids = (name: string) => string;
const idCache = new Map<string, Ids>();
/** Stable per prefix, so the memoised layers skip re-rendering on every frame. */
const idsFor = (prefix: string): Ids => {
  let ids = idCache.get(prefix);
  if (!ids) {
    ids = (name) => `${prefix}-${name}`;
    idCache.set(prefix, ids);
  }
  return ids;
};
const url = (id: string) => `url(#${id})`;

/* ------------------------------------------------------------------ setting */

const STARS = (() => {
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const stars: { x: number; y: number; r: number; o: number }[] = [];
  while (stars.length < 46) {
    const x = -1500 + rand() * 4300;
    const y = -1900 + rand() * 2400;
    const r = 0.8 + rand() * 1;
    const o = 0.14 + rand() * 0.32;
    if (x > 500 && x < 1640 && y > 220) continue;
    stars.push({ x: Math.round(x), y: Math.round(y), r: Math.round(r * 10) / 10, o: Math.round(o * 100) / 100 });
  }
  return stars;
})();

const TREE_LINE = (() => {
  let seed = 5;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pts: string[] = [`-3200,${GROUND_Y + 12}`];
  for (let x = -3200; x <= 4400; x += 22 + rand() * 26) {
    const h = 34 + rand() * 70 + (rand() > 0.82 ? 50 : 0);
    pts.push(`${Math.round(x)},${Math.round(GROUND_Y - h)}`);
    pts.push(`${Math.round(x + 11)},${Math.round(GROUND_Y - h * 0.42)}`);
  }
  pts.push(`4400,${GROUND_Y + 12}`);
  return pts.join(" ");
})();

function sprucePoints(cx: number, base: number, height: number, width: number) {
  const tiers = 8;
  const top = base - height;
  const tierH = (height * 0.9) / tiers;
  const right: string[] = [];
  for (let i = 1; i <= tiers; i++) {
    const y = top + tierH * i;
    const half = (width / 2) * (0.22 + 0.78 * (i / tiers));
    right.push(`${cx + half},${y}`);
    if (i < tiers) right.push(`${cx + half * 0.5},${y + tierH * 0.12}`);
  }
  const left = right.map((p) => {
    const [x, y] = p.split(",").map(Number);
    return `${2 * cx - x},${y}`;
  });
  return [`${cx},${top}`, ...right, `${cx + 7},${base}`, `${cx - 7},${base}`, ...left.reverse()].join(" ");
}

const Setting = memo(function Setting({ ids }: { ids: Ids }) {
  return (
    <g>
      <rect x={-6000} y={-6000} width={14000} height={6000 + GROUND_Y + 10} fill={url(ids("sky"))} />
      <ellipse cx={1080} cy={GROUND_Y} rx={1700} ry={260} fill={url(ids("horizon"))} />
      <g fill="#E9EEF7">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
        ))}
      </g>
      <polygon points={TREE_LINE} fill={C.treeFar} />
      <rect x={-6000} y={GROUND_Y - 2} width={14000} height={6000} fill={url(ids("lawn"))} />
      <polygon points={`598,${GROUND_Y} 842,${GROUND_Y} 1010,1600 380,1600`} fill={url(ids("drive"))} />
      <polygon points={`1052,${GROUND_Y} 1112,${GROUND_Y} 1160,1600 1006,1600`} fill={url(ids("drive"))} opacity={0.85} />
      <ellipse cx={1066} cy={GROUND_Y + 6} rx={560} ry={22} fill="#000" opacity={0.35} />
      <polygon points={sprucePoints(452, GROUND_Y + 6, 360, 150)} fill={C.spruce} />
      <polygon points={sprucePoints(1688, GROUND_Y + 6, 400, 170)} fill={C.spruce} />
      <polygon points={sprucePoints(1790, GROUND_Y + 8, 300, 128)} fill={C.spruce} />
    </g>
  );
});

/* -------------------------------------------------------------------- house */

function Window({
  ids,
  x,
  y,
  w,
  h,
  cols = 2,
  rows = 2,
  arch = false,
}: {
  ids: Ids;
  x: number;
  y: number;
  w: number;
  h: number;
  cols?: number;
  rows?: number;
  arch?: boolean;
}) {
  const r = w / 2;
  const shape = arch
    ? `M${x} ${y + h} L${x} ${y + r} A${r} ${r} 0 0 1 ${x + w} ${y + r} L${x + w} ${y + h} Z`
    : `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
  const bars: ReactNode[] = [];
  for (let c = 1; c < cols; c++) {
    const bx = x + (w * c) / cols;
    bars.push(<line key={`c${c}`} x1={bx} y1={y + (arch ? r * 0.35 : 0)} x2={bx} y2={y + h} />);
  }
  for (let r2 = 1; r2 < rows; r2++) {
    const by = y + (h * r2) / rows + (arch ? r * 0.3 : 0);
    bars.push(<line key={`r${r2}`} x1={x} y1={by} x2={x + w} y2={by} />);
  }
  return (
    <g>
      <path d={shape} fill={url(ids("glass"))} stroke={C.trim} strokeWidth={6} />
      <path d={shape} fill={url(ids("glint"))} />
      <g stroke={C.trim} strokeWidth={2.5}>{bars}</g>
      <rect x={x - 7} y={y + h + 3} width={w + 14} height={6} fill={C.trimLight} />
    </g>
  );
}

function SoffitShadow({ polygon, depth }: { polygon: Polygon; depth: number }) {
  const [[x1, y1], [px, py], [x2, y2]] = polygon;
  const inner = [
    [x1 + depth * 1.2, y1],
    [px, py + depth * 1.4],
    [x2 - depth * 1.2, y2],
  ];
  return (
    <polygon
      points={`${x1},${y1} ${px},${py} ${x2},${y2} ${inner.map((p) => p.join(",")).reverse().join(" ")}`}
      fill="#000"
      opacity={0.32}
    />
  );
}

const Foundation = memo(function Foundation() {
  return (
    <g>
      <rect x={566} y={842} width={994} height={GROUND_Y + 2 - 842} fill={C.foundation} />
      <rect x={566} y={842} width={994} height={3} fill={C.foundationTop} />
      <rect x={1036} y={846} width={92} height={8} fill={C.foundationTop} />
      <rect x={1028} y={854} width={108} height={8} fill={C.foundation} />
    </g>
  );
});

const BackRoof = memo(function BackRoof({ ids }: { ids: Ids }) {
  const { x, y, width, height, capOverhang } = CHIMNEY;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={C.chimney} />
      <g stroke="#141417" strokeWidth={1.5}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={i} x1={x} y1={y + 14 + i * 16} x2={x + width} y2={y + 14 + i * 16} />
        ))}
      </g>
      <rect x={x - capOverhang} y={y - 6} width={width + capOverhang * 2} height={10} fill={C.chimneyCap} />
      <polygon points={points(BACK_ROOFS.main)} fill={url(ids("roof"))} />
      <polygon points={points(BACK_ROOFS.main)} fill={url(ids("shingles"))} />
      <line x1={748} y1={332} x2={1268} y2={332} stroke={C.ridge} strokeWidth={3} />
    </g>
  );
});

const Facade = memo(function Facade({ ids }: { ids: Ids }) {
  return (
    <g>
      <polygon points={points(WALLS.upper)} fill={C.wallUpper} />
      <rect x={690} y={446} width={652} height={36} fill={url(ids("eave-shade"))} />
      <polygon points={points(WALLS.leftGable)} fill={C.gable} />
      <polygon points={points(WALLS.centreGable)} fill={C.gable} />
      <SoffitShadow polygon={[[690, 446], [815, 312], [940, 446]]} depth={14} />
      <SoffitShadow polygon={[[984, 446], [1060, 374], [1136, 446]]} depth={12} />
      <g fill="#000" opacity={0.28}>
        <rect x={940} y={446} width={8} height={146} />
        <rect x={1136} y={446} width={8} height={146} />
      </g>

      <polygon points={points(WALLS.ground)} fill={C.wall} />
      <rect x={574} y={652} width={768} height={44} fill={url(ids("eave-shade"))} />

      <polygon points={points(WALLS.wing)} fill={C.wing} />
      <SoffitShadow polygon={[[1342, 446], [1447, 326], [1552, 446]]} depth={14} />
      <g fill={C.trim} opacity={0.75}>
        <rect x={574} y={652} width={8} height={190} />
        <rect x={1342} y={446} width={8} height={396} />
        <rect x={1544} y={446} width={8} height={396} />
        <rect x={690} y={446} width={7} height={146} />
        <rect x={933} y={446} width={7} height={146} />
      </g>

      {/* garage */}
      <rect x={594} y={684} width={252} height={158} fill={C.trim} />
      <rect x={600} y={690} width={240} height={152} fill={C.garage} />
      <g>
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2, 3].map((col) => {
            const px = 606 + col * 58.5;
            const py = 696 + row * 36.5;
            return (
              <g key={`${row}-${col}`}>
                <rect x={px} y={py} width={52} height={30} fill={C.garageLine} />
                <rect x={px + 3} y={py + 3} width={46} height={24} fill={C.garage} />
                <rect x={px + 3} y={py + 3} width={46} height={2} fill={C.garageLight} />
              </g>
            );
          }),
        )}
      </g>

      {/* porch, door and ground-floor windows */}
      <rect x={862} y={836} width={288} height={8} fill={C.foundationTop} />
      <Window ids={ids} x={918} y={698} w={76} h={92} />
      <rect x={1056} y={686} width={62} height={150} fill={C.trim} />
      <rect x={1062} y={692} width={50} height={144} fill={C.door} />
      <rect x={1070} y={702} width={34} height={54} fill={url(ids("glass"))} />
      <rect x={1070} y={770} width={34} height={56} fill="none" stroke="#221C16" strokeWidth={2} />
      <circle cx={1103} cy={766} r={2.6} fill={C.trimLight} />
      <rect x={1122} y={692} width={14} height={144} fill={url(ids("glass"))} stroke={C.trim} strokeWidth={4} />
      <Window ids={ids} x={1186} y={698} w={76} h={92} />
      {[876, 1016].map((x) => (
        <g key={x}>
          <rect x={x} y={662} width={18} height={164} fill={C.trimLight} />
          <rect x={x + 12} y={662} width={6} height={164} fill="#000" opacity={0.18} />
          <rect x={x - 5} y={654} width={28} height={10} fill={C.trimLight} />
          <rect x={x - 5} y={822} width={28} height={14} fill={C.trimLight} />
        </g>
      ))}

      {/* upper storey */}
      <Window ids={ids} x={774} y={470} w={82} h={94} />
      <Window ids={ids} x={797} y={366} w={36} h={54} cols={1} rows={1} arch />
      <Window ids={ids} x={1032} y={466} w={56} h={100} cols={2} rows={2} arch />
      <Window ids={ids} x={1194} y={476} w={50} h={74} cols={1} rows={2} />

      {/* right wing */}
      <Window ids={ids} x={1407} y={474} w={80} h={92} />
      <Window ids={ids} x={1429} y={384} w={36} h={44} cols={1} rows={1} />
      <polygon points={points(WALLS.bay)} fill={C.bay} />
      <rect x={1362} y={680} width={170} height={34} fill={url(ids("eave-shade"))} />
      <Window ids={ids} x={1376} y={700} w={40} h={104} cols={1} rows={2} />
      <Window ids={ids} x={1428} y={700} w={38} h={104} cols={1} rows={2} />
      <Window ids={ids} x={1478} y={700} w={40} h={104} cols={1} rows={2} />
    </g>
  );
});

const FrontRoof = memo(function FrontRoof({ ids }: { ids: Ids }) {
  return (
    <g>
      {Object.values(FRONT_ROOFS).map((roof, i) => (
        <g key={i}>
          <polygon points={points(roof)} fill={url(ids("roof"))} />
          <polygon points={points(roof)} fill={url(ids("shingles"))} />
        </g>
      ))}
      <line x1={552} y1={653} x2={646} y2={588} stroke={C.ridge} strokeWidth={2.5} />
      <line x1={646} y1={589} x2={1352} y2={589} stroke="#000" strokeWidth={3} opacity={0.4} />
      <g fill="none" stroke={C.fascia} strokeWidth={9} strokeLinejoin="round">
        {FASCIAS.map((line, i) => (
          <polyline key={i} points={points(line)} />
        ))}
      </g>
      <g fill={C.socket}>
        {BULBS.map((bulb, i) => (
          <circle key={i} cx={bulb.x} cy={bulb.y} r={2.6} />
        ))}
      </g>
    </g>
  );
});

const SHRUBS: [number, number, number][] = [
  [552, 846, 22], [578, 852, 16],
  [852, 842, 20], [880, 850, 16], [930, 846, 24], [968, 850, 20], [1004, 848, 18],
  [1146, 846, 18], [1180, 842, 26], [1222, 848, 22], [1262, 846, 24], [1300, 850, 18],
  [1368, 846, 26], [1410, 850, 20], [1452, 844, 24], [1496, 850, 22], [1536, 846, 26], [1570, 852, 18],
];

const Shrubs = memo(function Shrubs() {
  return (
    <g>
      {SHRUBS.map(([cx, cy, r], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r={r} fill={C.shrub} />
          <circle cx={cx - r * 0.25} cy={cy - r * 0.35} r={r * 0.55} fill={C.shrubLight} opacity={0.7} />
        </g>
      ))}
    </g>
  );
});

/* -------------------------------------------------------------- assembly */

function Reveal({
  id,
  progress,
  top,
  bottom,
  rise,
  children,
}: {
  id: string;
  progress: number;
  top: number;
  bottom: number;
  rise: number;
  children: ReactNode;
}) {
  if (progress >= 1) return <g>{children}</g>;
  const feather = 46;
  const edge = bottom + feather - (bottom - top + feather * 2) * progress;
  return (
    <g mask={url(id)} opacity={Math.min(1, progress * 2.5)}>
      <mask id={id} maskUnits="userSpaceOnUse" x={-6000} y={-6000} width={14000} height={14000}>
        <linearGradient id={`${id}-edge`} gradientUnits="userSpaceOnUse" x1={0} y1={edge} x2={0} y2={edge + feather}>
          <stop offset={0} stopColor="#000" />
          <stop offset={1} stopColor="#fff" />
        </linearGradient>
        <rect x={-6000} y={edge} width={14000} height={6000} fill={url(`${id}-edge`)} />
      </mask>
      <g transform={`translate(0 ${((1 - progress) * rise).toFixed(2)})`}>{children}</g>
    </g>
  );
}

/* ------------------------------------------------------------------ lights */

function Lights({ ids, intensities, bulbScale }: { ids: Ids; intensities: ArrayLike<number>; bulbScale: number }) {
  const spill: ReactNode[] = [];
  const glow: ReactNode[] = [];
  const bulbs: ReactNode[] = [];

  BULBS.forEach((bulb, i) => {
    const raw = intensities[i] ?? 0;
    const v = Math.min(1, raw);
    if (v <= 0.004) return;
    const className = i === 0 ? "light is-first" : "light";
    spill.push(
      <ellipse
        key={i}
        className={className}
        cx={bulb.x}
        cy={bulb.y + 30}
        rx={54}
        ry={62}
        fill={url(ids("spill"))}
        opacity={(v * 0.34).toFixed(3)}
      />,
    );
    if (bulb.prev >= 0) {
      const joined = Math.min(v, intensities[bulb.prev] ?? 0, 1);
      if (joined > 0.004) {
        glow.push(
          <line
            key={i}
            className="light"
            x1={BULBS[bulb.prev].x}
            y1={BULBS[bulb.prev].y}
            x2={bulb.x}
            y2={bulb.y}
            opacity={(joined * 0.55).toFixed(3)}
          />,
        );
      }
    }
    const k = bulbScale;
    bulbs.push(
      <g key={i} className={className}>
        {raw > 1 && <circle cx={bulb.x} cy={bulb.y} r={48 * k} fill={url(ids("halo"))} opacity={Math.min(1, (raw - 1) * 1.9).toFixed(3)} />}
        <circle cx={bulb.x} cy={bulb.y} r={12 * k * (0.7 + 0.3 * Math.min(raw, 1.5))} fill={url(ids("halo"))} opacity={v.toFixed(3)} />
        <circle cx={bulb.x} cy={bulb.y} r={3.3 * k} fill={C.bulbCore} opacity={v.toFixed(3)} />
      </g>,
    );
  });

  return (
    <g className="scene-lights">
      <g clipPath={url(ids("house"))} style={{ mixBlendMode: "screen" }}>
        {spill}
      </g>
      <g stroke={C.fasciaGlow} strokeWidth={3} strokeLinecap="round">
        {glow}
      </g>
      {bulbs}
    </g>
  );
}

/* ------------------------------------------------------------------- scene */

const Defs = memo(function Defs({ ids }: { ids: Ids }) {
  return (
    <defs>
      <linearGradient id={ids("sky")} gradientUnits="userSpaceOnUse" x1={0} y1={-1900} x2={0} y2={GROUND_Y}>
        <stop offset={0} stopColor={C.skyTop} />
        <stop offset={0.62} stopColor={C.skyMid} />
        <stop offset={1} stopColor={C.skyLow} />
      </linearGradient>
      <radialGradient id={ids("horizon")}>
        <stop offset={0} stopColor="#1C2536" stopOpacity={0.55} />
        <stop offset={1} stopColor="#1C2536" stopOpacity={0} />
      </radialGradient>
      <linearGradient id={ids("lawn")} gradientUnits="userSpaceOnUse" x1={0} y1={GROUND_Y} x2={0} y2={GROUND_Y + 420}>
        <stop offset={0} stopColor={C.lawnTop} />
        <stop offset={1} stopColor={C.lawnBottom} />
      </linearGradient>
      <linearGradient id={ids("drive")} gradientUnits="userSpaceOnUse" x1={0} y1={GROUND_Y} x2={0} y2={GROUND_Y + 400}>
        <stop offset={0} stopColor={C.drive} />
        <stop offset={1} stopColor={C.driveFar} />
      </linearGradient>
      <linearGradient id={ids("roof")} x1={0} y1={0} x2={0} y2={1}>
        <stop offset={0} stopColor={C.roofTop} />
        <stop offset={1} stopColor={C.roof} />
      </linearGradient>
      <pattern id={ids("shingles")} patternUnits="userSpaceOnUse" width={28} height={11}>
        <rect y={10} width={28} height={1} fill={C.shingle} opacity={0.75} />
        <rect x={13} y={0} width={1} height={10} fill={C.shingle} opacity={0.35} />
      </pattern>
      <linearGradient id={ids("eave-shade")} x1={0} y1={0} x2={0} y2={1}>
        <stop offset={0} stopColor="#000" stopOpacity={0.4} />
        <stop offset={1} stopColor="#000" stopOpacity={0} />
      </linearGradient>
      <linearGradient id={ids("glass")} x1={0} y1={0} x2={0} y2={1}>
        <stop offset={0} stopColor={C.glassTop} />
        <stop offset={1} stopColor={C.glassBottom} />
      </linearGradient>
      <linearGradient id={ids("glint")} x1={0} y1={0} x2={1} y2={1}>
        <stop offset={0.2} stopColor="#9FB3CC" stopOpacity={0} />
        <stop offset={0.45} stopColor="#9FB3CC" stopOpacity={0.07} />
        <stop offset={0.6} stopColor="#9FB3CC" stopOpacity={0} />
      </linearGradient>
      <radialGradient id={ids("halo")}>
        <stop offset={0} stopColor="#FFF1CF" stopOpacity={0.95} />
        <stop offset={0.28} stopColor="#FFD28A" stopOpacity={0.5} />
        <stop offset={0.62} stopColor="#F2AE57" stopOpacity={0.14} />
        <stop offset={1} stopColor="#F2AE57" stopOpacity={0} />
      </radialGradient>
      <radialGradient id={ids("spill")}>
        <stop offset={0} stopColor="#FFC97C" stopOpacity={0.6} />
        <stop offset={0.55} stopColor="#E9A95A" stopOpacity={0.2} />
        <stop offset={1} stopColor="#E9A95A" stopOpacity={0} />
      </radialGradient>
      <clipPath id={ids("house")}>
        {SILHOUETTE.map((shape, i) => (
          <polygon key={i} points={points(shape)} />
        ))}
      </clipPath>
    </defs>
  );
});

export type HouseSceneProps = {
  viewBox: string;
  preserveAspectRatio?: string;
  assembly: Assembly;
  intensities: ArrayLike<number>;
  bulbScale?: number;
  /** Unique per instance: the poster and the Player share one document. */
  idPrefix: string;
  className?: string;
};

export function HouseScene({
  viewBox,
  preserveAspectRatio = "xMidYMid slice",
  assembly,
  intensities,
  bulbScale = 1,
  idPrefix,
  className,
}: HouseSceneProps) {
  const ids = idsFor(idPrefix);
  return (
    <svg
      className={className}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <Defs ids={ids} />
      <Setting ids={ids} />
      <g className="scene-house">
        <Reveal id={ids("rise-foundation")} progress={assembly.foundation} top={836} bottom={866} rise={8}>
          <Foundation />
        </Reveal>
        <Reveal id={ids("rise-back-roof")} progress={assembly.roof} top={250} bottom={452} rise={12}>
          <BackRoof ids={ids} />
        </Reveal>
        <Reveal id={ids("rise-facade")} progress={assembly.facade} top={300} bottom={846} rise={16}>
          <Facade ids={ids} />
        </Reveal>
        <Reveal id={ids("rise-front-roof")} progress={assembly.roof} top={284} bottom={676} rise={12}>
          <FrontRoof ids={ids} />
        </Reveal>
        <Reveal id={ids("rise-shrubs")} progress={assembly.shrubs} top={786} bottom={874} rise={10}>
          <Shrubs />
        </Reveal>
      </g>
      <Lights ids={ids} intensities={intensities} bulbScale={bulbScale} />
    </svg>
  );
}

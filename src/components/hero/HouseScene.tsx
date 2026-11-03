import { memo, type ReactNode } from "react";
import houseNight from "@/assets/hero/house-night.webp";
import { BULBS, PHOTO_H, PHOTO_W, SILHOUETTE, points } from "./geometry";

const C = {
  bulbCore: "#FFF6E2",
  fasciaGlow: "#F4CF94",
};

type Ids = (name: string) => string;
const idCache = new Map<string, Ids>();
const idsFor = (prefix: string): Ids => {
  let ids = idCache.get(prefix);
  if (!ids) {
    ids = (name) => `${prefix}-${name}`;
    idCache.set(prefix, ids);
  }
  return ids;
};
const url = (id: string) => `url(#${id})`;

const photoSrc = typeof houseNight === "string" ? houseNight : houseNight.src;

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
        cy={bulb.y + 28}
        rx={48}
        ry={56}
        fill={url(ids("spill"))}
        opacity={(v * 0.38).toFixed(3)}
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
            opacity={(joined * 0.6).toFixed(3)}
          />,
        );
      }
    }
    const k = bulbScale;
    bulbs.push(
      <g key={i} className={className}>
        {raw > 1 && (
          <circle
            cx={bulb.x}
            cy={bulb.y}
            r={44 * k}
            fill={url(ids("halo"))}
            opacity={Math.min(1, (raw - 1) * 1.9).toFixed(3)}
          />
        )}
        <circle
          cx={bulb.x}
          cy={bulb.y}
          r={11 * k * (0.7 + 0.3 * Math.min(raw, 1.5))}
          fill={url(ids("halo"))}
          opacity={v.toFixed(3)}
        />
        <circle cx={bulb.x} cy={bulb.y} r={3 * k} fill={C.bulbCore} opacity={v.toFixed(3)} />
      </g>,
    );
  });

  return (
    <g className="scene-lights">
      <g clipPath={url(ids("house"))} style={{ mixBlendMode: "screen" }}>
        {spill}
      </g>
      <g stroke={C.fasciaGlow} strokeWidth={2.5} strokeLinecap="round">
        {glow}
      </g>
      {bulbs}
    </g>
  );
}

const Defs = memo(function Defs({ ids }: { ids: Ids }) {
  return (
    <defs>
      <radialGradient id={ids("halo")}>
        <stop offset={0} stopColor="#FFF1CF" stopOpacity={0.95} />
        <stop offset={0.28} stopColor="#FFD28A" stopOpacity={0.5} />
        <stop offset={0.62} stopColor="#F2AE57" stopOpacity={0.14} />
        <stop offset={1} stopColor="#F2AE57" stopOpacity={0} />
      </radialGradient>
      <radialGradient id={ids("spill")}>
        <stop offset={0} stopColor="#FFC97C" stopOpacity={0.55} />
        <stop offset={0.55} stopColor="#E9A95A" stopOpacity={0.18} />
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
  intensities: ArrayLike<number>;
  bulbScale?: number;
  /** Unique per instance: the poster and the Player share one document. */
  idPrefix: string;
  className?: string;
};

export function HouseScene({
  viewBox,
  preserveAspectRatio = "xMidYMid slice",
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
      <rect className="scene-fill" x={-8000} y={-8000} width={20000} height={20000} fill="#0B0E13" />
      <image className="scene-photo" href={photoSrc} x={0} y={0} width={PHOTO_W} height={PHOTO_H} />
      <Lights ids={ids} intensities={intensities} bulbScale={bulbScale} />
    </svg>
  );
}

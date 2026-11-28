import type { CSSProperties } from "react";
import { logoGeometry } from "@/content/logo";

const scatter = (i: number, r: number) => ({
  x: Math.round(Math.cos(i * 2.39996 + 0.6) * r * (0.75 + ((i * 37) % 10) / 20)),
  y: Math.round(Math.sin(i * 2.39996 + 0.6) * r * (0.75 + ((i * 53) % 10) / 20)),
});

export function LogoMark({
  className = "size-7",
  title,
  animated = false,
  burst = 0,
}: {
  className?: string;
  title?: string;
  animated?: boolean;
  burst?: number;
}) {
  const { lines, nodes, ink, amber } = logoGeometry;
  const cls = animated ? `ev-logo${burst > 0 ? " ev-burst" : ""}` : "";
  return (
    <svg
      key={burst}
      viewBox="0 0 64 64"
      className={`${className} ${cls} overflow-visible`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {lines.map(([x1, y1, x2, y2], i) => {
        const len = Math.hypot(x2 - x1, y2 - y1);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={ink}
            strokeWidth={3.6}
            strokeLinecap="round"
            className="ev-line"
            style={{ "--len": len, "--i": i, strokeDasharray: len } as CSSProperties}
          />
        );
      })}
      {nodes.map(([x, y], i) => {
        const a = scatter(i, 26);
        const b = scatter(i + 3, 18);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={3.2}
            fill={ink}
            className="ev-node"
            style={{ "--dx": `${a.x}px`, "--dy": `${a.y}px`, "--bx": `${b.x}px`, "--by": `${b.y}px`, "--i": i } as CSSProperties}
          />
        );
      })}
      <circle cx={43} cy={46} r={8} fill="none" stroke={amber} strokeOpacity={0.4} strokeWidth={1.6} className="ev-ring" />
      <circle cx={43} cy={46} r={4.8} fill={amber} className="ev-core" />
    </svg>
  );
}

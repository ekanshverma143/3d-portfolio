import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

export function ogImage({ eyebrow, title, footer }: { eyebrow: string; title: string; footer: string }) {
  const dots = Array.from({ length: 42 }, (_, i) => {
    const a = i * 2.39996;
    const r = 40 + Math.sqrt(i) * 34;
    return { x: 960 + Math.cos(a) * r, y: 300 + Math.sin(a) * r * 0.8, s: i % 7 === 0 ? 9 : 4 };
  });
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#08090b",
          color: "#e8e6e1",
          padding: "72px 80px",
          position: "relative",
        }}
      >
        {dots.map((d, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: d.x,
              top: d.y,
              width: d.s,
              height: d.s,
              borderRadius: 999,
              background: i === 0 ? "#ffb35c" : i % 7 === 0 ? "#e8e6e1" : "#4a515e",
            }}
          />
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: "#8d9099", letterSpacing: 3 }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: "#ffb35c" }} />
          {eyebrow.toUpperCase()}
        </div>
        <div style={{ display: "flex", fontSize: title.length > 60 ? 58 : 70, lineHeight: 1.08, letterSpacing: -2, maxWidth: 820 }}>
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#8d9099" }}>{footer}</div>
      </div>
    ),
    ogSize,
  );
}

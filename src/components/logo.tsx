import { logoGeometry } from "@/content/logo";

export function LogoMark({ className = "size-7", title }: { className?: string; title?: string }) {
  const { lines, nodes, ink, amber } = logoGeometry;
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {lines.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeWidth={3.6} strokeLinecap="round" />
      ))}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.2} fill={ink} />
      ))}
      <circle cx={43} cy={46} r={8} fill="none" stroke={amber} strokeOpacity={0.4} strokeWidth={1.6} className="origin-[43px_46px] animate-pulse motion-reduce:animate-none" />
      <circle cx={43} cy={46} r={4.8} fill={amber} />
    </svg>
  );
}

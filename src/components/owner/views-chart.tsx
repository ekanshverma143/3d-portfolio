"use client";

import { useEffect, useRef, useState } from "react";

const VIEWS = "#5b84d6";
const VIEWS_HOVER = "#7f9fe4";
const VISITORS = "#cf8a35";
const SURFACE = "#0f1114";
const M = { t: 14, r: 12, b: 28, l: 38 };

const fmtDay = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function niceMax(v: number) {
  if (v <= 4) return 4;
  const mag = 10 ** Math.floor(Math.log10(v));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : 10;
  return step * mag;
}

function barPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function ViewsChart({ days, views, visitors }: { days: string[]; views: number[]; visitors: number[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [W, setW] = useState(720);
  const ref = useRef<SVGSVGElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 500 ? 220 : 260;
  const n = days.length;
  const max = niceMax(Math.max(...views, ...visitors, 1));
  const plotW = W - M.l - M.r;
  const plotH = H - M.t - M.b;
  const band = plotW / n;
  const barW = Math.max(2, Math.min(26, band - 2));
  const y = (v: number) => M.t + plotH - (v / max) * plotH;
  const cx = (i: number) => M.l + i * band + band / 2;
  const every = Math.ceil(n / Math.max(3, Math.floor(W / 110)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const linePts = visitors.map((v, i) => `${cx(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const empty = views.every((v) => v === 0);

  const onMove = (e: React.PointerEvent) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((e.clientX - box.left) / box.width) * W;
    const i = Math.floor((x - M.l) / band);
    setActive(i >= 0 && i < n ? i : null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-[3px]" style={{ background: VIEWS }} />
          Page views
        </span>
        <span className="flex items-center gap-2">
          <svg width="22" height="10" aria-hidden>
            <line x1="1" y1="5" x2="21" y2="5" stroke={VISITORS} strokeWidth="2" />
            <circle cx="11" cy="5" r="3.5" fill={VISITORS} stroke={SURFACE} strokeWidth="1.5" />
          </svg>
          Unique visitors
        </span>
      </div>

      <div ref={wrap} className="relative mt-4">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="block h-auto w-full max-w-full touch-none select-none"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setActive(null)}
          role="img"
          aria-label={`Daily page views and unique visitors for the last ${n} days`}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="#1d2026" strokeWidth={1} />
              <text x={M.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="#8d9099" fontFamily="var(--font-geist-mono)">
                {t}
              </text>
            </g>
          ))}
          {active !== null && (
            <line x1={cx(active)} x2={cx(active)} y1={M.t} y2={M.t + plotH} stroke="#3a404c" strokeWidth={1} strokeDasharray="3 3" />
          )}
          {views.map((v, i) => (
            <path
              key={days[i]}
              d={barPath(cx(i) - barW / 2, y(v), barW, M.t + plotH - y(v))}
              fill={active === i ? VIEWS_HOVER : VIEWS}
              fillOpacity={active === null || active === i ? 1 : 0.55}
            />
          ))}
          <polyline points={linePts} fill="none" stroke={VISITORS} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {active !== null && (
            <circle cx={cx(active)} cy={y(visitors[active])} r={4.5} fill={VISITORS} stroke={SURFACE} strokeWidth={2} />
          )}
          {days.map((d, i) =>
            i % every === 0 || i === n - 1 ? (
              <text key={d} x={cx(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#8d9099" fontFamily="var(--font-geist-mono)">
                {fmtDay(d)}
              </text>
            ) : null,
          )}
          <line x1={M.l} x2={W - M.r} y1={M.t + plotH} y2={M.t + plotH} stroke="#2a2e36" strokeWidth={1} />
        </svg>

        {empty && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted">
            No visits recorded in this period yet.
          </p>
        )}

        {active !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-xl border border-line-strong bg-ink/95 px-3 py-2 text-sm shadow-xl"
            style={{
              left: `${(cx(active) / W) * 100}%`,
              transform: `translateX(${cx(active) / W > 0.7 ? "-105%" : "8px"})`,
            }}
          >
            <p className="font-mono text-[11px] text-muted">{fmtDay(days[active])}</p>
            <p className="mt-1 flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[2px]" style={{ background: VIEWS }} /> Views
              </span>
              <span className="font-medium tabular-nums">{views[active]}</span>
            </p>
            <p className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: VISITORS }} /> Visitors
              </span>
              <span className="font-medium tabular-nums">{visitors[active]}</span>
            </p>
          </div>
        )}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted hover:text-fg">View as table</summary>
        <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-line">
          <table className="w-full text-left tabular-nums">
            <thead className="sticky top-0 bg-panel text-muted">
              <tr>
                <th className="px-3 py-2 font-normal">Day</th>
                <th className="px-3 py-2 text-right font-normal">Views</th>
                <th className="px-3 py-2 text-right font-normal">Visitors</th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((d, ri) => {
                const i = n - 1 - ri;
                return (
                  <tr key={d} className="border-t border-line">
                    <td className="px-3 py-1.5">{fmtDay(d)}</td>
                    <td className="px-3 py-1.5 text-right">{views[i]}</td>
                    <td className="px-3 py-1.5 text-right">{visitors[i]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

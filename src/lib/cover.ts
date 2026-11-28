const W = 1200;
const H = 630;
const AMBER = "#ffb35c";
const BG = "#0f1114";

type Theme = "graph" | "wave" | "clusters" | "bars" | "chart" | "grid" | "code" | "diff";

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function themeFor(tags: string[], slug = ""): Theme {
  const has = (...names: string[]) => tags.some((t) => names.includes(t));
  if (has("Realtime voice", "WebRTC")) return "wave";
  if (has("Search", "Embeddings", "RAG")) return "clusters";
  if (has("Cost", "Prompt caching", "Payments")) return "bars";
  if (has("Evals", "Observability")) return "chart";
  if (has("Security")) return "grid";
  if (has("Developer tools")) return (["code", "diff", "graph"] as const)[hash(`f${slug}`) % 3];
  return "graph";
}

const f = (n: number) => Math.round(n * 10) / 10;

function graph(r: () => number) {
  const cx = 720 + (r() - 0.5) * 80;
  const cy = 315 + (r() - 0.5) * 40;
  const out: string[] = [];
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2;
    const d = 120 + r() * 300;
    pts.push([cx + Math.cos(a) * d * 1.35, cy + Math.sin(a) * d * 0.72]);
  }
  const tools: Array<[number, number]> = [];
  const n = 7 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.4;
    tools.push([cx + Math.cos(a) * 170, cy + Math.sin(a) * 105]);
  }
  pts.forEach((p, i) => {
    const near = pts
      .map((q, j) => [Math.hypot(p[0] - q[0], p[1] - q[1]), j] as const)
      .filter(([, j]) => j !== i)
      .sort((a, b) => a[0] - b[0])
      .slice(0, 2);
    near.forEach(([, j]) => out.push(`<line x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(pts[j][0])}" y2="${f(pts[j][1])}" stroke="#2a2f38" stroke-width="1.4"/>`));
  });
  tools.forEach((t) => {
    const near = pts
      .map((q) => [Math.hypot(t[0] - q[0], t[1] - q[1]), q] as const)
      .sort((a, b) => a[0] - b[0])
      .slice(0, 2);
    near.forEach(([, q]) => out.push(`<line x1="${f(t[0])}" y1="${f(t[1])}" x2="${f(q[0])}" y2="${f(q[1])}" stroke="#343a45" stroke-width="1.4"/>`));
    out.push(`<line x1="${f(cx)}" y1="${f(cy)}" x2="${f(t[0])}" y2="${f(t[1])}" stroke="${AMBER}" stroke-opacity="0.35" stroke-width="1.6"/>`);
  });
  pts.forEach((p) => out.push(`<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(2 + r() * 2.5)}" fill="#8a93a3" fill-opacity="${f(0.45 + r() * 0.5)}"/>`));
  tools.forEach((t, i) => {
    out.push(`<circle cx="${f(t[0])}" cy="${f(t[1])}" r="6" fill="#e8e6e1"/>`);
    if (i % 3 === 0) {
      const k = 0.3 + r() * 0.5;
      out.push(`<circle cx="${f(cx + (t[0] - cx) * k)}" cy="${f(cy + (t[1] - cy) * k)}" r="4" fill="${AMBER}"/>`);
    }
  });
  out.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="34" fill="none" stroke="${AMBER}" stroke-opacity="0.5" stroke-width="1.5"/>`);
  out.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="56" fill="none" stroke="#e8e6e1" stroke-opacity="0.12" stroke-width="1.2"/>`);
  out.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="14" fill="${AMBER}"/>`);
  return { body: out.join(""), glow: [cx, cy] as const };
}

function wave(r: () => number) {
  const out: string[] = [];
  const n = 84;
  const x0 = 150;
  const step = (W - 300) / n;
  const hiStart = 22 + Math.floor(r() * 30);
  const p1 = 0.12 + r() * 0.1;
  const p2 = 0.31 + r() * 0.2;
  out.push(`<line x1="120" y1="315" x2="1080" y2="315" stroke="#2a2f38" stroke-width="1"/>`);
  for (let i = 0; i < n; i++) {
    const env = Math.sin((i / n) * Math.PI) ** 0.8;
    const h = (40 + 190 * env * (0.55 + 0.45 * Math.abs(Math.sin(i * p1) * Math.cos(i * p2)))) * (0.75 + r() * 0.35);
    const hi = i >= hiStart && i < hiStart + 16;
    out.push(`<rect x="${f(x0 + i * step)}" y="${f(315 - h / 2)}" width="5" height="${f(h)}" rx="2.5" fill="${hi ? AMBER : "#3d4452"}" fill-opacity="${hi ? 0.95 : f(0.55 + r() * 0.4)}"/>`);
  }
  const gx = x0 + (hiStart + 8) * step;
  return { body: out.join(""), glow: [gx, 315] as const };
}

function clusters(r: () => number) {
  const out: string[] = [];
  const centers = Array.from({ length: 4 }, () => [260 + r() * 700, 150 + r() * 330] as const);
  const pts: Array<[number, number]> = [];
  centers.forEach(([x, y]) => {
    const s = 38 + r() * 40;
    for (let i = 0; i < 26; i++) {
      const g = () => (r() + r() + r() - 1.5) * s;
      pts.push([x + g() * 1.4, y + g()]);
    }
  });
  const q: [number, number] = [centers[0][0] + 30, centers[0][1] - 10];
  const near = pts
    .map((p) => [Math.hypot(p[0] - q[0], p[1] - q[1]), p] as const)
    .sort((a, b) => a[0] - b[0])
    .slice(0, 6);
  near.forEach(([, p]) => out.push(`<line x1="${f(q[0])}" y1="${f(q[1])}" x2="${f(p[0])}" y2="${f(p[1])}" stroke="${AMBER}" stroke-opacity="0.45" stroke-width="1.4"/>`));
  pts.forEach((p) => out.push(`<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${f(2.5 + r() * 2.5)}" fill="#8a93a3" fill-opacity="${f(0.35 + r() * 0.55)}"/>`));
  [40, 72, 104].forEach((rad, i) =>
    out.push(`<circle cx="${f(q[0])}" cy="${f(q[1])}" r="${rad}" fill="none" stroke="${AMBER}" stroke-opacity="${0.4 - i * 0.12}" stroke-dasharray="4 6" stroke-width="1.3"/>`),
  );
  out.push(`<circle cx="${f(q[0])}" cy="${f(q[1])}" r="9" fill="${AMBER}"/>`);
  return { body: out.join(""), glow: q as readonly [number, number] };
}

function bars(r: () => number) {
  const out: string[] = [];
  const n = 14;
  const bw = 46;
  const gap = 22;
  const x0 = (W - (n * bw + (n - 1) * gap)) / 2;
  const base = 520;
  let y = 330 + r() * 40;
  const tops: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const h = Math.max(40, 360 - i * (16 + r() * 8) + (r() - 0.5) * 50);
    const amber = i >= n - 4;
    const x = x0 + i * (bw + gap);
    out.push(`<rect x="${f(x)}" y="${f(base - h)}" width="${bw}" height="${f(h)}" rx="8" fill="${amber ? AMBER : "#2c323c"}" fill-opacity="${amber ? 0.9 - (n - 1 - i) * 0.12 : 0.9}"/>`);
    tops.push([x + bw / 2, base - h - 18]);
    y = h;
  }
  out.push(`<polyline points="${tops.map(([x, t]) => `${f(x)},${f(t)}`).join(" ")}" fill="none" stroke="#e8e6e1" stroke-opacity="0.35" stroke-width="2"/>`);
  out.push(`<line x1="${f(x0 - 20)}" y1="${base}" x2="${f(W - x0 + 20)}" y2="${base}" stroke="#3a404c" stroke-width="1.5"/>`);
  void y;
  return { body: out.join(""), glow: [W - x0 - 80, 420] as const };
}

function chart(r: () => number) {
  const out: string[] = [];
  const x0 = 130;
  const x1 = 1070;
  const n = 36;
  for (let g = 0; g < 5; g++) out.push(`<line x1="${x0}" y1="${130 + g * 90}" x2="${x1}" y2="${130 + g * 90}" stroke="#20242b" stroke-width="1"/>`);
  out.push(`<line x1="${x0}" y1="250" x2="${x1}" y2="250" stroke="${AMBER}" stroke-opacity="0.45" stroke-dasharray="6 8" stroke-width="1.5"/>`);
  let last: [number, number] = [0, 0];
  [0, 1, 2].forEach((s) => {
    let v = 380 + (r() - 0.5) * 80 - s * 30;
    const pts: string[] = [];
    for (let i = 0; i < n; i++) {
      v += (r() - (s === 0 ? 0.62 : 0.5)) * 28;
      v = Math.min(480, Math.max(160, v));
      const x = x0 + (i / (n - 1)) * (x1 - x0);
      pts.push(`${f(x)},${f(v)}`);
      if (s === 0) last = [x, v];
    }
    out.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${s === 0 ? AMBER : "#4a515e"}" stroke-opacity="${s === 0 ? 0.95 : 0.6}" stroke-width="${s === 0 ? 3 : 2}" stroke-linejoin="round"/>`);
  });
  out.push(`<circle cx="${f(last[0])}" cy="${f(last[1])}" r="7" fill="${AMBER}"/>`);
  out.push(`<circle cx="${f(last[0])}" cy="${f(last[1])}" r="16" fill="none" stroke="${AMBER}" stroke-opacity="0.4" stroke-width="1.5"/>`);
  return { body: out.join(""), glow: last as readonly [number, number] };
}

function grid(r: () => number) {
  const out: string[] = [];
  const cols = 16;
  const rows = 8;
  const s = 44;
  const gap = 12;
  const x0 = (W - (cols * s + (cols - 1) * gap)) / 2;
  const y0 = (H - (rows * s + (rows - 1) * gap)) / 2;
  const path = new Set<string>();
  let cx = 0;
  let cy = Math.floor(r() * rows);
  while (cx < cols) {
    path.add(`${cx},${cy}`);
    if (r() < 0.35 && cy > 0 && cy < rows - 1) cy += r() < 0.5 ? -1 : 1;
    else cx += 1;
    path.add(`${Math.min(cx, cols - 1)},${cy}`);
  }
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const on = path.has(`${x},${y}`);
      const filled = !on && r() < 0.18;
      out.push(
        `<rect x="${f(x0 + x * (s + gap))}" y="${f(y0 + y * (s + gap))}" width="${s}" height="${s}" rx="9" fill="${on ? AMBER : filled ? "#2a2f38" : "none"}" fill-opacity="${on ? 0.85 : 1}" stroke="${on ? "none" : "#262a31"}" stroke-width="1.2"/>`,
      );
    }
  return { body: out.join(""), glow: [W / 2, H / 2] as const };
}

function code(r: () => number) {
  const out: string[] = [];
  const w = 600 + Math.floor(r() * 180);
  const h = 400 + Math.floor(r() * 50);
  const x = Math.round((W - w) / 2 + (r() - 0.5) * 220);
  const y = Math.round((H - h) / 2);
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#12151a" stroke="#2a2f38" stroke-width="1.5"/>`);
  out.push(`<line x1="${x}" y1="${y + 44}" x2="${x + w}" y2="${y + 44}" stroke="#20242b" stroke-width="1.2"/>`);
  ["#3a404c", "#3a404c", AMBER].forEach((c, i) => out.push(`<circle cx="${x + 26 + i * 20}" cy="${y + 22}" r="6" fill="${c}" fill-opacity="${i === 2 ? 0.8 : 1}"/>`));
  let indent = 0;
  let cursor: [number, number] = [0, 0];
  for (let i = 0; i < 12; i++) {
    const ly = y + 72 + i * 29;
    out.push(`<rect x="${x + 22}" y="${ly}" width="18" height="10" rx="3" fill="#262a31"/>`);
    let lx = x + 64 + indent * 28;
    const tokens = 1 + Math.floor(r() * 4);
    for (let t = 0; t < tokens; t++) {
      const tw = 30 + r() * 110;
      if (lx + tw > x + w - 40) break;
      const amber = r() < 0.16;
      out.push(`<rect x="${f(lx)}" y="${ly}" width="${f(tw)}" height="12" rx="6" fill="${amber ? AMBER : t === 0 ? "#4a515e" : "#323843"}" fill-opacity="${amber ? 0.9 : 1}"/>`);
      lx += tw + 12;
    }
    if (i === 8) cursor = [lx, ly - 4];
    const d = r();
    if (d < 0.3 && indent < 3) indent += 1;
    else if (d > 0.75 && indent > 0) indent -= 1;
  }
  out.push(`<rect x="${f(cursor[0])}" y="${f(cursor[1])}" width="3" height="20" fill="${AMBER}"/>`);
  return { body: out.join(""), glow: [x + w - 60, y + h - 40] as const };
}

function diff(r: () => number) {
  const out: string[] = [];
  const x = 170;
  const w = W - 340;
  const lines = 12;
  const lh = 34;
  const y0 = (H - lines * lh) / 2;
  out.push(`<rect x="${x}" y="${y0 - 24}" width="${w}" height="${lines * lh + 48}" rx="18" fill="#12151a" stroke="#2a2f38" stroke-width="1.5"/>`);
  let glow: [number, number] = [W / 2, H / 2];
  for (let i = 0; i < lines; i++) {
    const ly = y0 + i * lh;
    const kind = r();
    const add = kind < 0.32;
    const del = !add && kind < 0.5;
    if (add) {
      out.push(`<rect x="${x + 1}" y="${ly}" width="${w - 2}" height="${lh - 4}" fill="${AMBER}" fill-opacity="0.08"/>`);
      out.push(`<rect x="${x + 22}" y="${ly + 13}" width="12" height="3" fill="${AMBER}"/><rect x="${x + 26.5}" y="${ly + 8.5}" width="3" height="12" fill="${AMBER}"/>`);
      glow = [x + w * 0.6, ly];
    } else if (del) {
      out.push(`<rect x="${x + 22}" y="${ly + 13}" width="12" height="3" fill="#5b5f69"/>`);
    }
    let lx = x + 56 + Math.floor(r() * 3) * 26;
    const tokens = 1 + Math.floor(r() * 4);
    for (let t = 0; t < tokens; t++) {
      const tw = 36 + r() * 150;
      if (lx + tw > x + w - 40) break;
      const fill = add ? (r() < 0.4 ? AMBER : "#5a6170") : del ? "#2a2f38" : t === 0 ? "#4a515e" : "#343a45";
      out.push(`<rect x="${f(lx)}" y="${ly + 9}" width="${f(tw)}" height="12" rx="6" fill="${fill}" fill-opacity="${add && fill === AMBER ? 0.85 : 1}"/>`);
      lx += tw + 12;
    }
  }
  return { body: out.join(""), glow: glow as readonly [number, number] };
}

const motifs: Record<Theme, (r: () => number) => { body: string; glow: readonly [number, number] }> = {
  graph,
  wave,
  clusters,
  bars,
  chart,
  grid,
  code,
  diff,
};

export function coverSvg(slug: string, tags: string[]) {
  const r = rng(hash(slug));
  const theme = themeFor(tags, slug);
  const { body, glow } = motifs[theme](r);
  const id = `g${hash(slug).toString(36)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><radialGradient id="${id}" cx="${f((glow[0] / W) * 100)}%" cy="${f((glow[1] / H) * 100)}%" r="55%"><stop offset="0" stop-color="${AMBER}" stop-opacity="0.16"/><stop offset="1" stop-color="${AMBER}" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="${BG}"/><rect width="${W}" height="${H}" fill="url(#${id})"/>${body}</svg>`;
}

import { getRedis, lastNDays } from "./server";

export type Pair = { key: string; count: number };
export type Visit = { t: number; path: string; country: string; city: string; device: string; browser: string; source: string; v: string };
export type Stats =
  | { configured: false }
  | {
      configured: true;
      range: number;
      days: string[];
      views: number[];
      visitors: number[];
      totals: {
        views: number;
        prevViews: number;
        visitors: number;
        prevVisitors: number;
        todayViews: number;
        todayVisitors: number;
        reads: number;
        prevReads: number;
        allTime: number;
      };
      pages: Pair[];
      reads: Pair[];
      readsAllTime: Pair[];
      sources: Pair[];
      countries: Pair[];
      devices: Pair[];
      browsers: Pair[];
      recent: Visit[];
    };

function merge(lists: unknown[]): Pair[] {
  const m = new Map<string, number>();
  for (const l of lists) {
    const arr = Array.isArray(l) ? l : [];
    for (let j = 0; j + 1 < arr.length; j += 2) {
      const k = String(arr[j]);
      m.set(k, (m.get(k) ?? 0) + Number(arr[j + 1]));
    }
  }
  return [...m].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export async function loadStats(range: number): Promise<Stats> {
  const redis = getRedis();
  if (!redis) return { configured: false };

  const all = lastNDays(range * 2);
  const prev = all.slice(0, range);
  const cur = all.slice(range);
  const zr = (key: string) => p.zrange(key, 0, -1, { withScores: true });

  const p = redis.pipeline();
  p.get("pv:total");
  all.forEach((d) => p.get(`pv:${d}`));
  cur.forEach((d) => p.pfcount(`uv:${d}`));
  p.pfcount(cur.map((d) => `uv:${d}`)[0], ...cur.slice(1).map((d) => `uv:${d}`));
  p.pfcount(prev.map((d) => `uv:${d}`)[0], ...prev.slice(1).map((d) => `uv:${d}`));
  const zPrefixes = ["pg", "rf", "co", "br", "rd"] as const;
  zPrefixes.forEach((prefix) => cur.forEach((d) => zr(`${prefix}:${d}`)));
  prev.forEach((d) => zr(`rd:${d}`));
  cur.forEach((d) => p.hgetall(`dv:${d}`));
  p.zrange("rd:all", 0, 9, { rev: true, withScores: true });
  p.lrange("recent", 0, 59);

  const res = (await p.exec()) as unknown[];
  let i = 0;
  const take = (n = 1) => res.slice(i, (i += n));

  const allTime = Number(take()[0] ?? 0);
  const dailyViews = take(all.length).map((v) => Number(v ?? 0));
  const visitors = take(cur.length).map((v) => Number(v ?? 0));
  const [uniqCur, uniqPrev] = take(2).map((v) => Number(v ?? 0));
  const z = Object.fromEntries(zPrefixes.map((prefix) => [prefix, merge(take(cur.length))])) as Record<(typeof zPrefixes)[number], Pair[]>;
  const prevReads = merge(take(prev.length));
  const devices = new Map<string, number>();
  for (const h of take(cur.length)) {
    for (const [k, v] of Object.entries((h as Record<string, unknown>) ?? {})) devices.set(k, (devices.get(k) ?? 0) + Number(v));
  }
  const readsAllTime = merge(take());
  const recent = ((take()[0] as Visit[]) ?? []).filter((v) => v && typeof v === "object");

  const views = dailyViews.slice(range);
  return {
    configured: true,
    range,
    days: cur,
    views,
    visitors,
    totals: {
      views: sum(views),
      prevViews: sum(dailyViews.slice(0, range)),
      visitors: uniqCur,
      prevVisitors: uniqPrev,
      todayViews: views.at(-1) ?? 0,
      todayVisitors: visitors.at(-1) ?? 0,
      reads: sum(z.rd.map((r) => r.count)),
      prevReads: sum(prevReads.map((r) => r.count)),
      allTime,
    },
    pages: z.pg,
    reads: z.rd,
    readsAllTime,
    sources: z.rf,
    countries: z.co,
    devices: [...devices].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
    browsers: z.br,
    recent,
  };
}

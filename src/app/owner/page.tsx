import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ViewsChart } from "@/components/owner/views-chart";
import { Container } from "@/components/ui";
import { projects } from "@/content/projects";
import { OWNER_COOKIE, TZ, passwordConfigured, verifySession } from "@/lib/analytics/server";
import { loadStats, type Pair, type Visit } from "@/lib/analytics/stats";
import { getAllPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Owner", robots: { index: false, follow: false } };

const RANGES = [7, 30, 90] as const;

function labelFor(path: string) {
  if (path === "/") return "Home";
  const post = path.match(/^\/blog\/(\d+)$/);
  if (post) {
    const p = getAllPosts().find((x) => x.id === Number(post[1]));
    return p ? `#${p.id} · ${p.title}` : path;
  }
  const proj = path.match(/^\/projects\/([^/]+)$/);
  if (proj) return projects.find((x) => x.slug === proj[1])?.title ?? path;
  const names: Record<string, string> = {
    "/blog": "Writing",
    "/projects": "Work",
    "/experience": "Experience",
    "/about": "About",
    "/resume": "Resume",
    "/contact": "Contact",
  };
  return names[path] ?? path;
}

const flag = (cc: string) =>
  /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : "🌐";

function regionName(cc: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(cc) ?? cc;
  } catch {
    return cc;
  }
}

function delta(cur: number, prev: number) {
  if (!prev) return cur ? "new" : null;
  const pct = Math.round(((cur - prev) / prev) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

function Login({ error, configured }: { error?: string; configured: boolean }) {
  const messages: Record<string, string> = {
    wrong: "That password is not right.",
    locked: "Too many attempts. Try again in 15 minutes.",
    setup: "Set OWNER_PASSWORD in Vercel first.",
  };
  return (
    <Container className="flex min-h-[80vh] items-center justify-center pt-28 pb-16">
      <form method="post" action="/api/owner/login" className="w-full max-w-sm rounded-3xl border border-line bg-panel p-7">
        <p className="eyebrow">Private</p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight">Owner dashboard</h1>
        <p className="mt-2 text-sm text-muted">Visitors and reading stats for this site.</p>
        {!configured && (
          <p className="mt-4 rounded-xl border border-signal/40 bg-signal/10 p-3 text-sm">
            Add an <code className="font-mono">OWNER_PASSWORD</code> environment variable in Vercel and redeploy to enable login.
          </p>
        )}
        <label className="mt-6 block text-sm" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          autoFocus
          className="mt-2 h-12 w-full rounded-xl border border-line-strong bg-ink px-4 text-base outline-none focus:border-signal"
        />
        {error && messages[error] && <p className="mt-3 text-sm text-[#ff8a7a]">{messages[error]}</p>}
        <button type="submit" className="mt-5 h-12 w-full cursor-pointer rounded-full bg-fg font-medium text-ink transition-colors hover:bg-signal">
          Open dashboard
        </button>
      </form>
    </Container>
  );
}

function Tile({ label, value, sub, change }: { label: string; value: number; sub?: string; change?: string | null }) {
  const up = change?.startsWith("+") || change === "new";
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-3xl font-medium tracking-tight tabular-nums">{value.toLocaleString("en-IN")}</p>
      <p className="mt-1 flex items-center gap-2 text-xs text-faint">
        {change && <span className={up ? "text-[#7fd1a3]" : change === "+0%" ? "" : "text-[#ff8a7a]"}>{up ? "▲" : "▼"} {change}</span>}
        {sub}
      </p>
    </div>
  );
}

function RankList({ title, rows, format, empty = "Nothing yet" }: { title: string; rows: Pair[]; format?: (k: string) => string; empty?: string }) {
  const top = rows.slice(0, 8);
  const max = Math.max(1, ...top.map((r) => r.count));
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-panel p-5">
      <h2 className="text-sm font-medium">{title}</h2>
      {top.length === 0 ? (
        <p className="mt-4 text-sm text-faint">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {top.map((r) => (
            <li key={r.key} className="relative overflow-hidden rounded-lg">
              <span className="absolute inset-y-0 left-0 rounded-lg bg-[#5b84d6]/20" style={{ width: `${(r.count / max) * 100}%` }} />
              <span className="relative flex items-center justify-between gap-3 px-2.5 py-1.5 text-sm">
                <span className="min-w-0 truncate">{format ? format(r.key) : r.key}</span>
                <span className="font-mono text-xs tabular-nums text-muted">{r.count.toLocaleString("en-IN")}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Recent({ visits }: { visits: Visit[] }) {
  const time = (t: number) =>
    new Date(t).toLocaleString("en-IN", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-panel p-5">
      <h2 className="text-sm font-medium">Recent visits</h2>
      {visits.length === 0 ? (
        <p className="mt-4 text-sm text-faint">No visits yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {visits.map((v, i) => (
            <li key={`${v.t}-${i}`} className="grid gap-1 py-2.5 text-sm sm:grid-cols-[7.5rem_1fr_auto] sm:items-center sm:gap-4">
              <span className="font-mono text-xs text-faint">{time(v.t)}</span>
              <span className="min-w-0 truncate">{labelFor(v.path)}</span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span>
                  {flag(v.country)} {v.city || regionName(v.country)}
                </span>
                <span>
                  {v.device} · {v.browser}
                </span>
                {v.source && <span className="rounded-full border border-line-strong px-2 py-0.5">{v.source}</span>}
                <span className="font-mono text-faint" title="Anonymous visitor id, changes daily">
                  #{v.v}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Setup() {
  return (
    <section className="rounded-2xl border border-signal/40 bg-signal/10 p-6 text-sm leading-relaxed">
      <h2 className="text-base font-medium">Connect storage to start counting visits</h2>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5">
        <li>In Vercel, open this project, then Storage, then Create Database, and pick Upstash (Redis). The free plan is enough.</li>
        <li>Connect it to this project for all environments. Vercel adds the connection variables for you.</li>
        <li>Redeploy. Visits start appearing here from the next page view.</li>
      </ol>
    </section>
  );
}

export default async function OwnerPage({ searchParams }: { searchParams: Promise<{ e?: string; range?: string }> }) {
  const sp = await searchParams;
  const authed = verifySession((await cookies()).get(OWNER_COOKIE)?.value);
  if (!authed) return <Login error={sp.e} configured={passwordConfigured()} />;

  const range = (RANGES as readonly number[]).includes(Number(sp.range)) ? Number(sp.range) : 30;
  const stats = await loadStats(range);

  return (
    <Container className="pt-28 pb-24 sm:pt-32">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Private</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">Visitors</h1>
        </div>
        <div className="flex items-center gap-2">
          <nav aria-label="Range" className="flex rounded-full border border-line-strong p-1 text-sm">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/owner?range=${r}`}
                className={`rounded-full px-3.5 py-1.5 ${r === range ? "bg-fg text-ink" : "text-muted hover:text-fg"}`}
                aria-current={r === range ? "page" : undefined}
              >
                {r}d
              </Link>
            ))}
          </nav>
          <form method="post" action="/api/owner/logout">
            <button type="submit" className="h-9 cursor-pointer rounded-full border border-line-strong px-3.5 text-sm text-muted hover:text-fg">
              Log out
            </button>
          </form>
        </div>
      </div>

      {!stats.configured ? (
        <div className="mt-8">
          <Setup />
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Tile label={`Visitors, ${range} days`} value={stats.totals.visitors} change={delta(stats.totals.visitors, stats.totals.prevVisitors)} sub="vs previous" />
            <Tile label={`Page views, ${range} days`} value={stats.totals.views} change={delta(stats.totals.views, stats.totals.prevViews)} sub="vs previous" />
            <Tile label="Today" value={stats.totals.todayViews} sub={`${stats.totals.todayVisitors} visitors`} />
            <Tile label={`Posts read to the end, ${range} days`} value={stats.totals.reads} change={delta(stats.totals.reads, stats.totals.prevReads)} />
            <div className="col-span-2 lg:col-span-1">
              <Tile label="All-time page views" value={stats.totals.allTime} />
            </div>
          </div>

          <section className="mt-3 rounded-2xl border border-line bg-panel p-5 sm:p-6">
            <ViewsChart days={stats.days} views={stats.views} visitors={stats.visitors} />
          </section>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <RankList title="Top pages" rows={stats.pages} format={labelFor} />
            <RankList title="Read to the end" rows={stats.reads.length ? stats.reads : stats.readsAllTime} format={labelFor} empty="No finished reads yet" />
            <RankList title="Where visitors came from" rows={stats.sources} />
            <RankList title="Countries" rows={stats.countries} format={(c) => `${flag(c)} ${regionName(c)}`} />
            <RankList title="Devices" rows={stats.devices} />
            <RankList title="Browsers" rows={stats.browsers} />
          </div>

          <div className="mt-3">
            <Recent visits={stats.recent} />
          </div>
          <p className="mt-6 text-xs text-faint">
            Your own visits are not counted while you are logged in. No cookies are set for visitors and IP addresses are never stored.
          </p>
        </>
      )}
    </Container>
  );
}

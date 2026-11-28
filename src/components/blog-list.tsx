"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PostMeta } from "@/lib/blog";

type ReadState = Record<string, { p: number; done?: boolean }>;

function useReadState(slugs: string[]) {
  const [state, setState] = useState<ReadState>({});
  useEffect(() => {
    const next: ReadState = {};
    for (const s of slugs) {
      try {
        const raw = localStorage.getItem(`read:${s}`);
        if (raw) next[s] = JSON.parse(raw);
      } catch {}
    }
    setState(next);
  }, [slugs]);
  return state;
}

function ReadBadge({ r }: { r?: { p: number; done?: boolean } }) {
  if (!r || r.p < 0.05) return null;
  if (r.done || r.p > 0.92)
    return <span className="rounded-full bg-signal/15 px-2 py-0.5 font-mono text-[10px] text-signal">Read</span>;
  return <span className="rounded-full bg-line-strong px-2 py-0.5 font-mono text-[10px] text-fg">{Math.round(r.p * 100)}% read</span>;
}

function Cover({ id, eager = false, fill = false }: { id: number; eager?: boolean; fill?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/blog/${id}/cover.svg`}
      alt=""
      width={1200}
      height={630}
      loading={eager ? "eager" : "lazy"}
      className={`block w-full transition-transform duration-500 group-hover:scale-[1.02] ${fill ? "h-full object-cover" : "h-auto"}`}
    />
  );
}

export function BlogList({ posts, dates }: { posts: PostMeta[]; dates: Record<string, string> }) {
  const slugs = useMemo(() => posts.map((p) => p.slug), [posts]);
  const read = useReadState(slugs);
  const topics = useMemo(() => {
    const count = new Map<string, number>();
    posts.forEach((p) => p.tags.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t);
  }, [posts]);
  const [topic, setTopic] = useState<string | null>(null);

  const visible = topic ? posts.filter((p) => p.tags.includes(topic)) : posts;
  const [latest, ...rest] = visible;
  const chip = (active: boolean) =>
    `shrink-0 cursor-pointer snap-start rounded-full border px-3.5 py-2 text-sm transition-colors ${
      active ? "border-signal bg-signal text-ink" : "border-line-strong text-muted hover:text-fg"
    }`;

  return (
    <>
      <div className="sticky top-16 z-30 -mx-5 mb-6 border-b border-line bg-ink/85 px-5 py-3 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto sm:flex-wrap">
          <button type="button" onClick={() => setTopic(null)} className={chip(topic === null)}>
            All <span className="ml-1 font-mono text-[11px] opacity-70">{posts.length}</span>
          </button>
          {topics.map((t) => (
            <button key={t} type="button" onClick={() => setTopic(topic === t ? null : t)} className={chip(topic === t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {latest && (
        <Link
          href={`/blog/${latest.id}`}
          className="group grid overflow-hidden rounded-3xl border border-line bg-panel/60 transition-colors hover:border-line-strong lg:grid-cols-[1.25fr_1fr]"
        >
          <div className="overflow-hidden border-b border-line lg:border-r lg:border-b-0">
            <Cover id={latest.id} eager fill />
          </div>
          <div className="flex flex-col p-5 sm:p-9">
            <span className="flex flex-wrap items-center gap-2 font-mono text-xs text-faint">
              {topic ? "Newest in topic" : "Latest"} · {dates[latest.slug]} · {latest.readingMinutes} min read
              <ReadBadge r={read[latest.slug]} />
            </span>
            <span className="mt-3 text-xl leading-snug font-medium tracking-tight transition-colors group-hover:text-signal sm:mt-4 sm:text-3xl">
              {latest.title}
            </span>
            <span className="mt-3 leading-relaxed text-muted">{latest.description}</span>
          </div>
        </Link>
      )}

      <ul className="mt-4 divide-y divide-line sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-5 sm:divide-y-0 lg:grid-cols-3">
        {rest.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.id}`}
              className="group flex gap-4 py-4 sm:h-full sm:flex-col sm:gap-0 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-line sm:py-0 sm:transition-colors sm:hover:border-line-strong sm:hover:bg-panel"
            >
              <div className="w-28 shrink-0 self-start overflow-hidden rounded-lg border border-line sm:w-full sm:rounded-none sm:border-0 sm:border-b">
                <Cover id={post.id} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col sm:p-5">
                <span className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-faint">
                  {dates[post.slug]} · {post.readingMinutes} min
                  <ReadBadge r={read[post.slug]} />
                </span>
                <span className="mt-1.5 line-clamp-3 text-[15px] leading-snug font-medium tracking-tight transition-colors group-hover:text-signal sm:mt-3 sm:text-lg">
                  {post.title}
                </span>
                <span className="mt-2 line-clamp-3 hidden text-sm leading-relaxed text-muted sm:block">{post.description}</span>
                <span className="mt-auto hidden flex-wrap gap-2 pt-5 sm:flex">
                  {post.tags.slice(0, 2).map((t) => (
                    <span key={t} className="rounded-full border border-line-strong px-2.5 py-1 font-mono text-[11px] leading-none text-muted">
                      {t}
                    </span>
                  ))}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

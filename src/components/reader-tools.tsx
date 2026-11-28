"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendEvent } from "@/lib/analytics/client";

type Heading = { id: string; text: string };
const SIZES = ["s", "m", "l"] as const;
type Size = (typeof SIZES)[number];
const SIZE_LABEL: Record<Size, string> = { s: "Small", m: "Medium", l: "Large" };

function articleBounds() {
  const el = document.getElementById("article-body");
  if (!el) return null;
  const top = el.getBoundingClientRect().top + window.scrollY;
  return { top, height: el.offsetHeight };
}

function readProgress() {
  const b = articleBounds();
  if (!b) return 0;
  const span = Math.max(1, b.height - window.innerHeight * 0.6);
  return Math.min(1, Math.max(0, (window.scrollY - b.top + window.innerHeight * 0.25) / span));
}

function scrollToProgress(p: number) {
  const b = articleBounds();
  if (!b) return;
  const span = Math.max(1, b.height - window.innerHeight * 0.6);
  window.scrollTo({ top: b.top + p * span - window.innerHeight * 0.25, behavior: "smooth" });
}

export function ReaderTools({
  slug,
  title,
  url,
  toc,
  minutes,
}: {
  slug: string;
  title: string;
  url: string;
  toc: Heading[];
  minutes: number;
}) {
  const [progress, setProgress] = useState(0);
  const [barVisible, setBarVisible] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [size, setSize] = useState<Size>("m");
  const [toast, setToast] = useState<string | null>(null);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const lastY = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
    setTimeout(() => setToast(null), 1800);
  }, []);

  useEffect(() => {
    const saved = (localStorage.getItem("reader-size") as Size | null) ?? null;
    if (saved && SIZES.includes(saved)) setSize(saved);
    try {
      const raw = localStorage.getItem(`read:${slug}`);
      if (raw) {
        const { p } = JSON.parse(raw) as { p: number };
        if (p > 0.08 && p < 0.92 && window.scrollY < 200) setResumeAt(p);
      }
    } catch {}
  }, [slug]);

  useEffect(() => {
    if (resumeAt === null) return;
    const t = setTimeout(() => setResumeAt(null), 9000);
    return () => clearTimeout(t);
  }, [resumeAt]);

  useEffect(() => {
    const onScroll = () => {
      const p = readProgress();
      setProgress(p);
      const y = window.scrollY;
      const goingUp = y < lastY.current - 4;
      const goingDown = y > lastY.current + 4;
      if (p > 0.97) setBarVisible(true);
      else if (goingUp && p > 0.02) setBarVisible(true);
      else if (goingDown || p <= 0.02) setBarVisible(false);
      lastY.current = y;

      if (toc.length) {
        let current: string | null = null;
        for (const h of toc) {
          const el = document.getElementById(h.id);
          if (el && el.getBoundingClientRect().top < window.innerHeight * 0.3) current = h.id;
        }
        setActive(current);
      }

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          const prev = JSON.parse(localStorage.getItem(`read:${slug}`) ?? "{}") as { p?: number; done?: boolean };
          if (!prev.done && p > 0.92) sendEvent({ t: "read", p: window.location.pathname });
          localStorage.setItem(`read:${slug}`, JSON.stringify({ p, done: prev.done || p > 0.92, t: Date.now() }));
        } catch {}
      }, 400);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [slug, toc]);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [sheet]);

  const cycleSize = () => {
    const next = SIZES[(SIZES.indexOf(size) + 1) % SIZES.length];
    setSize(next);
    document.documentElement.dataset.readerSize = next;
    try {
      localStorage.setItem("reader-size", next);
    } catch {}
    flash(`Text size: ${SIZE_LABEL[next]}`);
  };

  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
      } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copied");
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  const goTo = (id: string) => {
    setSheet(false);
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: "smooth" });
  };

  const left = Math.max(0, Math.ceil(minutes * (1 - progress)));
  const iconBtn =
    "flex h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-sm text-fg transition-colors active:bg-line-strong";

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] bg-transparent" aria-hidden>
        <div className="h-full origin-left bg-signal transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
      </div>

      {resumeAt !== null && (
        <div className="fixed inset-x-0 bottom-0 z-[55] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="rise flex w-full max-w-md items-center gap-3 rounded-2xl border border-line-strong bg-panel/95 p-3 pl-4 shadow-2xl shadow-black/50 backdrop-blur">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Continue where you left off</p>
              <p className="text-xs text-muted">You read {Math.round(resumeAt * 100)}% of this post</p>
            </div>
            <button
              type="button"
              onClick={() => {
                scrollToProgress(resumeAt);
                setResumeAt(null);
              }}
              className="h-10 cursor-pointer rounded-full bg-signal px-4 text-sm font-medium text-ink"
            >
              Resume
            </button>
            <button type="button" aria-label="Dismiss" onClick={() => setResumeAt(null)} className="size-10 cursor-pointer rounded-full text-muted">
              ✕
            </button>
          </div>
        </div>
      )}

      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 sm:hidden ${
          barVisible && resumeAt === null && !sheet ? "translate-y-0" : "translate-y-[140%]"
        }`}
      >
        <nav
          aria-label="Reading tools"
          className="flex w-full max-w-md items-center justify-between rounded-full border border-line-strong bg-panel/90 p-1 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
          {toc.length > 0 && (
            <button type="button" onClick={() => setSheet(true)} className={iconBtn} aria-label="Contents">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M4 6h16M4 12h10M4 18h13" />
              </svg>
              <span className="text-xs">Contents</span>
            </button>
          )}
          <span className="px-1 font-mono text-[11px] text-muted">{left > 0 ? `${left} min left` : "Finished"}</span>
          <button type="button" onClick={cycleSize} className={iconBtn} aria-label={`Text size, now ${SIZE_LABEL[size]}`}>
            <span className="font-serif text-base leading-none">
              A<span className="text-xs">a</span>
            </span>
          </button>
          <button type="button" onClick={share} className={iconBtn} aria-label="Share">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className={iconBtn}
            aria-label="Back to top"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </nav>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-[65] sm:hidden" role="dialog" aria-modal="true" aria-label="Contents">
          <button type="button" aria-label="Close contents" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSheet(false)} />
          <div className="rise absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-3xl border-t border-line-strong bg-panel px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong" />
            <div className="flex items-baseline justify-between">
              <p className="eyebrow">In this post</p>
              <p className="font-mono text-[11px] text-faint">{Math.round(progress * 100)}% read</p>
            </div>
            <ol className="mt-3">
              {toc.map((h, i) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => goTo(h.id)}
                    className={`flex w-full cursor-pointer items-start gap-3 border-b border-line py-3.5 text-left text-[15px] leading-snug ${
                      active === h.id ? "text-signal" : "text-fg"
                    }`}
                  >
                    <span className="mt-0.5 font-mono text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                    {h.text}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center sm:bottom-8" role="status">
          <span className="rise rounded-full border border-line-strong bg-panel px-4 py-2 text-sm shadow-xl">{toast}</span>
        </div>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { nav, site } from "@/content/site";
import { LogoMark } from "./logo";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [burst, setBurst] = useState(0);
  const lastBurst = useRef(0);
  const firstPath = useRef(true);

  const trigger = () => {
    const now = Date.now();
    if (now - lastBurst.current < 1300) return;
    lastBurst.current = now;
    setBurst((b) => b + 1);
  };

  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    trigger();
  }, [pathname]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") trigger();
    }, 9000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
    <header
      className={`fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] transition-colors duration-300 ${
        scrolled || open ? "border-b border-line bg-ink/80 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          onPointerEnter={trigger}
          className="group flex items-center gap-2.5 text-sm font-medium tracking-tight"
          aria-label={`${site.name}, home`}
        >
          <LogoMark className="size-8" animated burst={burst} />
          {site.name}
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                isActive(item.href) ? "bg-panel text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={site.resume}
            className="ml-2 cursor-pointer rounded-full border border-line-strong px-3.5 py-1.5 text-sm text-fg transition-colors hover:border-signal hover:text-signal"
          >
            Resume
          </a>
        </nav>

        <button
          type="button"
          className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-line-strong md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="relative block h-2.5 w-4">
            <span className={`absolute left-0 h-px w-4 bg-fg transition-transform ${open ? "top-1 rotate-45" : "top-0"}`} />
            <span className={`absolute left-0 h-px w-4 bg-fg transition-transform ${open ? "top-1 -rotate-45" : "top-2.5"}`} />
          </span>
        </button>
      </div>

    </header>
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] bottom-0 z-40 flex flex-col overflow-y-auto bg-ink/97 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden"
        >
          <ul>
            {[{ href: "/", label: "Home" }, ...nav].map((item, i) => (
              <li key={item.href} className="rise" style={{ animationDelay: `${i * 40}ms` }}>
                <Link
                  href={item.href}
                  className={`flex items-center justify-between border-b border-line py-4 text-[1.75rem] font-medium tracking-tight ${
                    (item.href === "/" ? pathname === "/" : isActive(item.href)) ? "text-signal" : "text-fg"
                  }`}
                >
                  {item.label}
                  <span className="font-mono text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>
                </Link>
              </li>
            ))}
          </ul>
          <a
            href={site.resume}
            className="rise mt-6 flex h-12 items-center justify-center rounded-full bg-fg text-base font-medium text-ink [animation-delay:280ms]"
          >
            Download resume
          </a>
          <div className="mt-auto grid grid-cols-3 gap-2 pt-8 text-center text-sm">
            <a href={`mailto:${site.email}`} className="rounded-2xl border border-line py-3 text-muted active:bg-panel">
              Email
            </a>
            <a href={site.links.linkedin} className="rounded-2xl border border-line py-3 text-muted active:bg-panel" rel="me">
              LinkedIn
            </a>
            <a href={site.links.github} className="rounded-2xl border border-line py-3 text-muted active:bg-panel" rel="me">
              GitHub
            </a>
          </div>
        </nav>
      )}
    </>
  );
}

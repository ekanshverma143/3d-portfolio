"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav, site } from "@/content/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || open ? "border-b border-line bg-ink/80 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5 text-sm font-medium tracking-tight">
          <span className="relative flex size-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-signal opacity-40 motion-reduce:animate-none" />
            <span className="relative size-2.5 rounded-full bg-signal" />
          </span>
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
          className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-line-strong md:hidden"
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

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line px-5 pt-2 pb-6 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block border-b border-line py-3.5 text-lg ${isActive(item.href) ? "text-signal" : "text-fg"}`}
            >
              {item.label}
            </Link>
          ))}
          <a href={site.resume} className="block py-3.5 text-lg text-fg">
            Resume (PDF)
          </a>
        </nav>
      )}
    </header>
  );
}

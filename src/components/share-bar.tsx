"use client";

import { useEffect, useState } from "react";

const icons = {
  whatsapp:
    "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z",
  linkedin:
    "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4v11H3v-11Zm6.5 0h3.8v1.6h.05c.53-1 1.84-2.05 3.78-2.05 4.04 0 4.79 2.66 4.79 6.12v5.33h-4v-4.73c0-1.13-.02-2.58-1.57-2.58-1.57 0-1.81 1.23-1.81 2.5v4.81h-4v-11Z",
  x: "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z",
  telegram:
    "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
};

function Icon({ d, className = "size-4" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d={d} />
    </svg>
  );
}

export function ShareBar({ url, title, compact = false }: { url: string; title: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  const u = encodeURIComponent(url);
  const targets = [
    { name: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`, icon: icons.whatsapp, hover: "hover:text-[#25D366] hover:border-[#25D366]/60" },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, icon: icons.linkedin, hover: "hover:text-[#4c9ee8] hover:border-[#4c9ee8]/60" },
    { name: "X", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${u}`, icon: icons.x, hover: "hover:text-fg hover:border-fg/60" },
    { name: "Telegram", href: `https://t.me/share/url?url=${u}&text=${encodeURIComponent(title)}`, icon: icons.telegram, hover: "hover:text-[#2AABEE] hover:border-[#2AABEE]/60" },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  const btn =
    "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-3 text-sm text-muted transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!compact && <span className="mr-1 font-mono text-[11px] tracking-[0.14em] text-faint uppercase">Share</span>}
      {canShare && (
        <button
          type="button"
          onClick={() => navigator.share({ title, url }).catch(() => {})}
          className={`${btn} bg-fg text-ink hover:bg-signal sm:hidden`}
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14" />
          </svg>
          Share
        </button>
      )}
      {targets.map((t) => (
        <a
          key={t.name}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${t.name}`}
          title={`Share on ${t.name}`}
          className={`${btn} ${t.hover}`}
        >
          <Icon d={t.icon} />
          {!compact && <span className="hidden sm:inline">{t.name}</span>}
        </a>
      ))}
      <button type="button" onClick={copy} className={`${btn} hover:border-signal hover:text-signal`} aria-live="polite">
        <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
        </svg>
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

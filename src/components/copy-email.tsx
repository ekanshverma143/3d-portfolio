"use client";

import { useState } from "react";

export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(email);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          window.location.href = `mailto:${email}`;
        }
      }}
      className="cursor-pointer rounded-full border border-line-strong px-3.5 py-1.5 font-mono text-xs text-muted transition-colors hover:border-fg hover:text-fg"
      aria-live="polite"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

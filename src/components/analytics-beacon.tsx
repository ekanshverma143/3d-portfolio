"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { sendEvent } from "@/lib/analytics/client";

export function AnalyticsBeacon() {
  const pathname = usePathname();
  const entry = useRef(true);
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/owner") || pathname === last.current) return;
    last.current = pathname;
    const payload: Record<string, unknown> = { t: "view", p: pathname, w: window.innerWidth };
    if (entry.current) {
      entry.current = false;
      payload.e = 1;
      payload.r = document.referrer;
      const utm = new URLSearchParams(window.location.search).get("utm_source");
      if (utm) payload.u = utm;
    }
    sendEvent(payload);
  }, [pathname]);

  return null;
}

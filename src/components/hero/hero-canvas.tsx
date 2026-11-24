"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";

const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

class WebGLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function HeroCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden className="absolute inset-0">
      <div className="pointer-events-none absolute top-[38%] right-[8%] h-[46vmin] w-[46vmin] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#ffb35c14,transparent_65%)] max-[899px]:top-[26%] max-[899px]:right-1/2 max-[899px]:translate-x-1/2" />
      <WebGLBoundary>
        <HeroScene active={visible} animate={!reduced} />
      </WebGLBoundary>
    </div>
  );
}

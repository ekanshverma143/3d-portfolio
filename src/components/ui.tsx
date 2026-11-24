import Link from "next/link";
import type { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

export function PageHeader({ eyebrow, title, intro }: { eyebrow: string; title: ReactNode; intro?: ReactNode }) {
  return (
    <Container className="pt-36 pb-14 sm:pt-44 sm:pb-20">
      <p className="eyebrow rise">{eyebrow}</p>
      <h1 className="rise mt-5 max-w-4xl text-4xl leading-[1.05] font-medium tracking-[-0.035em] text-balance sm:text-6xl [animation-delay:80ms]">
        {title}
      </h1>
      {intro && (
        <p className="rise mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted [animation-delay:160ms]">{intro}</p>
      )}
    </Container>
  );
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-medium tracking-[-0.03em] sm:text-4xl">{title}</h2>
      </div>
      {action && (
        <Link href={action.href} className="group inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg">
          {action.label}
          <Arrow className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-line-strong px-2.5 py-1 font-mono text-[11px] leading-none text-muted">
      {children}
    </span>
  );
}

export function Arrow({ className = "", diagonal = false }: { className?: string; diagonal?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={`size-3.5 ${diagonal ? "-rotate-45" : ""} ${className}`}>
      <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  external = false,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  external?: boolean;
}) {
  const cls =
    variant === "primary"
      ? "bg-fg text-ink hover:bg-signal"
      : "border border-line-strong text-fg hover:border-fg";
  const inner = (
    <>
      {children}
      <Arrow className="transition-transform group-hover:translate-x-0.5" diagonal={external} />
    </>
  );
  const className = `group inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${cls}`;
  return external || href.endsWith(".pdf") || href.startsWith("mailto:") ? (
    <a href={href} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

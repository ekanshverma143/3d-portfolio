import Link from "next/link";
import type { Project } from "@/content/projects";
import { Arrow, Tag } from "./ui";

export function FeaturedCard({ project, index, className = "" }: { project: Project; index: number; className?: string }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-panel/60 p-7 transition-colors hover:border-line-strong sm:p-9 ${className}`}
    >
      <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-[radial-gradient(circle,#ffb35c1f,transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="flex items-center justify-between font-mono text-xs text-faint">
        <span>
          {String(index + 1).padStart(2, "0")} · {project.org}
        </span>
        <span>{project.period}</span>
      </div>
      <h3 className="mt-10 text-2xl font-medium tracking-[-0.025em] sm:text-3xl">{project.title}</h3>
      <p className="mt-3 max-w-xl leading-relaxed text-muted">{project.summary}</p>
      {project.metrics && (
        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6">
          {project.metrics.slice(0, 2).map((m) => (
            <div key={m.label}>
              <dt className="sr-only">{m.label}</dt>
              <dd className="text-2xl font-medium tracking-tight text-fg">{m.value}</dd>
              <dd className="mt-1 text-xs text-muted">{m.label}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-8">
        <div className="flex flex-wrap gap-2">
          {project.stack.slice(0, 4).map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-fg">
          Case study
          <Arrow className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export function CompactCard({ project }: { project: Project }) {
  const body = (
    <>
      <div className="flex items-center justify-between font-mono text-[11px] text-faint">
        <span>{project.org}</span>
        <span>{project.period}</span>
      </div>
      <h3 className="mt-5 text-lg font-medium tracking-tight">{project.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{project.summary}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        {project.stack.slice(0, 4).map((s) => (
          <Tag key={s}>{s}</Tag>
        ))}
      </div>
      {project.links && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
          {project.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-fg hover:text-signal"
            >
              {l.label}
              <Arrow diagonal />
            </a>
          ))}
        </div>
      )}
    </>
  );
  const cls = "flex h-full flex-col rounded-2xl border border-line p-6 transition-colors hover:border-line-strong";
  return project.caseStudy ? (
    <Link href={`/projects/${project.slug}`} className={`${cls} hover:bg-panel`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

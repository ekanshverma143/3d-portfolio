import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Arrow, ButtonLink, Container, JsonLd, Tag } from "@/components/ui";
import { getProject, projects } from "@/content/projects";
import { site } from "@/content/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.filter((p) => p.caseStudy).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) return {};
  const title = `${p.title}: case study`;
  return {
    title,
    description: p.summary,
    alternates: { canonical: `/projects/${slug}` },
    openGraph: { type: "article", title, description: p.summary, url: `/projects/${slug}` },
  };
}

export default async function CaseStudy({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p?.caseStudy) notFound();
  const cs = p.caseStudy;
  const studies = projects.filter((x) => x.caseStudy);
  const next = studies[(studies.findIndex((x) => x.slug === slug) + 1) % studies.length];

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: p.title,
          description: p.summary,
          url: `${site.url}/projects/${slug}`,
          creator: { "@type": "Person", name: site.name, url: site.url },
          keywords: p.stack.join(", "),
        }}
      />
      <Container className="pt-36 sm:pt-44">
        <Link href="/projects" className="group inline-flex items-center gap-2 font-mono text-xs text-muted hover:text-fg">
          <Arrow className="rotate-180 transition-transform group-hover:-translate-x-0.5" />
          All work
        </Link>
        <p className="eyebrow rise mt-10">
          {p.org} · {p.period}
        </p>
        <h1 className="rise mt-5 max-w-4xl text-5xl leading-[1] font-medium tracking-[-0.045em] sm:text-7xl [animation-delay:60ms]">
          {p.title}
        </h1>
        <p className="rise mt-7 max-w-3xl text-xl leading-relaxed text-pretty text-muted [animation-delay:120ms]">
          {p.summary}
        </p>
        <div className="rise mt-8 flex flex-wrap gap-2 [animation-delay:180ms]">
          {p.stack.map((s) => (
            <Tag key={s}>{s}</Tag>
          ))}
        </div>
        {p.links && (
          <div className="mt-8 flex flex-wrap gap-3">
            {p.links.map((l) => (
              <ButtonLink key={l.href} href={l.href} variant="ghost" external>
                {l.label}
              </ButtonLink>
            ))}
          </div>
        )}
      </Container>

      {p.metrics && (
        <Container className="mt-16">
          <dl className="grid grid-cols-2 border-y border-line lg:grid-cols-4">
            {p.metrics.map((m, i) => (
              <div key={m.label} className={`py-8 pr-6 ${i > 0 ? "lg:border-l lg:border-line lg:pl-8" : ""} ${i % 2 === 1 ? "max-lg:border-l max-lg:border-line max-lg:pl-6" : ""} ${i > 1 ? "max-lg:border-t max-lg:border-line" : ""}`}>
                <dt className="sr-only">{m.label}</dt>
                <dd className="text-3xl font-medium tracking-tight sm:text-4xl">{m.value}</dd>
                <dd className="mt-2 text-sm text-muted">{m.label}</dd>
              </div>
            ))}
          </dl>
        </Container>
      )}

      <Container className="grid gap-14 py-20 lg:grid-cols-[14rem_1fr] lg:gap-20">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">My role</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">{cs.role}</p>
        </aside>
        <div className="max-w-3xl">
          <section>
            <h2 className="text-2xl font-medium tracking-tight">The problem</h2>
            <p className="mt-4 text-lg leading-[1.8] text-[#c9c7c2]">{cs.problem}</p>
          </section>
          <section className="mt-16">
            <h2 className="text-2xl font-medium tracking-tight">How I built it</h2>
            <ol className="mt-8 space-y-10">
              {cs.approach.map((step, i) => (
                <li key={step.title} className="grid gap-3 sm:grid-cols-[3rem_1fr]">
                  <span className="font-mono text-sm text-signal">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-lg font-medium">{step.title}</h3>
                    <p className="mt-2 leading-[1.8] text-[#c9c7c2]">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section className="mt-16 rounded-3xl border border-line bg-panel p-7 sm:p-9">
            <h2 className="text-2xl font-medium tracking-tight">What it changed</h2>
            <ul className="mt-6 space-y-4">
              {cs.outcome.map((o) => (
                <li key={o} className="flex gap-3 leading-relaxed text-[#c9c7c2]">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-signal" />
                  {o}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </Container>

      {next && next.slug !== slug && (
        <Container className="pb-28">
          <Link
            href={`/projects/${next.slug}`}
            className="group flex flex-wrap items-end justify-between gap-6 rounded-3xl border border-line p-8 transition-colors hover:border-line-strong hover:bg-panel sm:p-10"
          >
            <div>
              <p className="eyebrow">Next case study</p>
              <p className="mt-3 text-3xl font-medium tracking-tight group-hover:text-signal sm:text-4xl">{next.title}</p>
            </div>
            <Arrow className="size-6 transition-transform group-hover:translate-x-1" />
          </Link>
        </Container>
      )}
    </article>
  );
}

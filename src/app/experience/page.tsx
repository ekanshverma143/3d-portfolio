import type { Metadata } from "next";
import { Container, PageHeader, Tag } from "@/components/ui";
import { education, leadership, roles } from "@/content/experience";

export const metadata: Metadata = {
  title: "Experience",
  description:
    "Ekansh Verma's experience: SDE 1 at GoodSpace AI building agentic recruiting systems, and frontend team lead at Tecnod8.ai. B.Tech from NIT Hamirpur.",
  alternates: { canonical: "/experience" },
};

export default function ExperiencePage() {
  return (
    <>
      <PageHeader
        eyebrow="Experience"
        title={
          <>
            Two years of <span className="font-serif italic">shipping</span>, most of it to production on day one
          </>
        }
        intro="I started on the frontend for industrial AI products and moved down the stack into agents, queues, search and payments."
      />
      <Container className="pb-28">
        <ol className="border-t border-line">
          {roles.map((r) => (
            <li key={r.company} className="grid gap-8 border-b border-line py-14 lg:grid-cols-[16rem_1fr] lg:gap-16">
              <div>
                <p className="font-mono text-xs text-faint">
                  {r.start} to {r.end}
                </p>
                <h2 className="mt-3 text-2xl font-medium tracking-tight">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="link-underline">
                      {r.company}
                    </a>
                  ) : (
                    r.company
                  )}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {r.title}, {r.location}
                </p>
              </div>
              <div>
                <p className="max-w-3xl text-lg leading-relaxed text-fg">{r.summary}</p>
                <ul className="mt-7 max-w-3xl space-y-4">
                  {r.points.map((pt) => (
                    <li key={pt} className="flex gap-4 leading-[1.75] text-[#c9c7c2]">
                      <span className="mt-[0.7rem] h-px w-3 shrink-0 bg-signal" />
                      {pt}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-2">
                  {r.stack.map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-20 grid gap-5 md:grid-cols-2">
          <section className="rounded-3xl border border-line p-8">
            <p className="eyebrow">Education</p>
            <h2 className="mt-4 text-xl font-medium">{education.school}</h2>
            <p className="mt-1 text-muted">{education.degree}</p>
            <p className="mt-4 font-mono text-xs text-faint">
              {education.period} · {education.location}
            </p>
          </section>
          <section className="rounded-3xl border border-line p-8">
            <p className="eyebrow">Leadership</p>
            <ul className="mt-4 space-y-4">
              {leadership.map((l) => (
                <li key={l.title}>
                  <p className="font-medium">{l.title}</p>
                  <p className="text-sm text-muted">
                    {l.org} · {l.period}
                  </p>
                </li>
              ))}
              <li>
                <p className="font-medium">Frontend Team Lead</p>
                <p className="text-sm text-muted">Tecnod8.ai · led delivery for enterprise clients</p>
              </li>
            </ul>
          </section>
        </div>
      </Container>
    </>
  );
}

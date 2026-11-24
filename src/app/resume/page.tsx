import type { Metadata } from "next";
import { ButtonLink, Container, PageHeader } from "@/components/ui";
import { education, roles, skills } from "@/content/experience";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Resume",
  description:
    "Resume of Ekansh Verma, Software Development Engineer: AI agents, semantic search, full-stack products. Download the PDF.",
  alternates: { canonical: "/resume" },
};

export default function ResumePage() {
  return (
    <>
      <PageHeader
        eyebrow="Resume"
        title="Resume"
        intro="The short version is below. The PDF has the full detail on each system."
      />
      <Container className="pb-28">
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={site.resume}>Download PDF</ButtonLink>
          <ButtonLink href="/contact" variant="ghost">
            Get in touch
          </ButtonLink>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-12">
            {roles.map((r) => (
              <section key={r.company}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                  <h2 className="text-xl font-medium">
                    {r.company} <span className="text-muted">· {r.title}</span>
                  </h2>
                  <span className="font-mono text-xs text-faint">
                    {r.start} to {r.end}
                  </span>
                </div>
                <ul className="mt-5 space-y-3">
                  {r.points.map((pt) => (
                    <li key={pt} className="flex gap-3 text-[15px] leading-relaxed text-[#c9c7c2]">
                      <span className="mt-2.5 size-1 shrink-0 rounded-full bg-muted" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <aside className="space-y-8">
            <section>
              <p className="eyebrow">Education</p>
              <p className="mt-3 font-medium">{education.school}</p>
              <p className="text-sm text-muted">{education.degree}</p>
              <p className="mt-1 font-mono text-xs text-faint">{education.period}</p>
            </section>
            {skills.map((s) => (
              <section key={s.group}>
                <p className="eyebrow">{s.group}</p>
                <p className="mt-2 text-sm leading-relaxed text-fg">{s.items.join(", ")}</p>
              </section>
            ))}
          </aside>
        </div>

        <div className="mt-20 hidden overflow-hidden rounded-2xl border border-line md:block">
          <object data={`${site.resume}#view=FitH`} type="application/pdf" className="h-[90vh] w-full" aria-label="Resume PDF">
            <p className="p-6 text-muted">
              Your browser can&apos;t show PDFs inline. <a href={site.resume} className="text-fg underline">Download it</a>{" "}
              instead.
            </p>
          </object>
        </div>
      </Container>
    </>
  );
}

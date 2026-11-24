import type { Metadata } from "next";
import { CompactCard, FeaturedCard } from "@/components/project-card";
import { Container, PageHeader } from "@/components/ui";
import { projects } from "@/content/projects";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Case studies and projects by Ekansh Verma: an autonomous recruiting agent, a realtime voice interviewer on WebRTC, semantic candidate search and a multi-tenant hiring platform.",
  alternates: { canonical: "/projects" },
};

export default function ProjectsPage() {
  const featured = projects.filter((p) => p.featured);
  const work = projects.filter((p) => !p.featured && p.kind === "work");
  const side = projects.filter((p) => !p.featured && p.kind !== "work");

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title={
          <>
            Systems that <span className="font-serif italic">run on their own</span>, and the products around them
          </>
        }
        intro="Most of my work is agentic AI that has to hold up in production: tools with real permissions, queues, retries and humans in the loop where it matters. Here is what I have built."
      />
      <Container className="pb-24">
        <p className="eyebrow">Case studies</p>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {featured.map((p, i) => (
            <FeaturedCard key={p.slug} project={p} index={i} className={i === 0 && featured.length % 2 === 1 ? "lg:col-span-2" : ""} />
          ))}
        </div>

        <p className="eyebrow mt-24">More at GoodSpace AI</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {work.map((p) => (
            <CompactCard key={p.slug} project={p} />
          ))}
        </div>

        <p className="eyebrow mt-24">Side projects and client work</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {side.map((p) => (
            <CompactCard key={p.slug} project={p} />
          ))}
        </div>
      </Container>
    </>
  );
}

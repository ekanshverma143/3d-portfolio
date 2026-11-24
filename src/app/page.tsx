import Link from "next/link";
import { HeroCanvas } from "@/components/hero/hero-canvas";
import { FeaturedCard } from "@/components/project-card";
import { Arrow, ButtonLink, Container, JsonLd, SectionHeading } from "@/components/ui";
import { education, roles } from "@/content/experience";
import { projects } from "@/content/projects";
import { personSchema } from "@/content/person";
import { site } from "@/content/site";
import { formatDate, getAllPosts } from "@/lib/blog";

const proof = [
  { value: "42", label: "tools behind one recruiting agent, each scoped to its operator" },
  { value: "7", label: "pipeline stages a mandate moves through without a human" },
  { value: "20 ms", label: "paced audio frames for a realtime voice interviewer on WebRTC" },
  { value: "2,300+", label: "feature and fix pull requests merged since January 2026" },
];

export default function Home() {
  const featured = projects.filter((p) => p.featured);
  const posts = getAllPosts().slice(0, 3);

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", ...personSchema }} />

      <section className="relative isolate overflow-hidden">
        <HeroCanvas />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-linear-to-b from-transparent to-ink" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-2/3 bg-linear-to-r from-ink/90 via-ink/40 to-transparent max-[899px]:hidden" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[64%] bg-linear-to-b from-transparent via-ink/75 to-ink min-[900px]:hidden" />
        <Container className="relative z-10 flex min-h-[100svh] flex-col justify-end pt-32 pb-16 min-[900px]:justify-center min-[900px]:pb-24">
          <div className="max-w-xl">
            <p className="eyebrow rise">Software engineer · AI systems</p>
            <h1 className="rise mt-6 text-6xl leading-[0.92] font-medium tracking-[-0.05em] sm:text-8xl [animation-delay:80ms]">
              Ekansh
              <br />
              Verma
            </h1>
            <p className="rise mt-8 text-lg leading-relaxed text-pretty text-muted sm:text-xl [animation-delay:160ms]">
              I build AI systems that <span className="font-serif text-[1.15em] text-fg italic">do the work</span>: agents
              that run a hiring pipeline end to end, an engine that applies to jobs for you, a voice interviewer that holds a
              fifteen-minute conversation, and search that understands people.
            </p>
            <div className="rise mt-10 flex flex-wrap gap-3 [animation-delay:240ms]">
              <ButtonLink href="/projects">See the work</ButtonLink>
              <ButtonLink href="/blog" variant="ghost">
                Read the writing
              </ButtonLink>
            </div>
            <p className="rise mt-14 font-mono text-xs text-faint [animation-delay:320ms]">
              SDE 1 at GoodSpace AI · {site.location}
            </p>
          </div>
        </Container>
      </section>

      <Container>
        <dl className="grid border-y border-line sm:grid-cols-2 lg:grid-cols-4">
          {proof.map((p, i) => (
            <div
              key={p.label}
              className={`py-8 sm:px-6 ${i > 0 ? "max-sm:border-t max-sm:border-line" : ""} ${i % 2 === 1 ? "sm:border-l sm:border-line" : ""} ${i > 1 ? "sm:max-lg:border-t sm:max-lg:border-line" : ""} ${i === 2 ? "lg:border-l lg:border-line" : ""} ${i === 0 ? "sm:pl-0" : ""}`}
            >
              <dt className="sr-only">{p.label}</dt>
              <dd className="text-4xl font-medium tracking-[-0.03em]">{p.value}</dd>
              <dd className="mt-2 max-w-[16rem] text-sm leading-relaxed text-muted">{p.label}</dd>
            </div>
          ))}
        </dl>
      </Container>

      <Container className="py-28">
        <SectionHeading eyebrow="Selected work" title="Case studies" action={{ href: "/projects", label: "All projects" }} />
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {featured.map((p, i) => (
            <FeaturedCard key={p.slug} project={p} index={i} className={i === 0 && featured.length % 2 === 1 ? "lg:col-span-2" : ""} />
          ))}
        </div>
      </Container>

      <Container className="pb-28">
        <SectionHeading eyebrow="Experience" title="Where I've worked" action={{ href: "/experience", label: "Full experience" }} />
        <ul className="mt-10 border-t border-line">
          {roles.map((r) => (
            <li key={r.company} className="grid gap-2 border-b border-line py-7 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-8">
              <div>
                <p className="text-xl font-medium tracking-tight">
                  {r.company} <span className="text-muted">· {r.title}</span>
                </p>
                <p className="mt-2 max-w-2xl text-muted">{r.summary}</p>
              </div>
              <p className="font-mono text-xs text-faint">
                {r.start} to {r.end}
              </p>
            </li>
          ))}
          <li className="grid gap-2 border-b border-line py-7 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-8">
            <div>
              <p className="text-xl font-medium tracking-tight">
                {education.school.replace("National Institute of Technology", "NIT")}{" "}
                <span className="text-muted">· {education.degree}</span>
              </p>
            </div>
            <p className="font-mono text-xs text-faint">{education.period}</p>
          </li>
        </ul>
      </Container>

      {posts.length > 0 && (
        <Container className="pb-28">
          <SectionHeading eyebrow="Writing" title="Notes from production" action={{ href: "/blog", label: "All posts" }} />
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-line p-6 transition-colors hover:border-line-strong hover:bg-panel"
                >
                  <span className="font-mono text-[11px] text-faint">
                    {formatDate(post.date)} · {post.readingMinutes} min
                  </span>
                  <span className="mt-4 text-lg leading-snug font-medium tracking-tight group-hover:text-signal">
                    {post.title}
                  </span>
                  <span className="mt-3 text-sm leading-relaxed text-muted">{post.description}</span>
                  <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm text-fg">
                    Read
                    <Arrow className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      )}

      <Container className="pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-panel px-7 py-14 sm:px-14 sm:py-20">
          <div className="pointer-events-none absolute -right-20 -bottom-28 size-96 rounded-full bg-[radial-gradient(circle,#ffb35c24,transparent_70%)]" />
          <p className="eyebrow">Contact</p>
          <h2 className="mt-4 max-w-2xl text-4xl leading-[1.05] font-medium tracking-[-0.035em] sm:text-5xl">
            Building something that has to <span className="font-serif italic">work on its own</span>?
          </h2>
          <p className="mt-5 max-w-xl text-lg text-muted">I&apos;m always happy to talk about agents, search or a product you want to get right.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href={`mailto:${site.email}`}>Email me</ButtonLink>
            <ButtonLink href={site.links.linkedin} variant="ghost" external>
              LinkedIn
            </ButtonLink>
          </div>
        </div>
      </Container>
    </>
  );
}

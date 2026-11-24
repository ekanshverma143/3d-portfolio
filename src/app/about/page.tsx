import type { Metadata } from "next";
import { ButtonLink, Container, JsonLd, PageHeader } from "@/components/ui";
import { skills } from "@/content/experience";
import { personSchema } from "@/content/person";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Ekansh Verma: software engineer from Kullu, Himachal Pradesh, NIT Hamirpur graduate, building AI agents and full-stack products in Noida.",
  alternates: { canonical: "/about" },
};

const principles = [
  {
    title: "Facts in code, judgement in the model",
    body: "Models are good at deciding what to do next and bad at remembering numbers. I compute the facts and let the model reason over them.",
  },
  {
    title: "Autonomy is earned in steps",
    body: "Start with a human approving every write. Measure. Then remove approvals where the system has proven itself, never all at once.",
  },
  {
    title: "Ship, then watch it in production",
    body: "Most of what I know came from reading logs after a release. I build the kill switch, the dry run and the audit trail before the feature.",
  },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          url: `${site.url}/about`,
          name: `About ${site.name}`,
          mainEntity: personSchema,
        }}
      />
      <PageHeader
        eyebrow="About"
        title={
          <>
            I like systems that <span className="font-serif italic">do the work</span>, not just describe it
          </>
        }
      />
      <Container className="grid gap-16 pb-24 lg:grid-cols-[1fr_20rem]">
        <div className="max-w-2xl space-y-6 text-lg leading-[1.8] text-[#c9c7c2]">
          <p>
            I&apos;m Ekansh, a software engineer from Kullu in Himachal Pradesh, now based in {site.location}. I studied
            electrical engineering at NIT Hamirpur, where I was UI/UX lead for Google Developer Student Clubs, secretary
            of the ISTE chapter, and built websites for college fests and clubs.
          </p>
          <p>
            My first job was frontend work on industrial AI products at Tecnod8.ai, where I ended up leading the frontend
            team for clients like DENSO and Maruti Suzuki. Today I&apos;m an SDE at GoodSpace AI, where I build the agents
            behind hiring: one that runs a recruiting mandate from job description to invoice, Autopilot, which applies to
            jobs on a member&apos;s behalf, a realtime voice interviewer, and the semantic search recruiters use to find
            people. I also rebuilt our premium Gold plans on Razorpay.
          </p>
          <p>
            The thread through all of it is that I care about what happens after the demo. An agent that works once is
            easy. An agent that a team trusts with real email, real candidates and real money needs permissions,
            approvals, retries, budgets and a way to switch it off. That part is the fun part for me.
          </p>
          <p>
            Outside work I build small things: a local AI assistant that runs on my laptop&apos;s 4 GB GPU, and websites for
            businesses back home in the mountains.
          </p>
          <div className="flex flex-wrap gap-3 pt-4">
            <ButtonLink href="/projects">See the work</ButtonLink>
            <ButtonLink href={site.resume} variant="ghost">
              Download resume
            </ButtonLink>
          </div>
        </div>
        <aside className="space-y-4 lg:pt-2">
          {principles.map((p) => (
            <div key={p.title} className="rounded-2xl border border-line p-6">
              <p className="font-medium">{p.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
            </div>
          ))}
        </aside>
      </Container>

      <Container className="pb-28">
        <p className="eyebrow">Toolbox</p>
        <h2 className="mt-3 text-3xl font-medium tracking-[-0.03em]">What I work with</h2>
        <dl className="mt-10 grid border-t border-line sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((s) => (
            <div key={s.group} className="border-b border-line py-6 sm:pr-8">
              <dt className="font-mono text-xs text-faint">{s.group}</dt>
              <dd className="mt-3 leading-relaxed text-fg">{s.items.join(", ")}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </>
  );
}

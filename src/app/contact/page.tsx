import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { CopyEmail } from "@/components/copy-email";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Ekansh Verma about engineering roles, AI systems or a product you want built.",
  alternates: { canonical: "/contact" },
};

const channels = [
  { label: "LinkedIn", value: "ekansh-verma", href: site.links.linkedin, note: "Messages and connection requests" },
  { label: "GitHub", value: "ekanshverma143", href: site.links.github, note: "Code and side projects" },
  { label: "Resume", value: "PDF, 2 pages", href: site.resume, note: "Download the latest version" },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title={
          <>
            Let&apos;s talk about <span className="font-serif italic">what you&apos;re building</span>
          </>
        }
        intro="Engineering roles, AI systems that need to hold up in production, or a product that needs one person to own it end to end. Email is the fastest way to reach me."
      />
      <Container className="pb-28">
        <div className="rounded-3xl border border-line bg-panel p-7 sm:p-10">
          <p className="eyebrow">Email</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <a
              href={`mailto:${site.email}`}
              className="text-2xl font-medium tracking-tight break-all transition-colors hover:text-signal sm:text-4xl"
            >
              {site.email}
            </a>
            <CopyEmail email={site.email} />
          </div>
          <p className="mt-4 text-sm text-muted">I usually reply within a day. Based in {site.location} (IST, UTC+5:30).</p>
        </div>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {channels.map((c) => (
            <li key={c.label}>
              <a
                href={c.href}
                {...(c.href.startsWith("http") ? { target: "_blank", rel: "me noopener noreferrer" } : {})}
                className="group block h-full rounded-2xl border border-line p-6 transition-colors hover:border-line-strong hover:bg-panel"
              >
                <span className="eyebrow">{c.label}</span>
                <span className="mt-3 block text-lg font-medium group-hover:text-signal">{c.value}</span>
                <span className="mt-1 block text-sm text-muted">{c.note}</span>
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}

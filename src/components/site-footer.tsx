import Link from "next/link";
import { nav, site } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-lg font-medium tracking-tight">{site.name}</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Software engineer building agentic AI systems, search and full-stack products. Based in {site.location}.
          </p>
          <a href={`mailto:${site.email}`} className="link-underline mt-5 inline-block text-sm text-fg">
            {site.email}
          </a>
        </div>
        <div>
          <p className="eyebrow">Pages</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-muted transition-colors hover:text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow">Elsewhere</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a href={site.links.github} className="text-muted transition-colors hover:text-fg" rel="me">
                GitHub
              </a>
            </li>
            <li>
              <a href={site.links.linkedin} className="text-muted transition-colors hover:text-fg" rel="me">
                LinkedIn
              </a>
            </li>
            <li>
              <a href={site.resume} className="text-muted transition-colors hover:text-fg">
                Resume (PDF)
              </a>
            </li>
            <li>
              <a href="/blog/rss.xml" className="text-muted transition-colors hover:text-fg">
                RSS
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-6 font-mono text-xs text-faint sm:px-8">
        <span>© {new Date().getFullYear()} {site.name}</span>
        <span>Built with Next.js and three.js</span>
      </div>
    </footer>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader, Tag } from "@/components/ui";
import { formatDate, getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Notes from building production AI agents, realtime voice, semantic search and full-stack products: what worked, what broke and why.",
  alternates: { canonical: "/blog" },
};

function Cover({ slug, eager = false, fill = false }: { slug: string; eager?: boolean; fill?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/blog/${slug}/cover.svg`}
      alt=""
      width={1200}
      height={630}
      loading={eager ? "eager" : "lazy"}
      className={`block w-full transition-transform duration-500 group-hover:scale-[1.02] ${fill ? "h-full object-cover" : "h-auto"}`}
    />
  );
}

export default function BlogIndex() {
  const [latest, ...rest] = getAllPosts();
  return (
    <>
      <PageHeader
        eyebrow="Writing"
        title={
          <>
            Notes from <span className="font-serif italic">production</span>
          </>
        }
        intro="What I learn building AI agents, voice, search and products that real people depend on. Mostly about the parts that broke first."
      />
      <Container className="pb-28">
        {latest && (
          <Link
            href={`/blog/${latest.slug}`}
            className="group grid overflow-hidden rounded-3xl border border-line bg-panel/60 transition-colors hover:border-line-strong lg:grid-cols-[1.25fr_1fr]"
          >
            <div className="overflow-hidden border-b border-line lg:border-r lg:border-b-0">
              <Cover slug={latest.slug} eager fill />
            </div>
            <div className="flex flex-col p-7 sm:p-9">
              <span className="font-mono text-xs text-faint">
                Latest · {formatDate(latest.date)} · {latest.readingMinutes} min read
              </span>
              <span className="mt-4 text-2xl leading-snug font-medium tracking-tight transition-colors group-hover:text-signal sm:text-3xl">
                {latest.title}
              </span>
              <span className="mt-3 leading-relaxed text-muted">{latest.description}</span>
              <span className="mt-auto flex flex-wrap gap-2 pt-6">
                {latest.tags.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </span>
            </div>
          </Link>
        )}

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line transition-colors hover:border-line-strong hover:bg-panel"
              >
                <div className="overflow-hidden border-b border-line">
                  <Cover slug={post.slug} />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <span className="font-mono text-[11px] text-faint">
                    {formatDate(post.date)} · {post.readingMinutes} min
                  </span>
                  <span className="mt-3 text-lg leading-snug font-medium tracking-tight transition-colors group-hover:text-signal">
                    {post.title}
                  </span>
                  <span className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{post.description}</span>
                  <span className="mt-auto flex flex-wrap gap-2 pt-5">
                    {post.tags.slice(0, 2).map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}

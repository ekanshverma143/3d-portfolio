import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader, Tag } from "@/components/ui";
import { formatDate, getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Notes from building production AI agents, semantic search and full-stack products: what worked, what broke and why.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const posts = getAllPosts();
  return (
    <>
      <PageHeader
        eyebrow="Writing"
        title={
          <>
            Notes from <span className="font-serif italic">production</span>
          </>
        }
        intro="What I learn building AI agents, search and products that real people depend on. Mostly about the parts that broke first."
      />
      <Container className="pb-28">
        <ul className="border-t border-line">
          {posts.map((post) => (
            <li key={post.slug} className="border-b border-line">
              <Link
                href={`/blog/${post.slug}`}
                className="group grid gap-3 py-8 sm:grid-cols-[9rem_1fr] sm:gap-8"
              >
                <span className="font-mono text-xs text-faint sm:pt-1.5">{formatDate(post.date)}</span>
                <span>
                  <span className="block text-xl font-medium tracking-tight transition-colors group-hover:text-signal sm:text-2xl">
                    {post.title}
                  </span>
                  <span className="mt-2 block max-w-2xl leading-relaxed text-muted">{post.description}</span>
                  <span className="mt-4 flex flex-wrap items-center gap-2">
                    {post.tags.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                    <span className="ml-1 font-mono text-[11px] text-faint">{post.readingMinutes} min read</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}

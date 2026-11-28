import type { Metadata } from "next";
import { BlogList } from "@/components/blog-list";
import { Container, PageHeader } from "@/components/ui";
import { formatDate, getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Writing",
  description:
    "Notes from building production AI agents, realtime voice, semantic search and full-stack products: what worked, what broke and why.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const posts = getAllPosts();
  const dates = Object.fromEntries(posts.map((p) => [p.slug, formatDate(p.date)]));
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
        <BlogList posts={posts} dates={dates} />
      </Container>
    </>
  );
}

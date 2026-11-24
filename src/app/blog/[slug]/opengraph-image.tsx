import { ogImage, ogSize } from "@/components/og";
import { formatDate, getAllPosts } from "@/lib/blog";

export const alt = "Blog post by Ekansh Verma";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getAllPosts().find((p) => p.slug === slug);
  return ogImage({
    eyebrow: "Writing",
    title: post?.title ?? "Writing",
    footer: `Ekansh Verma  ·  ${post ? formatDate(post.date) : ""}  ·  ekanshverma.site`,
  });
}

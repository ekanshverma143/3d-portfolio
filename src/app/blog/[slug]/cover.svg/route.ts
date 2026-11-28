import { coverSvg } from "@/lib/cover";
import { getAllPosts } from "@/lib/blog";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getAllPosts().find((p) => p.slug === slug);
  if (!post) return new Response("Not found", { status: 404 });
  return new Response(coverSvg(post.slug, post.tags), {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}

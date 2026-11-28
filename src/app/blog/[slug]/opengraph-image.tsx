import { ImageResponse } from "next/og";
import { ogSize } from "@/components/og";
import { formatDate, getAllPosts } from "@/lib/blog";
import { coverSvg } from "@/lib/cover";

export const alt = "Blog post by Ekansh Verma";
export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getAllPosts().find((p) => p.slug === slug);
  const title = post?.title ?? "Writing";
  const cover = `data:image/svg+xml;base64,${Buffer.from(coverSvg(slug, post?.tags ?? [])).toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", position: "relative", background: "#0f1114" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} width={1020} height={536} alt="" style={{ position: "absolute", left: 330, top: 47 }} />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            background: "linear-gradient(90deg, #0f1114 0%, #0f1114 40%, rgba(15,17,20,0.7) 62%, rgba(15,17,20,0) 85%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "64px 72px",
            color: "#e8e6e1",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: "#8d9099", letterSpacing: 3 }}>
            <div style={{ width: 14, height: 14, borderRadius: 999, background: "#ffb35c" }} />
            EKANSH VERMA · WRITING
          </div>
          <div style={{ display: "flex", fontSize: title.length > 60 ? 54 : 66, lineHeight: 1.08, letterSpacing: -2, maxWidth: 700 }}>
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#8d9099" }}>
            {post ? `${formatDate(post.date)}  ·  ${post.readingMinutes} min read  ·  ekanshverma.site` : "ekanshverma.site"}
          </div>
        </div>
      </div>
    ),
    ogSize,
  );
}

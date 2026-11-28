import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareBar } from "@/components/share-bar";
import { Arrow, Container, JsonLd, Tag } from "@/components/ui";
import { personId } from "@/content/person";
import { site } from "@/content/site";
import { formatDate, getAllPosts, getPost } from "@/lib/blog";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  const { meta } = post;
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.tags,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      siteName: site.name,
      locale: "en_IN",
      title: meta.title,
      description: meta.description,
      url: `/blog/${slug}`,
      publishedTime: meta.date,
      modifiedTime: meta.updated ?? meta.date,
      authors: [site.name],
      tags: meta.tags,
    },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const { meta, html } = post;
  const postUrl = `${site.url}/blog/${slug}`;
  const all = getAllPosts();
  const others = all.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: meta.title,
          description: meta.description,
          datePublished: meta.date,
          dateModified: meta.updated ?? meta.date,
          url: `${site.url}/blog/${slug}`,
          mainEntityOfPage: `${site.url}/blog/${slug}`,
          image: `${site.url}/blog/${slug}/opengraph-image`,
          keywords: meta.tags.join(", "),
          author: { "@type": "Person", "@id": personId, name: site.name, url: site.url },
        }}
      />
      <Container className="pt-36 sm:pt-44">
        <div className="mx-auto max-w-[44rem]">
          <Link href="/blog" className="group inline-flex items-center gap-2 font-mono text-xs text-muted hover:text-fg">
            <Arrow className="rotate-180 transition-transform group-hover:-translate-x-0.5" />
            All writing
          </Link>
          <h1 className="rise mt-8 text-4xl leading-[1.08] font-medium tracking-[-0.035em] text-balance sm:text-5xl">
            {meta.title}
          </h1>
          <p className="rise mt-5 text-lg leading-relaxed text-muted [animation-delay:80ms]">{meta.description}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-line py-4 font-mono text-xs text-faint">
            <span className="text-fg">{site.name}</span>
            <time dateTime={meta.date}>{formatDate(meta.date)}</time>
            <span>{meta.readingMinutes} min read</span>
            <span className="flex flex-wrap gap-2">
              {meta.tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </span>
          </div>
          <div className="mt-5">
            <ShareBar url={postUrl} title={meta.title} />
          </div>
          <figure className="mt-8 overflow-hidden rounded-2xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/blog/${slug}/cover.svg`}
              alt={`Illustration for ${meta.title}`}
              width={1200}
              height={630}
              className="block h-auto w-full"
              fetchPriority="high"
            />
          </figure>
          <div
            className="prose prose-invert prose-site prose-lg mt-10 max-w-none prose-headings:font-medium prose-p:leading-[1.8]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div className="mt-14 rounded-2xl border border-line bg-panel p-6 sm:p-7">
            <p className="text-lg font-medium tracking-tight">Found this useful? Pass it on.</p>
            <p className="mt-1 text-sm text-muted">Share it with a teammate or a group that would like it.</p>
            <div className="mt-5">
              <ShareBar url={postUrl} title={meta.title} />
            </div>
          </div>
        </div>
      </Container>

      {others.length > 0 && (
        <Container className="pt-20 pb-28">
          <div className="mx-auto max-w-[44rem] border-t border-line pt-10">
            <p className="eyebrow">Keep reading</p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {others.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="group block h-full overflow-hidden rounded-2xl border border-line transition-colors hover:border-line-strong hover:bg-panel"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/blog/${p.slug}/cover.svg`} alt="" width={1200} height={630} loading="lazy" className="block h-auto w-full border-b border-line" />
                    <span className="block px-5 pt-4 font-mono text-[11px] text-faint">{formatDate(p.date)}</span>
                    <span className="mt-2 block px-5 pb-5 font-medium tracking-tight group-hover:text-signal">{p.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      )}
    </article>
  );
}

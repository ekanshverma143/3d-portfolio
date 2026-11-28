import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const DIR = path.join(process.cwd(), "content", "blog");

export type PostMeta = {
  id: number;
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  tags: string[];
  readingMinutes: number;
};

type Frontmatter = Omit<PostMeta, "slug" | "readingMinutes"> & { draft?: boolean };

export const postPath = (p: Pick<PostMeta, "id">) => `/blog/${p.id}`;

function readRaw(slug: string) {
  const { data, content } = matter(fs.readFileSync(path.join(DIR, `${slug}.md`), "utf8"));
  const fm = data as Frontmatter;
  const words = content.split(/\s+/).filter(Boolean).length;
  if (!Number.isInteger(fm.id) || fm.id < 1) throw new Error(`Post ${slug} needs a positive integer "id" in its front matter`);
  const meta: PostMeta = {
    id: fm.id,
    slug,
    title: fm.title,
    description: fm.description,
    date: String(fm.date),
    updated: fm.updated ? String(fm.updated) : undefined,
    tags: fm.tags ?? [],
    readingMinutes: Math.max(1, Math.round(words / 220)),
  };
  return { meta, content, draft: Boolean(fm.draft) };
}

export const getAllPosts = cache((): PostMeta[] => {
  const posts = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => readRaw(f.replace(/\.md$/, "")))
    .filter((p) => !p.draft)
    .map((p) => p.meta)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  const seen = new Map<number, string>();
  for (const p of posts) {
    if (seen.has(p.id)) throw new Error(`Posts ${seen.get(p.id)} and ${p.slug} share id ${p.id}`);
    seen.set(p.id, p.slug);
  }
  return posts;
});

export const getPostById = (id: number | string) => getAllPosts().find((p) => p.id === Number(id));

export const getPost = cache(async (id: number | string) => {
  const found = getPostById(id);
  if (!found) return null;
  const { meta, content } = readRaw(found.slug);
  const html = String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypePrettyCode, { theme: "github-dark-dimmed", keepBackground: false })
      .use(rehypeStringify)
      .process(content),
  );
  const bySlug = new Map(getAllPosts().map((p) => [p.slug, p.id]));
  const linked = html.replace(/href="\/blog\/([a-z0-9-]+)(#[^"]*)?"/g, (m, s: string, hash = "") =>
    bySlug.has(s) ? `href="/blog/${bySlug.get(s)}${hash}"` : m,
  );
  const toc = [...linked.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map(([, id, inner]) => ({
    id,
    text: inner
      .replace(/<[^>]+>/g, "")
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .trim(),
  }));
  return { meta, html: linked, toc };
});

export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

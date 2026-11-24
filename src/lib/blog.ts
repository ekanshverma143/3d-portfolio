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
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  tags: string[];
  readingMinutes: number;
};

type Frontmatter = Omit<PostMeta, "slug" | "readingMinutes"> & { draft?: boolean };

function readRaw(slug: string) {
  const { data, content } = matter(fs.readFileSync(path.join(DIR, `${slug}.md`), "utf8"));
  const fm = data as Frontmatter;
  const words = content.split(/\s+/).filter(Boolean).length;
  const meta: PostMeta = {
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

export const getAllPosts = cache((): PostMeta[] =>
  fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => readRaw(f.replace(/\.md$/, "")))
    .filter((p) => !p.draft)
    .map((p) => p.meta)
    .sort((a, b) => b.date.localeCompare(a.date)),
);

export const getPost = cache(async (slug: string) => {
  if (!getAllPosts().some((p) => p.slug === slug)) return null;
  const { meta, content } = readRaw(slug);
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
  return { meta, html };
});

export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

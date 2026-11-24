import type { MetadataRoute } from "next";
import { projects } from "@/content/projects";
import { site } from "@/content/site";
import { getAllPosts } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const latest = posts[0]?.date ?? new Date().toISOString().slice(0, 10);
  const pages = ["", "/projects", "/experience", "/blog", "/about", "/resume", "/contact"].map((path) => ({
    url: `${site.url}${path}`,
    lastModified: path === "/blog" || path === "" ? latest : undefined,
    changeFrequency: (path === "/blog" ? "weekly" : "monthly") as "weekly" | "monthly",
    priority: path === "" ? 1 : 0.8,
  }));
  const caseStudies = projects
    .filter((p) => p.caseStudy)
    .map((p) => ({ url: `${site.url}/projects/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.7 }));
  const articles = posts.map((p) => ({
    url: `${site.url}/blog/${p.slug}`,
    lastModified: p.updated ?? p.date,
    changeFrequency: "yearly" as const,
    priority: 0.7,
  }));
  return [...pages, ...caseStudies, ...articles];
}

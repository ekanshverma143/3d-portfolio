import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

function legacyBlogRedirects() {
  const dir = path.join(process.cwd(), "content", "blog");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .flatMap((f) => {
      const id = fs.readFileSync(path.join(dir, f), "utf8").match(/^id:\s*(\d+)\s*$/m)?.[1];
      const slug = f.replace(/\.md$/, "");
      return id ? [{ source: `/blog/${slug}`, destination: `/blog/${id}`, permanent: true }] : [];
    });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/resume.pdf", destination: "/Ekansh_Verma_Resume.pdf", permanent: true },
      ...legacyBlogRedirects(),
    ];
  },
};

export default nextConfig;

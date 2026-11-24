# ekanshverma.site

Personal site of Ekansh Verma. Next.js 16 (App Router, fully static), Tailwind 4 and a three.js hero built with React Three Fiber.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
```

## Content

- Projects and case studies: `src/content/projects.ts` (a project with `caseStudy` gets its own page)
- Experience, education, skills: `src/content/experience.ts`
- Blog posts: Markdown files in `content/blog/` with `title`, `description`, `date`, `tags` front matter. Set `draft: true` to hide one.
- Site name, links, canonical URL: `src/content/site.ts`

Sitemap, robots.txt, RSS (`/blog/rss.xml`) and Open Graph images are generated from that content at build time.

## Resume

The resume source is `resume/resume.html`. To regenerate the PDF served at `/Ekansh_Verma_Resume.pdf`:

```bash
node scripts/build-resume.mjs
```

It prints with a local Chrome install (pass a different Chrome path as the first argument if needed).

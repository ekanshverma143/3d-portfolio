import { education, roles, skills } from "@/content/experience";
import { projects } from "@/content/projects";
import { site } from "@/content/site";
import { getAllPosts } from "@/lib/blog";

export const revalidate = 3600;

export function GET() {
  const posts = getAllPosts();
  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.name} is a software engineer based in ${site.location}, building agentic AI systems, realtime voice AI, semantic search and full-stack products. He is a Software Development Engineer at GoodSpace AI and a graduate of NIT Hamirpur.`,
    "",
    `- Website: ${site.url}`,
    `- GitHub: ${site.links.github}`,
    `- LinkedIn: ${site.links.linkedin}`,
    `- Email: ${site.email}`,
    `- Resume (PDF): ${site.url}${site.resume}`,
    "",
    "## Experience",
    ...roles.map((r) => `- ${r.title}, ${r.company} (${r.location}), ${r.start} to ${r.end}: ${r.summary}`),
    `- ${education.degree}, ${education.school}, ${education.period}`,
    "",
    "## Case studies",
    ...projects
      .filter((p) => p.caseStudy)
      .map((p) => `- [${p.title}](${site.url}/projects/${p.slug}): ${p.summary}`),
    "",
    "## Other projects",
    ...projects.filter((p) => !p.caseStudy).map((p) => `- ${p.title} (${p.org}): ${p.summary}`),
    "",
    "## Writing",
    ...posts.map((p) => `- [${p.title}](${site.url}/blog/${p.id}): ${p.description}`),
    "",
    "## Skills",
    ...skills.map((s) => `- ${s.group}: ${s.items.join(", ")}`),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

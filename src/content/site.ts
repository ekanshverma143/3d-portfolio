export const site = {
  name: "Ekansh Verma",
  url: "https://www.ekanshverma.site",
  title: "Ekansh Verma | Software Engineer, AI Systems",
  role: "Software Development Engineer",
  tagline: "Full-stack and AI systems",
  description:
    "Ekansh Verma is a software engineer in Noida, India, building agentic AI systems, semantic search and full-stack products. SDE 1 at GoodSpace AI.",
  location: "Noida, India",
  email: "ekanshverma143@gmail.com",
  resume: "/Ekansh_Verma_Resume.pdf",
  links: {
    github: "https://github.com/ekanshverma143",
    linkedin: "https://www.linkedin.com/in/ekansh-verma-469557228",
  },
} as const;

export const nav = [
  { href: "/projects", label: "Work" },
  { href: "/experience", label: "Experience" },
  { href: "/blog", label: "Writing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

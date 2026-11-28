import { education } from "./experience";
import { site } from "./site";

export const personId = `${site.url}/#person`;

export const personSchema = {
  "@type": "Person",
  "@id": personId,
  name: site.name,
  givenName: "Ekansh",
  familyName: "Verma",
  url: site.url,
  image: `${site.url}/app-icon/512`,
  email: `mailto:${site.email}`,
  jobTitle: site.role,
  description: site.description,
  worksFor: { "@type": "Organization", name: "GoodSpace AI", url: "https://goodspace.ai" },
  alumniOf: [
    { "@type": "CollegeOrUniversity", name: education.school, sameAs: "https://nith.ac.in" },
    { "@type": "Organization", name: "Tecnod8.ai" },
  ],
  homeLocation: { "@type": "Place", name: "Noida, Uttar Pradesh, India" },
  sameAs: [site.links.github, site.links.linkedin],
  knowsAbout: [
    "AI agents",
    "LLM tool calling",
    "Model Context Protocol",
    "Semantic search",
    "Realtime voice AI",
    "WebRTC",
    "Razorpay subscriptions",
    "Next.js",
    "Node.js",
    "TypeScript",
  ],
};

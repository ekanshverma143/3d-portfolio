export type Role = {
  company: string;
  url?: string;
  title: string;
  location: string;
  start: string;
  end: string;
  summary: string;
  points: string[];
  stack: string[];
};

export const roles: Role[] = [
  {
    company: "GoodSpace AI",
    url: "https://goodspace.ai",
    title: "Software Development Engineer 1",
    location: "Noida",
    start: "Jan 2026",
    end: "Present",
    summary:
      "AI-first hiring platform. I build the agents, realtime voice, search and internal platforms behind recruiting: about 3,300 commits and 2,300 merged feature and fix pull requests across ten repositories since January.",
    points: [
      "Built the Mandate Assistant, an AI recruiting agent that runs a client mandate end to end through 42 permission-scoped tools, with read-only SQL under a time limit and row cap, an approval card on every write, and a headless driver that moves a mandate through seven stages to invoice and collection.",
      "Extended the same engine into three more agents for leadership, sales and email operations (40 to 53 tools each), checked against an eval set of real questions on live data, with prompt caching, live spend tracking and a multi-account provider pool that fails over on its own.",
      "Rebuilt the AI video interview on Amazon Nova Sonic over WebRTC, replacing socket.io audio over TCP: RTP paced at 20 ms on a drift-corrected clock, model streams rotated at turn boundaries to outlive an 8-minute cap in 15-minute interviews, and zombie sessions that held capacity for 16+ hours fixed.",
      "Built GOODex end to end: replaced regex candidate matching with semantic search on OpenSearch and Voyage embeddings, tuned it on live traffic, shipped it as a metered external API with hashed keys and org credits, and moved its UI from Vite to Next.js in 6 days.",
      "Built LLM lead qualification where the model returns sourced company facts and code computes a 10-point ICP score, plus a router that assigns qualified leads to in-office reps every 10 minutes with accept-or-reassign.",
      "Moved WhatsApp to Meta's Cloud API with signed webhooks into a Kafka consumer, and built the multi-channel outreach and screening flows on top: voice calls, agent-written email, WhatsApp screening and a BullMQ reply loop into LLM analysis.",
      "Stopped heavy dashboards from overloading MySQL with a Redis single-flight cache and per-request query budgets; before the fix, about half of dashboard requests ended with the client giving up.",
      "Extended Gold subscriptions on Razorpay (7-day trial, pricing revamp, payment attribution) and fixed an outage that broke every webhook renewal. Also co-built Goodness Score v2, and built background verification, cross-platform QR login and the public site's technical SEO.",
    ],
    stack: ["Node.js", "Express", "Next.js", "React", "MySQL", "MongoDB", "Redis", "BullMQ", "Kafka", "OpenSearch", "WebRTC", "Claude", "AWS Bedrock"],
  },
  {
    company: "Tecnod8.ai",
    title: "Frontend Developer, Frontend Team Lead",
    location: "Remote",
    start: "Dec 2024",
    end: "Jan 2026",
    summary: "Industrial AI products. I led frontend delivery for enterprise clients and in-house AI tools.",
    points: [
      "Built frontends for in-house AI products: an agentic 3D training platform for a technical college, an agentic robot program generator, and a video anomaly monitoring system for PLC lines at DENSO International.",
      "Designed and built warehouse management interfaces for Maruti Suzuki (MSIL).",
      "Rebuilt the company website with a clearer user flow, and found and fixed the SEO defects that were suppressing organic reach.",
      "Led frontend delivery for client work as team lead.",
    ],
    stack: ["React", "Next.js", "TypeScript", "three.js", "Tailwind CSS", "Redux"],
  },
];

export const education = {
  school: "National Institute of Technology, Hamirpur",
  degree: "B.Tech. in Electrical Engineering",
  period: "Dec 2021 to May 2025",
  location: "Himachal Pradesh",
};

export const leadership = [
  { title: "UI/UX Lead", org: "Google Developer Student Clubs, NIT Hamirpur", period: "2023 to 2024" },
  { title: "Secretary", org: "Indian Society for Technical Education, NIT Hamirpur chapter", period: "2024 to 2025" },
];

export const skills: Array<{ group: string; items: string[] }> = [
  { group: "Languages", items: ["TypeScript", "JavaScript", "SQL", "Python", "Dart", "HTML", "CSS"] },
  { group: "Frontend", items: ["React", "Next.js", "Redux", "Zustand", "Tailwind CSS", "three.js", "Flutter", "Chrome Extensions"] },
  { group: "Backend", items: ["Node.js", "Express", "REST APIs", "BullMQ", "Kafka", "Webhooks", "Server-Sent Events", "WebRTC", "FastAPI"] },
  { group: "Data and search", items: ["MySQL", "MongoDB", "PostgreSQL", "Redis", "OpenSearch (vector and full-text)"] },
  { group: "AI systems", items: ["Claude Managed Agents", "Tool calling", "MCP", "Prompt caching", "Evals", "Embeddings and rerank", "Realtime speech (Nova Sonic)"] },
  { group: "Cloud and tools", items: ["AWS (Bedrock, SES, ECR)", "GCP", "Vercel", "Docker", "GitHub Actions", "Git"] },
];

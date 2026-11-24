export type Project = {
  slug: string;
  title: string;
  kind: "work" | "personal" | "client";
  org: string;
  period: string;
  summary: string;
  stack: string[];
  metrics?: Array<{ value: string; label: string }>;
  links?: Array<{ label: string; href: string }>;
  featured?: boolean;
  caseStudy?: {
    role: string;
    problem: string;
    approach: Array<{ title: string; body: string }>;
    outcome: string[];
  };
};

export const projects: Project[] = [
  {
    slug: "mandate-assistant",
    title: "Mandate Assistant",
    kind: "work",
    org: "GoodSpace AI",
    period: "Oct to Nov 2026",
    featured: true,
    summary:
      "An AI recruiting agent that runs a client hiring mandate end to end, from job description to invoice, with real tools, an approval gate on every write and a headless driver that needs no browser open.",
    stack: ["Claude Managed Agents", "Tool calling", "Node.js", "MySQL", "MongoDB", "Redis", "BullMQ", "React"],
    metrics: [
      { value: "42", label: "custom tools, each scoped to its operator" },
      { value: "7", label: "pipeline stages driven without a human" },
      { value: "4", label: "agents now running on the same engine" },
      { value: "12", label: "real questions in the live-data eval set" },
    ],
    caseStudy: {
      role: "Designed and built the agent, its tool layer, the headless driver and the shared engine the later agents run on.",
      problem:
        "A recruiting mandate is a long chain of small jobs spread across email, WhatsApp, calls and documents: engineer the job description, collect the client's questionnaire, source and score candidates, screen them, keep the client updated, move people through offer and joining, then invoice. Each step is easy. Keeping hundreds of them moving at once, without dropping a thread, is where a recruiter's week goes. The goal was an agent that does the actual work across those systems while staying exactly as trustworthy as the person operating it.",
      approach: [
        {
          title: "Borrow the operator's permissions, never more",
          body: "The agent acts through 42 server-side tools that run as the signed-in user. SQL reads go through a read-only transaction with a 20 second execution limit and a 200 row cap. Document reads are limited to seven allowlisted collections. Everything else goes through the existing admin API with that user's own token, so the agent can never do more than the person in front of it.",
        },
        {
          title: "Every write is a card",
          body: "Read calls run immediately. Every call that changes something waits for an Approve or Reject card that shows the exact payload, and destructive actions are blocked outright. That one rule is what made it safe to give a model real tools on the first day.",
        },
        {
          title: "Facts live in code, not in the model",
          body: "Each turn starts from a snapshot of the mandate built by about ten parallel reads, cached for a minute and re-sent only when its hash changes, so most questions need no tool call at all. Derived facts such as how long a stage has stalled are computed in code and handed to the model as plain statements.",
        },
        {
          title: "Raise autonomy one step at a time",
          body: "First, approval cards for everything. Then an autopilot mode with a hard step cap. Then a headless driver: a mandate owned by a bot account with its own narrow role, which wakes on intake, a client reply, a due date, a signed gate or a ten-minute tick, approves only safe cards, and stops at every sign-off gate. A per-mandate Redis queue holds wakes that cannot run yet. It runs intake through offer, joining, invoice and collection.",
        },
        {
          title: "One engine, four agents",
          body: "The same engine now runs three more agents: one that answers leadership questions from live data (53 tools), one for the sales pipeline (50 tools, co-built with a teammate) and one for email operations (40 tools). Quality is checked against an eval set of twelve real leadership questions run on live data, rather than on how answers look.",
        },
        {
          title: "Make it boring to operate",
          body: "Every agent runs on a pool of provider accounts that switches over automatically when one runs out of credit, and chats survive the switch because history lives in the database. Agent definitions are kept as code and synced to every account by one script with a dry run. A per-turn cost ledger and live spend tracking led to concrete cuts, such as sending about 8K characters of standing rules once per session instead of with every message.",
        },
      ],
      outcome: [
        "Mandates move through all seven pipeline stages without a human, pausing only where a signed approval is required.",
        "The agent can do anything its operator can and nothing more, which is what made the team comfortable turning autonomy up.",
        "Agent changes ship like code: reviewed, diffed and synced to every account in one step.",
      ],
    },
  },
  {
    slug: "goodspace-autopilot",
    title: "GoodSpace Autopilot",
    kind: "work",
    org: "GoodSpace AI",
    period: "2026",
    featured: true,
    summary:
      "A job application engine that finds roles, tailors the resume, fills company application forms through a Chrome extension and follows up from the member's own Gmail.",
    stack: ["Node.js", "BullMQ", "Redis", "Server-Sent Events", "Chrome Extension", "Gmail API", "AWS SES", "LLMs"],
    metrics: [
      { value: "3", label: "services in one run engine" },
      { value: "4", label: "ATS platforms filled" },
      { value: "2.8k to 1.3k", label: "tokens of tool declarations" },
      { value: "Oct 2026", label: "released to every member" },
    ],
    caseStudy: {
      role: "The idea was mine. I built the run engine, the form-filling resolver, the assistant and the delivery loop across three services, with Akshat as the designer.",
      problem:
        "Applying for jobs is the same work repeated: find a role, check it fits, find who is hiring, tailor the resume, write a cover letter, fill a long form, send, follow up. Members wanted all of it done for them. The hard part is doing it without guessing: a wrong answer on an application form or a careless email costs the member a real opportunity.",
      approach: [
        {
          title: "A step-level state machine",
          body: "Each application is a run made of steps: track, ATS scan, find the hiring contact, tailor the resume, write the cover letter, draft, send. Every step is its own queue job. Retrying a step reopens the steps that depend on it and voids their old approvals, so nothing is sent on stale work. A kill switch, typed outcomes and a sweeper that expires stale runs keep the system predictable.",
        },
        {
          title: "Form filling as a resolver, not a guess",
          body: "A Chrome extension reads the application form and the server answers each field in order of trust: the member's profile, a self-learning answer bank, earlier answers matched by meaning with a second model acting as judge, and only then a draft written strictly from evidence. Fields that must never be auto-filled are refused, and coverage is reported per ATS for Greenhouse, Lever, Ashby and Workable.",
        },
        {
          title: "An assistant on rails",
          body: "The model chooses which tool to call, but the server supplies the facts and matches the run. Common intents are handled with no model call at all. Tool declarations were cut from about 2.8k to 1.3k tokens around a stable cached prefix, and a second model takes over on any failure.",
        },
        {
          title: "Closing the loop on delivery",
          body: "Emails leave from the member's own Gmail over OAuth inside a morning send window. Replies come back through an HMAC-signed relay address on SES. Approvals also work as a WhatsApp reply, and polling was replaced with per-user live events over Redis and Server-Sent Events.",
        },
      ],
      outcome: [
        "Released to every member in October 2026.",
        "Applications go out from the member's own identity, with every risky field either grounded in evidence or left for the member.",
        "Lower model cost per turn from the cached prefix and the no-model fast paths.",
      ],
    },
  },
  {
    slug: "realtime-voice-interviewer",
    title: "Realtime voice interviewer",
    kind: "work",
    org: "GoodSpace AI",
    period: "Aug to Sep 2026",
    featured: true,
    summary:
      "Rebuilt the AI video interview on Amazon Nova Sonic speech-to-speech, moving candidate audio off socket.io over TCP and onto a WebRTC media track.",
    stack: ["Amazon Nova Sonic", "AWS Bedrock", "WebRTC", "werift", "Node.js", "RTP"],
    metrics: [
      { value: "20 ms", label: "RTP pacing on a drift-corrected clock" },
      { value: "15 min", label: "interviews on a model stream capped near 8" },
      { value: "~1%", label: "of one CPU core for audio encoding" },
      { value: "6.2k", label: "lines changed in the rebuild" },
    ],
    caseStudy: {
      role: "Rebuilt the interview server's media path and model integration, with supporting changes in the web app and API.",
      problem:
        "Candidates take a timed video interview with an AI interviewer that listens and speaks in real time. Audio travelled over socket.io, which runs on TCP. On real home and mobile networks that meant multi-second stalls, single sentences that played as two overlapping voices, clear English transcribed as Hindi, and an interviewer that lost the thread around the eight minute mark. In a high-stakes conversation, each of those makes the product feel broken.",
      approach: [
        {
          title: "Put audio on a media track, not a socket",
          body: "TCP guarantees order, so one lost packet holds back everything behind it and a brief blip becomes a stall of several seconds. On a WebRTC media track the same loss is a 20 ms gap, and the browser adds echo cancellation, a jitter buffer and retransmission requests. The server side uses werift, a WebRTC implementation for Node.js.",
        },
        {
          title: "Measure the audio instead of guessing",
          body: "Bugs were found from captured audio and session stats rather than by ear. One capture showed the server sending 11.8 seconds of audio in 7 seconds of wall time, faster than real time. RTP is now paced at 20 ms on a schedule that corrects for drift.",
        },
        {
          title: "One voice per sentence",
          body: "Audio for one sentence could arrive over two paths and play as two overlapping voices. Each utterance now latches to a single transport.",
        },
        {
          title: "Interruptions that don't confuse the transcriber",
          body: "When a candidate talks over the interviewer, a short hangover after the barge-in stopped clipped audio from being transcribed in the wrong language.",
        },
        {
          title: "Outlive the stream cap",
          body: "The speech model's streams end at roughly eight minutes and interviews run fifteen. Streams now rotate at a turn boundary before the cap and carry the conversation's context across, so the candidate never hears the interviewer start over.",
        },
        {
          title: "Give back what you hold",
          body: "A reconnect counter that could never reach its limit let one dead phone session reconnect every 58 seconds for more than 16 hours while holding an interview slot. Fixing the counter returned that capacity.",
        },
      ],
      outcome: [
        "Fifteen-minute interviews run on a model stream that is capped near eight.",
        "Packet loss costs a 20 ms gap instead of a multi-second stall.",
        "Audio encoding takes about 0.15 ms per frame, roughly 1% of one CPU core, so the media path is never the bottleneck.",
      ],
    },
  },
  {
    slug: "goodex-semantic-search",
    title: "GOODex",
    kind: "work",
    org: "GoodSpace AI",
    period: "Feb to Oct 2026",
    featured: true,
    summary:
      "Recruiter-facing semantic candidate search on OpenSearch and Voyage embeddings, tuned on live traffic and shipped as a metered external API.",
    stack: ["OpenSearch", "Voyage embeddings", "KNN", "Gemini", "Node.js", "MongoDB", "Redis", "Next.js"],
    metrics: [
      { value: "14", label: "enriched fields added to the index" },
      { value: "11 weeks", label: "of relevance work on live traffic" },
      { value: "6 days", label: "to move the UI from Vite to Next.js" },
    ],
    caseStudy: {
      role: "Built the product end to end: index enrichment, query parsing, ranking, the API and the UI.",
      problem:
        "Recruiters searched candidates with regex matching over titles and skills. It missed obvious matches, ranked badly and could not tell a senior engineer from someone who once listed a keyword. Search is the first thing a recruiter touches, so relevance problems quickly became trust problems.",
      approach: [
        {
          title: "An index built for meaning",
          body: "Fourteen enriched fields per candidate, KNN vector search over Voyage embeddings, and a full-text fallback for exact names and rare terms that embeddings handle poorly. A language model parses the recruiter's query into structure before anything is searched.",
        },
        {
          title: "Relevance as a programme, not a launch",
          body: "Eleven weeks of tuning on live traffic: experience proximity, profile completeness, compensation and company match. Results are re-ranked after fetch against MongoDB as the source of truth, so stale index data never decides the final order. Later work added Voyage rerank and treated location as a score rather than a filter.",
        },
        {
          title: "A product, not just an endpoint",
          body: "Shipped as a metered external API with one unified endpoint for search, enrichment and contact, an append-only usage log, organisation-level credits and free-tier quotas. API keys are stored only as SHA-256 hashes, and key checks are cached in Redis so authentication does not hit the database on every call. The full UI moved from Vite to Next.js in six days.",
        },
      ],
      outcome: [
        "Replaced regex matching across recruiter search.",
        "Available outside the product as a metered API with keys, quotas and usage history.",
      ],
    },
  },
  {
    slug: "gold-premium-plans",
    title: "Gold: premium plans on Razorpay",
    kind: "work",
    org: "GoodSpace AI",
    period: "May to Jul 2026",
    featured: true,
    summary:
      "Rebuilt GoodSpace's premium plans on Razorpay: a legacy multi-plan catalog collapsed into one Gold product with 1, 3 and 6 month terms, a 7-day free trial, payment attribution on every surface and a fix for a silent renewal outage.",
    stack: ["Razorpay Subscriptions", "Webhooks", "Node.js", "MySQL", "Next.js", "Flutter"],
    metrics: [
      { value: "1", label: "Gold product replacing a catalog of legacy plans" },
      { value: "3", label: "terms: 1, 3 and 6 months" },
      { value: "7 days", label: "free trial with its own states" },
      { value: "Web + app", label: "same plans and attribution on both" },
    ],
    caseStudy: {
      role: "Led the Gold revamp across the backend, the web app and the mobile app: catalog migration, the trial, pricing, payment attribution and the renewal fix.",
      problem:
        "Premium had grown into a catalog of overlapping legacy plans. Members found it hard to choose, the team found it hard to change anything, and every new surface had to understand every old plan. Renewals ran on payment webhooks, and there was little visibility into where a paying member had come from.",
      approach: [
        {
          title: "One product, three terms",
          body: "The legacy catalog was migrated into a single Gold product with 1, 3 and 6 month terms. Legacy plans were retired from sale so new purchases only see Gold, while members already on an old plan keep what they paid for.",
        },
        {
          title: "A trial is a state, not a flag",
          body: "The 7-day free trial got its own place in the subscription state machine. Claiming it activates a TRIALING subscription, and cancelling during the trial keeps the member's entitlement until the trial ends instead of cutting them off on the spot.",
        },
        {
          title: "Attribution on every payment surface",
          body: "Every Razorpay checkout records where it came from, including the page, the surface and the device, across the web app and the Flutter app, so the team can see which surfaces actually convert.",
        },
        {
          title: "Webhooks you can trust",
          body: "Renewals were failing silently. The cause was a database connection copied with an object spread, which dropped mysql2's execute method, combined with a payment claim written outside the transaction, which made every failure impossible to retry. A one-line hotfix stopped it, then the claim moved inside the transaction so the provider's retry really retries.",
        },
        {
          title: "The same patterns for API plans",
          body: "GOODex's external API uses the same building blocks: organisation-scoped Razorpay subscriptions, free-tier quotas and idempotent credit accounting.",
        },
      ],
      outcome: [
        "Members choose between three terms of one product instead of a catalog of legacy plans.",
        "Renewals that had been failing silently were restored, and a failed webhook can now be retried safely.",
        "Every payment carries its source, on the web and in the app.",
      ],
    },
  },
  {
    slug: "lead-qualification",
    title: "LLM lead qualification and routing",
    kind: "work",
    org: "GoodSpace AI",
    period: "Oct to Nov 2026",
    summary:
      "The model returns sourced company facts and code computes the score. A router then assigns qualified leads to reps who are in the office, with accept-or-reassign.",
    stack: ["Claude", "Web search tools", "BullMQ", "Node.js", "MySQL"],
  },
  {
    slug: "dashboard-performance",
    title: "Dashboards that stopped overloading their database",
    kind: "work",
    org: "GoodSpace AI",
    period: "Oct 2026",
    summary:
      "A Redis single-flight cache and per-request MySQL query budgets, so concurrent misses share one 15 to 20 second aggregation and no query starts after the client has gone.",
    stack: ["Redis", "MySQL", "Node.js"],
  },
  {
    slug: "whatsapp-cloud-api",
    title: "WhatsApp on Meta's Cloud API",
    kind: "work",
    org: "GoodSpace AI",
    period: "Oct 2026",
    summary:
      "Moved WhatsApp off a third-party provider onto Meta's Cloud API, with signed webhooks into a Kafka consumer, real per-message costs, template health and a self-hosted team inbox.",
    stack: ["Meta Cloud API", "Kafka", "Chatwoot", "Node.js"],
  },
  {
    slug: "goodness-score",
    title: "Goodness Score v2",
    kind: "work",
    org: "GoodSpace AI",
    period: "May to Jul 2026",
    summary:
      "Co-built a behavioural assessment with AI scoring, peer validation, shareable certificates and a video pledge transcoded to H.264 off the request path.",
    stack: ["Node.js", "LLMs", "FFmpeg", "Next.js"],
  },
  {
    slug: "audit-trail-backfill",
    title: "An audit trail, recovered",
    kind: "work",
    org: "GoodSpace AI",
    period: "Aug 2026",
    summary:
      "Recovered admin change history from before the audit trail existed by replaying MongoDB's oplog. Unknown actors are recorded as null, never guessed. Idempotent and dry-run by default.",
    stack: ["MongoDB", "Oplog", "Node.js"],
  },
  {
    slug: "jarvis",
    title: "Jarvis",
    kind: "personal",
    org: "Side project",
    period: "2026",
    summary:
      "A local, always-on AI assistant tuned for a 4 GB GPU laptop. One click checks drivers and installs Python, Ollama and the model, then starts the chat.",
    stack: ["Python", "Ollama", "Qwen3", "uv"],
  },
  {
    slug: "rental-search",
    title: "Rental search assistant",
    kind: "personal",
    org: "Side project",
    period: "2026",
    summary:
      "Type \"2bhk in Pune under 20000\" and an LLM turns it into structured filters, with a regex fallback when the model fails, then searches live listings.",
    stack: ["Next.js", "Llama 3.1 8B", "SerpAPI", "MongoDB"],
  },
  {
    slug: "git-backed-cms",
    title: "Git-backed portfolio CMS",
    kind: "personal",
    org: "Side project",
    period: "2026",
    summary:
      "A portfolio site whose hidden admin saves by committing JSON and images to GitHub, so every edit redeploys on Vercel with no database.",
    stack: ["Next.js", "TypeScript", "GitHub API", "Framer Motion"],
  },
  {
    slug: "small-business-sites",
    title: "Websites for small businesses",
    kind: "client",
    org: "Freelance",
    period: "2025 to 2026",
    summary:
      "Sites for local businesses in Himachal: a bilingual bridal makeup studio with WhatsApp booking and a guided query bot, and a homestay with rooms, gallery and booking links.",
    stack: ["Next.js", "Tailwind", "SEO", "JSON-LD"],
    links: [
      { label: "Bridal studio", href: "https://shringar-co.vercel.app" },
      { label: "Homestay", href: "https://kudhalhomestay.vercel.app" },
    ],
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);

---
title: "Shipping vectors took a week. Making search good took eleven."
description: "Lessons from replacing regex candidate matching with semantic search on OpenSearch and Voyage embeddings, and the relevance work that came after launch."
date: "2026-11-14"
id: 27
tags: ["Search", "Embeddings", "OpenSearch"]
---

GOODex is the candidate search recruiters use at GoodSpace. When I picked it up, it matched candidates with regular expressions over titles and skills. It missed obvious matches, ranked strangely, and could not tell a senior engineer from someone who had once typed a keyword into their profile.

Getting vector search running was the quick part. Making the results good enough that recruiters trusted them took an eleven-week relevance programme on live traffic. These are the lessons from that second part.

## Start with an index built for meaning

The index has fourteen enriched fields per candidate. Some are raw, like titles and skills. Others are derived before indexing, so ranking can use them directly without computing anything at query time.

Profile text is embedded with Voyage and searched with KNN. Next to it sits a plain full-text index, because embeddings are weak in a few places that matter a lot in recruiting:

- exact names of people and companies,
- rare skills, acronyms and product names,
- very short queries with almost no context.

So search is hybrid. Vectors handle "find me people like this", and full text catches the cases where the recruiter means exactly what they typed.

## Relevance is a programme, not a launch

Semantic search returns results that *look* reasonable almost immediately. That is the trap. Plausible results are easy to produce and hard to evaluate, and you can spend weeks admiring them.

What actually moved quality were specific, boring signals, each added and checked one at a time.

**Experience proximity.** A search for someone with three to five years should not put a fifteen-year veteran first just because their profile text is rich. Rather than a hard filter, which throws away good near-misses, candidates are scored by how close they are to the target band.

**Profile completeness.** Sparse profiles produce vague embeddings, and vague embeddings drift towards the middle of everything. Without a correction, thin profiles floated up for unrelated queries.

**Compensation and company match.** For many roles, these decide whether a recruiter will even open a profile. Treating them as ranking signals, not just filters, kept good candidates visible while ordering them sensibly. Later work did the same for location, and added a reranking model on top.

## The index is not the source of truth

Search indexes are eventually consistent. A candidate updates their profile, changes jobs or leaves the market, and the index catches up later.

So results are re-ranked after they are fetched. The top candidates are checked against MongoDB, the actual source of truth, and anything stale is corrected before the recruiter sees it. It costs one extra round trip and protects against a whole class of "why is this person here?" moments.

## Treat search as a product

Once quality held up, search was shipped beyond our own UI as a metered external API: one endpoint for search, enrichment and contact, an append-only usage log, and credit quotas per organisation. Keys are stored only as SHA-256 hashes, and key checks are cached in Redis for a few minutes so authentication does not hit the database on every call.

Building that layer changes how you think about search. Every query has a cost and an owner, and usage shows which kinds of searches people actually run, which is the best input for the next round of relevance work.

The UI was re-platformed from Vite to Next.js during the same period, in six days, so the product and the engine could keep moving together.

## What I would do the same way again

1. **Ship hybrid from day one.** Pure vector search fails on exactly the queries power users type most.
2. **Add one ranking signal at a time.** When several change together, you cannot tell which one helped and which one hurt.
3. **Prefer soft scoring to hard filters.** Recruiters want the near-miss candidate shown lower, not hidden.
4. **Re-check the top results against the source of truth.** Freshness bugs look like relevance bugs from the outside.
5. **Judge changes by real usage.** What recruiters actually search for and act on beats any query you make up at your desk.

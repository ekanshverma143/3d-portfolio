---
title: "Embeddings in production are mostly plumbing"
description: "Picking an embedding model is the quick decision. What to embed, when to re-embed, how to stay fresh and how to meter search as an API is the real work."
date: "2026-10-27"
tags: ["Embeddings", "Search", "Product engineering", "Security"]
---

Calling an embedding API takes a few lines. Running embeddings for real, on data that changes every day, with other teams and customers depending on the results, takes a lot more. GOODex, the semantic candidate search I built at GoodSpace, taught me where that extra work goes.

I wrote about relevance, the ranking signals that made results good, in [Shipping vectors took a week. Making search good took eleven.](/blog/semantic-search-relevance) This post is about the plumbing underneath: what goes into a vector, what stays out, how vectors stay current, and what changes when search becomes an API.

## Enrich before you embed

Raw records make poor embedding input. A candidate profile is a mix of free text, half-filled fields, contact details, IDs and formatting noise. Embed that directly and part of the vector represents noise. Two similar engineers can land far apart because one pasted a long resume and the other filled in three fields.

GOODex indexes 14 enriched fields per candidate in OpenSearch. Some are raw, like titles and skills; others are derived before indexing, so ranking can use them without computing anything at query time. Whatever your domain, the text you embed deserves the same treatment:

- **A fixed template.** The same fields, in the same order, with the same labels, for every record. Then differences between vectors come from differences between people, not between formats.
- **Leave out what carries no meaning.** Emails, phone numbers, URLs and internal IDs add nothing to similarity and can add noise.
- **Version the template.** It is code. When it changes, old and new vectors were built from different inputs, and you need to know which is which.

## Embed meaning, keep facts as fields

The most useful decision is what not to embed.

Embeddings are good at "what kind of work does this person do". They are poor at numbers, exact names and anything you filter or compute on. "5 years of experience" and "15 years of experience" sit close together in embedding space. To a recruiter they are different candidates.

The rule of thumb I use:

- **Embed** descriptions of work: roles, responsibilities, skills in context, summaries.
- **Keep as structured fields** anything you filter, sort, score or must get exactly right: years of experience, location, compensation, notice period, dates, current company.

Structured fields are what made signals like experience proximity and location-as-a-score possible. A vector cannot tell you how far someone is from a three-to-five-year band. A number can.

The query side mirrors this. GOODex parses a recruiter's query with an LLM (Gemini) into structure, so constraints like location and experience can be handled as fields instead of being blurred into the text that gets embedded. It is also worth knowing that many embedding APIs, Voyage's included, let you say whether a text is a query or a document. A ten-word query and a long profile are different kinds of text, and the model can treat them that way if you tell it.

## Re-embed when the text changes, not when the record does

Records change constantly, and most changes do not touch anything you embedded. A last-active timestamp or an application status has no business triggering an embedding call.

The cheap way to handle this is to store, next to each vector, a hash of the exact text that was embedded, plus the model name and template version. On every update, rebuild the text and compare hashes. Same hash: skip. Different hash: re-embed. One check removes most embedding calls and makes backfills safe to re-run.

Changing the embedding model is a different event. Vectors from two models live in different spaces and cannot be compared, and their dimensions may not even match. That means a full re-index: build a new index with the new model next to the old one, backfill it, compare results on real queries, then switch an alias so readers move over in one step. Never mix models in one index.

Deletes need the same care. A candidate who deletes their profile or leaves the market has to leave the index too, or similarity search will keep finding them.

## Trust the source, not the index

Even with careful updates, an index trails the database. Every sync pipeline has lag and the occasional dropped event. So GOODex re-ranks after fetching, checking the top results against MongoDB, the source of truth, before a recruiter sees them.

A check like that can be useful twice. It protects the user from stale results, and it can measure the sync. If the freshness check keeps correcting the same kind of field, the problem is in the pipeline, not in ranking, and that is far easier to see in a counter than in complaints about relevance.

Storing vectors well also gives you features almost for free. "Similar profiles" is a KNN query that starts from a candidate's existing vector. There is no new text to embed and no model to call, just a lookup.

## Search as an API: keys, quotas and retries

Once search was good, it was exposed as a metered external API. That brings problems retrieval itself never has.

**Keys are stored only as SHA-256 hashes.** API keys are long random strings, unlike passwords, so a fast hash is enough: it cannot be reversed, and a lookup by hash is one indexed read. A slow password hash would add cost to every request for no gain.

**Authentication is cached in Redis for five minutes,** so a busy client does not hit the database on every call.

```js
// Simplified sketch
import { createHash } from "node:crypto";

async function authenticate(rawKey) {
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const cached = await redis.get(`auth:${keyHash}`);
  if (cached) return JSON.parse(cached);

  const key = await db.apiKeys.findOne({ keyHash, revokedAt: null });
  if (!key) return null; // never cache a miss as a success
  const principal = { orgId: key.orgId, keyId: key.id };
  await redis.set(`auth:${keyHash}`, JSON.stringify(principal), "EX", 300);
  return principal;
}
```

The trade-off of the cache is revocation. A revoked key keeps working until its cache entry expires, unless revoking also deletes the entry. Decide which behaviour you want and write it down.

**One unified endpoint** keeps authentication, metering and logging in one place instead of several.

**An append-only usage log** records every metered call as a row that is never edited. Org credits and free-tier quotas are enforced per organisation, and the log is the record of what each call used. When someone asks why their credits went down, the answer is a query, not an argument.

**Idempotency** handles the retries every client eventually sends: networks drop, timeouts fire, SDKs retry by default. Without it, a retried search is metered twice. With an idempotency key, a repeat of the same request returns the original result and records no new usage.

## Takeaways

1. **Embed from cleaned fields** with a fixed, versioned template, not from raw records.
2. **Embed descriptions of work.** Keep numbers, places and names as structured fields.
3. **Hash the embedded text** and re-embed only when that hash changes.
4. **Changing models means a new index** and an alias switch, never a mix in one index.
5. **Check top results against the source of truth,** and count what the check corrects.
6. **Hash API keys, cache auth briefly, log usage append-only** and make retries idempotent.

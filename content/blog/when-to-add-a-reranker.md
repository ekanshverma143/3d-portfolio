---
title: "When to add a reranker"
description: "A reranking model is often the biggest single relevance gain in a search stack. Where it sits, how many results to send it, and when it is the wrong fix."
date: "2026-10-31"
tags: ["Search", "RAG", "Embeddings", "Cost"]
---

Both search systems I have worked on at GoodSpace end with a reranking model. GOODex, the candidate search recruiters use, added Voyage rerank in its later ranking work. The candidate pool ranking for open roles uses it too. In both, it earns its place, and in both it would be easy to put in the wrong place.

This post is about the reranker on its own: what it does that retrieval cannot, where it belongs in the pipeline, how much to feed it, and when it will not help.

## What a reranker does differently

Retrieval with embeddings uses what is called a bi-encoder. The query and each document are turned into vectors separately, and relevance is the distance between them. That separation is what makes it fast: document vectors are computed once, ahead of time, and a search is a nearest-neighbour lookup.

It is also the limit. The document's vector was built without knowing the query. Everything about the document is squeezed into one point in space, and the query can only ask "how close are you overall?".

A reranker is a cross-encoder. It reads the query and one document together and returns a relevance score for that pair. Because it sees both at once, it can notice things a distance cannot: that the role asks for five years of Java and the profile mentions Java once, in a team description; that "no agency experience" is a negation, not a keyword; that one clause of a long query matters more than the rest.

The price is that nothing can be precomputed. Every query pays for every document it reranks, at query time.

## Where it sits

The order that has worked for me:

1. **Retrieve wide and cheap.** Vectors, BM25, keyword lookups. The job here is recall.
2. **Rerank a shortlist.** The cross-encoder orders candidates by text relevance.
3. **Combine with structured scores.** Experience band, location, industry match. These are facts, and a text model should not override them. GOODex treats location as a score, and that score is combined with relevance, not replaced by it.
4. **Apply hard rules last, in code.** In the pool ranking, a failed must-have question zeroes the score whatever the reranker said.

The reason for putting rules after the model is simple. The reranker does not know your business rules, and you do not want a fluent profile to outrank a hard requirement it fails. A model's opinion belongs in the middle of the pipeline; the non-negotiables belong at the end.

## How many to send it

This is the main lever, and it pulls two ways. Send too few and the reranker is capped by retrieval: it cannot promote a candidate it never saw. Send too many and cost and latency grow roughly in line with the number of documents and their length.

I would size it from data rather than instinct. Log where the results people actually act on sat in the first-stage ranking. If the candidates recruiters open almost never come from below position N, sending three times N is waste. If they regularly come from just above your cut-off, the cut-off is too tight, and good ones are probably falling just below it as well.

The shape of the product matters as much as the numbers. An interactive search has a recruiter waiting, so the shortlist has to be small enough for one quick call. Pool ranking is different: the "query" is a role that changes rarely, and fit scores are re-run when the criteria or the job description change. That shape can afford a much bigger set; the pool ranking works on the top 2,000 (more on that in [Rank the top 2,000, not the top 200](/blog/hybrid-search-bm25-vectors-rerank)).

## What you send matters too

Rerankers read a limited amount of text per document, and anything past that is cut off. So do not send a raw profile and hope. Build a compact document for the reranker: title, recent roles, skills and a short summary, in roughly that order, so that if anything gets truncated it is the least important part.

This is where enrichment pays off a second time. If fields are cleaned and derived before indexing, the rerank text can be assembled from them instead of from whatever the candidate happened to type.

## Scores are an order, not a percentage

A reranker's score is good at ordering documents for one query. It is not automatically a calibrated probability, and 0.8 for one query does not mean the same as 0.8 for another. Two consequences:

- **Be careful with fixed thresholds** like "hide anything below 0.5". Check them across many queries before trusting them.
- **Do not show the raw number** to users as "80% match". It invites a trust the number has not earned.

## Evidence beats a score

A score alone, however good, asks the reviewer to take it on faith. Recruiters do not, and they are right not to. So ranking in both systems moved towards evidence: alongside the order, show why. Which skills matched, which industry credit applied, how experience compares with the band, which must-have questions passed. In the pool ranking, the evidence behind each score is shown to reviewers.

Evidence helps engineers as much as users. When a ranking looks wrong, the evidence tells you which stage to blame. A good candidate missing from the list is a retrieval problem. Present but low despite strong evidence points at the reranker or the text you sent it. Ranked high on weak evidence is usually a structured score or a rule.

## When a reranker is the wrong fix

- **Recall is the problem.** If the right documents are not retrieved, reranking just reorders the wrong set. Fix retrieval first.
- **The query is a lookup.** Names, IDs and exact titles want exact matching, not a relevance model.
- **The order is defined by data.** "Newest first" or "closest first" is a sort, not a judgement.
- **The latency budget is tiny.** Type-ahead suggestions cannot wait for a model call per keystroke.
- **You cannot measure it.** Without a way to tell whether ordering improved, you are adding latency on faith.

## Takeaways

1. **Retrieval is for recall, the reranker is for precision.** Neither does the other's job.
2. **Put the reranker in the middle.** After cheap retrieval, before structured scores and hard rules.
3. **Size the shortlist from evidence.** Look at how deep the results people act on actually come from.
4. **Build a compact rerank document.** Truncation drops the end, so put the important parts first.
5. **Treat scores as an order and show evidence.** Never present a rerank score as a percentage.

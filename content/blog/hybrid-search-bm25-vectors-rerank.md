---
title: "Rank the top 2,000, not the top 200"
description: "How I combine BM25, dense vectors, keyword recall and structured match matrices to rank a candidate pool, and why the first stage should be generous."
date: "2026-11-04"
id: 17
tags: ["Search", "Embeddings", "RAG"]
---

When a recruiter opens a role at GoodSpace, one of the first things they want is a ranked list of people already in our candidate pool who could fit it. The ranking I built for that in September 2026 starts with a decision that looks like a detail: it ranks the whole top 2,000 candidates for a role, not the top 200.

That number is the main design choice. The rest of the system follows from it.

## Every retriever has blind spots

The obvious design is to embed the job description, run a vector search, take the top 200 and polish their order. It produces good-looking results quickly, which is why it is tempting.

The problem is what it never sees. Dense retrieval ranks by overall similarity of meaning. A candidate whose profile is short, written in a different vocabulary, or dominated by an earlier career can sit at position 700 in the vector list and still be one of the best fits for the role. If the pipeline cuts at 200, nothing later can bring them back. A reranker reorders what it is given; it cannot find what it was never sent.

So the first stage has one job, which is recall: make sure the right people are somewhere in the set. Precision belongs to the later stages, and they need room to work.

## Three ways in

The pool is assembled from more than one retriever, each covering a different weakness.

**Dense vectors** find people who do similar work in different words. "Backend engineer" and "server-side developer" land near each other, and so do two people who built payment systems at very different companies.

**BM25 sparse vectors** reward exact term overlap. BM25 weights each matching term by how rare it is across the collection, so a match on an unusual framework counts for far more than a match on "team". It also saturates term frequency, so a profile cannot win by repeating a keyword twenty times, and it normalises for document length. Embeddings are weakest on exactly what BM25 does well: acronyms, product names, certifications and rare skills. Represented as a sparse vector, one weight per term, it can live next to the dense vectors and be scored alongside them.

**Keyword recall** is a separate list with a narrower job. It is not there to score anyone. It pulls in candidates whose profiles literally contain the role's key terms, so a requirement stated in plain words cannot be lost because the profile as a whole scored low on similarity.

Merging the lists needs care, because their scores are on different scales. A BM25 score and a cosine similarity are not comparable numbers. One common way round this is reciprocal rank fusion, which uses only each candidate's rank in each list:

```js
// Simplified sketch: merge ranked lists by rank, and remember who found whom
function fuse(lists, { k = 60, limit = 2000 } = {}) {
  const pool = new Map();
  for (const [source, hits] of Object.entries(lists)) {
    hits.forEach((hit, i) => {
      const entry = pool.get(hit.id) ?? { id: hit.id, fused: 0, foundBy: {} };
      entry.fused += 1 / (k + i + 1);
      entry.foundBy[source] = i + 1;
      pool.set(hit.id, entry);
    });
  }
  return [...pool.values()].sort((a, b) => b.fused - a.fused).slice(0, limit);
}
```

Whatever the merge, keep `foundBy`. When a result looks wrong, the first question is which retriever brought it in, and you want the answer without re-running the search.

## Structured fields need a matrix, not a vector

Some of the strongest signals in recruiting are not text at all. Industry and functional area are categories from a closed list. A role in one industry should treat a candidate from an adjacent industry differently from one in an unrelated industry, and none of the text methods above get this right. Embedding a one-word label says little, and BM25 on category names is all or nothing.

So these fields go through a match matrix: for each pair of categories, a number for how close they are. The same category gets full credit, a neighbouring one partial credit, an unrelated one little or none. Say a role is in lending: a candidate from payments might get most of the credit, one from insurance some, one from hospitality almost none. (Those values are illustrative; the real ones are a business decision.) Functional area works the same way: a backend role might give some credit to platform engineering and very little to sales.

A matrix has three properties I like. It is explainable: a reviewer can see why a candidate got industry credit. It is editable by people who know the market, without retraining anything. And it is fast, one lookup per candidate, which matters when you are scoring 2,000 of them.

The same thinking applies to other structured fields. GOODex, our recruiter search, treats location as a score rather than a filter: a near-miss on a structured field should push a candidate down, not hide them.

## Then score, then gate

Once the pool exists, it is ranked as a whole: a Voyage reranking model for text relevance, reading the role and the profile together, and the matrices for structured fields. What a reranker buys and how much to send it is its own topic, in [When to add a reranker](/blog/when-to-add-a-reranker).

Must-haves come last and are absolute. If a role has must-have questions and a candidate fails one, the score is zero, whatever any model thought. That rule lives in code after all the scoring, because no model should be able to talk its way past it.

Two more rules keep the ranking honest over time. Fit scores re-run when the criteria or the job description change, because a ranking computed against last week's requirements is quietly wrong. And the evidence behind each score is shown to the reviewer. A recruiter who can see why someone ranked third can disagree with it usefully, and a recruiter who cannot see why will simply stop trusting the list.

## Why 2,000 is affordable

Ranking ten times as many candidates sounds expensive. Most of it is not. The first stage reads from indexes: vector search, BM25 and keyword lookups are all cheap, and asking each for more hits costs little next to a model reading full profiles. Matrix lookups are close to free. The stage that reads full text is the costly one, and its size is a separate decision.

The expensive mistake is the opposite one: spending real effort polishing the order of 200 candidates while the best fit sits at 700, unseen.

## What I would keep

1. **Treat the first stage as recall.** Size it by how deep good results really sit, not by what feels tidy.
2. **Use sparse and dense together.** BM25 catches exact terms, vectors catch meaning, and each covers the other's blind spot.
3. **Give stated requirements their own way in.** A keyword recall list stops them being outvoted by overall similarity.
4. **Merge by rank, not raw score.** Scores from different retrievers are not on the same scale.
5. **Model categories as categories.** A match matrix is explainable, editable and fast.
6. **Put absolute rules in code, last.** Must-haves zero the score after every model has had its say.

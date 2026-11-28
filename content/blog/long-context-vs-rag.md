---
title: "Long context or RAG? For live data, often neither"
description: "Stuffing the context window and RAG are not the only options. For live data, computing a small fresh state every turn often beats both on cost and accuracy."
date: "2026-10-22"
id: 4
tags: ["RAG", "LLMs", "AI agents", "Cost"]
---

Every LLM feature that answers questions about your data has to decide how that data reaches the model. The debate usually has two sides. Put everything in the context window, because windows are big now. Or retrieve only the relevant pieces, because windows are expensive and models get distracted.

Both are right for some workloads. In the agents I have built at GoodSpace, the most useful answer was often a third option that rarely comes up in that debate: do not hand the model documents at all. Compute the state it needs, keep it small, and give it a fresh copy on every turn.

## Option one: put it all in the window

Long context is the simplest thing that works. No index, no chunking, no retrieval bugs. The model sees everything, so it can connect facts that sit far apart, and you never wonder whether the right passage was fetched.

The costs are real, though.

**You pay for every token on every turn.** A twenty-turn conversation over a large document sends that document twenty times. Prompt caching softens this a lot, but only for a prefix that does not change. The moment the material changes, the cache is gone.

**More context is not free accuracy.** Models do find things in long inputs, but irrelevant material is not neutral. It competes for attention, and a near-duplicate passage or an outdated version of the same fact can win.

**It is a photograph.** Whatever you loaded is true at the moment you loaded it. If the data underneath changes during the session, the model keeps answering from the old copy with full confidence.

Long context fits material that is stable, bounded and needed often. The long scoring rubrics and reference prompts our agents use are exactly that, which is why they sit at the start of the prompt with prompt caching on. They are read on almost every turn and they rarely change.

## Option two: retrieve what looks relevant

Retrieval scales to collections you could never fit in a window. GOODex, the candidate search I worked on, is retrieval at heart: nobody is putting a candidate database into a prompt.

Retrieval brings its own failure modes.

**Recall is the ceiling.** If the right chunk is not retrieved, the model cannot use it, and it rarely says "I did not get the right document". It answers from what it did get.

**Chunks lose their surroundings.** A paragraph that says "the deadline moved to Friday" is useless without knowing which project and which week.

**Similarity is not aggregation.** "How many candidates are waiting for client feedback?" is not a question any document answers. It is a count over rows. Retrieval will happily return three documents about candidates waiting for feedback, and the model will count three.

**The index lags the source.** Indexes are eventually consistent, so the newest change is the one most likely to be missing. (I wrote about re-checking results against the source of truth in [Shipping vectors took a week](/blog/semantic-search-relevance).)

Retrieval fits large collections where the question is "find the passages about X": search, documentation, support history.

## Option three: compute the state

A lot of what agents get asked is neither of those. In the Mandate Assistant, which runs a recruiting mandate end to end, typical questions are "what is stuck?" and "has the client replied?". The answer is not in any document. It is a function of the current database.

So for those questions the assistant does not retrieve anything. Every turn it builds a compact snapshot from about ten reads that run in parallel: the mandate's stage, candidate counts per status, pending approvals, the latest client message and so on. A signals engine adds derived facts computed in code, such as how long the mandate has sat in its stage and which client emails are unanswered. The snapshot is cached for about 60 seconds and re-sent only when its hash changes.

```js
// Simplified sketch
async function contextForTurn(mandateId, session) {
  const { snapshot, hash } = await getSnapshot(mandateId); // cached ~60 s
  if (hash === session.lastSnapshotHash) {
    return "Mandate state unchanged since the last turn.";
  }
  session.lastSnapshotHash = hash;
  return renderSnapshot(snapshot); // small, typed, current
}
```

Most questions then need no tool call at all, because the answer is already in front of the model and it is current by construction. When the model needs more detail, it still has tools to drill down. The mechanics are in [Keep facts in code, not in the model](/blog/facts-in-code-not-in-the-model). Here the interesting part is how this compares with the other two options.

## Comparing the three

**Cost.** Long context grows with the size of the material times the number of turns. Retrieval costs a search per question plus the chunks it returns. A snapshot costs a handful of database reads and a small block of text, and almost nothing on turns where nothing changed. For live operational data it is the cheapest of the three by a wide margin.

**Freshness.** Long context is as fresh as the moment you loaded it. Retrieval is as fresh as the index. A snapshot is as fresh as the cache window, which you choose. A minute is fine for a recruiting pipeline; it would not be for a trading desk.

**Accuracy.** Long context and retrieval both ask the model to read and then compute: find the right rows, count them, subtract the dates. A snapshot moves the computing into code and leaves the model with reading and judgement, which is the part it is good at.

**Coverage.** This is where the snapshot loses. You have to decide in advance what state matters. Anything you did not design into it needs a tool call or retrieval. A snapshot is a product decision about what an agent in this job should always know, and it has to be revisited as the job changes.

## How I choose now

I ask what kind of thing the question is about.

- **Stable reference material** needed on most turns: put it in the window, early, and cache it.
- **A large collection** where questions look for passages: retrieve, and measure recall before you tune anything else.
- **Live state** where questions are counts, ages, statuses and "what changed": compute it in code, keep it small, refresh it every turn.

Real agents need all three at once. A cached rubric at the top of the prompt, a snapshot near the bottom, and tools or search for everything else. The order follows from the same logic: stable material first so the cache holds, volatile state last so it can change without breaking the cache.

Whatever mix you pick, test it against live data, not a frozen copy. The leadership agent I built answers questions from live data with 53 tools, and its eval set is 12 real leadership questions whose answers are checked against live data. A fixture would hide exactly the freshness problems that decide between these options.

## Takeaways

1. **Long context is a photograph.** Use it for material that does not change during the session, and cache it.
2. **Retrieval is bounded by recall, and it cannot count.** Do not send aggregation questions to a vector index.
3. **For live data, compute a compact state in code.** Send it every turn, or only when its hash changes.
4. **Stable first, volatile last.** That ordering is what keeps prompt caching working.
5. **Evaluate against live data.** Freshness is half of what you are choosing between.

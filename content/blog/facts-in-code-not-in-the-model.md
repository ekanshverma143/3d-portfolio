---
title: "Keep facts in code, not in the model"
description: "The agent failures that hurt most are not bad reasoning. They are confidently wrong facts. Here is how I moved facts out of the conversation and into code."
date: "2026-11-24"
tags: ["AI agents", "LLMs", "Prompt caching", "Cost"]
---

The agent failures that worry me most are rarely about reasoning. Models usually choose a sensible next step. What they get wrong are facts.

"The client hasn't replied in three days," when they replied this morning. "Four candidates are waiting for feedback," when two more arrived after the conversation started. "This stage is on track," when it has stalled for a week and nothing in the context says so.

Each of these sounds like a model problem. Each one is really a design problem: the model is being asked to *remember* or *compute* things that code can know for certain.

## Why models are bad at state

A conversation is a pile of snapshots. Every tool result is true at the moment it was fetched and silently goes stale after that. In a long session the context ends up holding several versions of the same fact, and the model has no reliable way to know which is current.

On top of that, models are weak at the boring arithmetic that state depends on: date differences, counts, "is this older than our target for this stage". They will produce a plausible number with full confidence.

So the rule I now follow is simple. If a wrong answer would be a bug, compute it in code. If it is a judgement call, ask the model.

## A fresh snapshot every turn

In the Mandate Assistant, every turn starts by rebuilding the facts from scratch. About ten queries run in parallel and produce a compact snapshot of the mandate: its stage, the candidate counts per status, pending approvals, the latest client message and so on.

```js
async function buildSnapshot(mandateId, ctx) {
  const [mandate, pipeline, approvals, lastClientMail /* ... */] = await Promise.all([
    ctx.api.get(`/mandates/${mandateId}`),
    ctx.db.pipelineCounts(mandateId),
    ctx.cards.pending(mandateId),
    ctx.mail.lastFromClient(mandateId),
  ]);
  const snapshot = { mandate, pipeline, approvals, lastClientMail };
  return { snapshot, hash: stableHash(snapshot) };
}
```

The snapshot is cached briefly, and it is hashed. If nothing changed since the previous turn, the model is told so in one line instead of receiving the same block again. That keeps the context from filling with near-duplicate copies of the truth.

The effect is that the model never has to wonder whether its information is current. The newest snapshot is, by construction, the truth.

## Signals instead of raw rows

Raw rows are still too much to reason about. The model does not need every timestamp; it needs to know what deserves attention.

So a small signals engine computes the derived facts deterministically: how long the mandate has been in its current stage compared to the target, which client emails are unanswered and for how long, which candidates are waiting on someone. The model receives these as plain statements.

If I had to keep only one of these ideas, it would be this one. A model that never does date subtraction never gets dates wrong.

## Memory belongs in the database

Some knowledge should outlive a conversation: what the client said they care about, which sourcing channels have already been tried, what a teammate learned yesterday. If that lives only in a chat transcript, it dies with the session and nobody else can see it.

The assistant writes that kind of knowledge into a shared per-mandate brief. Any session, for any user, reads the brief at the start. Research done by one recruiter on Monday is there for a different recruiter on Thursday.

## The payoff: conversations become disposable

Once the facts lived in the snapshot and the memory lived in the brief, the conversation itself stopped being precious.

Long sessions get expensive and drift. So past a token threshold the assistant starts a fresh session seeded with the snapshot and the brief. The user barely notices, because nothing important was stored only in the old conversation.

## The same idea, applied to cost

The agents I built after the Mandate Assistant, for leadership questions, sales and email operations, run on the same engine, and the same discipline paid off on cost.

Standing rules are facts too: facts about how to behave. They were being repeated with every message. About 8K characters of them went out on every turn, and in the most expensive sessions they made up around 40% of all message text. They now go once per session.

Prompt caching only pays off when the start of the prompt is stable, so order matters: system prompt, tool declarations and long reference material such as scoring rubrics first, the volatile snapshot last.

And because nothing important lives only in the conversation, fresh sessions can start earlier. Lowering those thresholds, from 100K and 300K tokens to 80K and 150K, cut cost without anyone noticing a difference in answers.

## A rule of thumb

When an agent gets something wrong, ask which kind of wrong it is.

If it chose a bad action from correct information, improve the prompt, the tools or the model. If it acted on a wrong fact, do not try to prompt your way out of it. Find where that fact should have come from, compute it in code, and hand it over fresh on every turn.

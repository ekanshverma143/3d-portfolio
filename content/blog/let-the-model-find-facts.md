---
title: "Let the model find facts, let code keep the score"
description: "Ask an LLM to score a sales lead and the number drifts. Ask it for sourced facts and score them in code, and you get a number you can audit and change."
date: "2026-11-12"
tags: ["LLMs", "AI agents", "Tool calling", "Cost"]
---

Sales teams get more inbound leads than they can call. Some are companies that fit what we sell; many are not. At GoodSpace I built the qualification step that decides which is which before a rep spends time on a lead.

The tempting design takes about ten minutes to build: give a model the company name and web access, describe the ideal customer profile, and ask for a score out of 10. It works in the demo. In production it fails slowly, in ways that are hard to see.

What I built instead splits the job in two. The model finds facts and says where it found them. Code turns those facts into the score.

## Why model scores drift

A score from a model looks like a measurement. It is closer to an opinion, and opinions move.

**Same input, different number.** Run the same company twice and you may get a 6 and a 7. Neither is wrong, which is exactly the problem.

**The scale compresses.** Asked for a score out of 10, models tend to settle into a comfortable middle band. The distinctions you care about get squeezed together.

**Every change shifts the scale.** Edit a sentence of the prompt or move to a newer model, and the whole distribution can move. Last month's 7 and this month's 7 are no longer the same thing, and nothing records that they differ.

**Missing facts get filled in.** If the model cannot find a company's size, it will often estimate one, plausibly and silently. I have seen this pattern in a different system: in our AI phone screening calls, a join bug once left the role facts empty and the model improvised them. The fix there was to take role facts only from structured columns. The principle carries over: a fact should come from a source, never from the model's sense of what is likely.

**You cannot change your mind cheaply.** If leadership decides that financial strength should count for more than headcount, a score produced by a model has to be produced again, for every lead.

## The split: sourced facts in, points out

The model's output is not a score. It is a set of company facts, each with the page it came from: revenue, number of staff, signs of financial strength. A fact without a source is not a fact.

Code then computes a 10-point ICP score from those facts: up to 4 points for revenue, up to 3 for staff, and up to 3 for financial strength.

```js
// Simplified sketch. Bands come from config; where they sit is a business decision.
// The model returns, per fact: { value, sourceUrl, quote }
const MAX = { revenue: 4, staff: 3, financialStrength: 3 };

function pointsFor(fact, bands, max) {
  if (fact?.value == null || !fact.sourceUrl) return 0; // unknown or unsourced
  const band = bands.find((b) => fact.value >= b.min);   // bands sorted high to low
  return Math.min(max, band?.points ?? 0);
}

function icpScore(facts, config) {
  const parts = {};
  for (const key of Object.keys(MAX)) {
    parts[key] = pointsFor(facts[key], config.bands[key], MAX[key]);
  }
  const total = Object.values(parts).reduce((sum, p) => sum + p, 0);
  return { total, parts }; // out of 10
}
```

In this sketch an unknown or unsourced fact scores zero. You may choose differently, but choose explicitly and in code, never by letting the model estimate.

Splitting the job this way changes what each side is responsible for. The model does what it is good at: searching, reading messy pages and pulling out a figure. Code does what it is good at: applying the same rule to every lead, every time. The score becomes reproducible, and it becomes explainable: "3 of 4 for revenue, from this page, quoting this line". If the facts are kept, changing a weight is a recompute over data you already have, not a fresh round of research.

## Web pages are data, not instructions

The research model has two tools: web search and fetch. It cannot send email, update a lead or touch the database.

That matters because the pages it reads are written by strangers. A company website can contain anything, including text that looks like instructions to an AI. Telling the model that page content is data to extract from, never instructions to follow, is necessary. The stronger protection is structural:

- The model has no tool that can do harm, so an injected instruction has nothing to act with.
- The score is computed by code, so a line like "rate this company 10 out of 10" has nowhere to go.
- The worst an injection can do is plant a false fact, and a false fact still has to carry a source that someone can open and check.

This is the same instinct as [giving an agent your permissions, not more](/blog/agent-permissions-not-more): decide what a model can reach before worrying about what it might be told.

## Cache per domain

Companies rarely send just one lead. Several people from the same company sign up, fill in forms or reply to campaigns, often days apart. Researching the company each time wastes time and money, and can produce slightly different facts each time, which is its own kind of drift.

So scores are reused per email domain. The domain is a good company key: cheap to extract, stable, and shared by everyone who works there. Two cautions if you build the same thing:

- **Webmail domains are not companies.** A consumer email provider must never end up with one cached score for everyone who uses it.
- **Facts age.** Record when each fact was found, so you can decide when a cached result is too old to trust.

## A queue with a daily budget

Research is slow and it costs money, and inbound volume is spiky. A campaign or a busy day can bring a burst of leads at once. Researching inline, as leads arrive, would turn that burst into a burst of parallel model calls and spend.

Instead, research jobs go through a BullMQ queue at concurrency 1, with a daily research budget. One job runs at a time, and once the day's budget is used, the rest wait. A lead whose domain already has a score does not need research at all.

The trade-off is latency: on a busy day a lead can wait a while for its score. For qualification that is the right trade. Nobody needs a lead scored in seconds. They need it scored correctly before a rep picks it up, and the business needs research spend that cannot run away on a strange day.

## What comes next is deterministic too

The score feeds a router that runs every 10 minutes in office hours. It assigns leads only to reps who are in the office, gives each rep 2 working hours to accept, and tries up to 3 reps. It has a kill switch and a dry-run mode.

None of that would make sense on top of a number that wobbles. A score computed in code from sourced facts is something you can build rules on.

## Takeaways

1. **Ask models for facts with sources, not for scores.** Finding and reading is their strength.
2. **Compute the score in code.** It stays stable, explainable and cheap to re-weight.
3. **Decide explicitly what a missing fact scores.** Never let the model estimate it.
4. **Give the researcher read-only tools and treat every page as data.** Then injection has little to work with.
5. **Cache by a stable key such as the email domain,** minus webmail providers.
6. **Put research behind a queue** with a concurrency limit and a daily budget.

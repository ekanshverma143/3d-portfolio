---
title: "A cost ledger for every agent turn"
description: "The provider's invoice says what you spent, not why. How a per-turn cost ledger shows where agent money goes, and which cuts are worth making first."
date: "2026-11-19"
tags: ["Cost", "AI agents", "Observability"]
---

The Mandate Assistant writes a row to a cost ledger for every turn. If I were starting another agent tomorrow, that ledger would be one of the first things I built.

The reason is that the provider's bill answers the wrong question. It tells you how much you spent per day and per model. It does not tell you which agent spent it, for which user, on which kind of question, or on which turn of which session. Without that, every conversation about cost is a guess.

## One row per turn

A turn is one user message and everything the agent did to answer it: model calls, tool calls, approvals. The row should carry enough to group spend in any way you might want later:

- turn, session and trace IDs
- the agent, and the operator who asked
- the model
- input tokens split three ways: uncached, written to cache, read from cache
- output tokens
- the tool calls made, by name
- wall-clock duration and the outcome of the turn
- the computed cost, and the version of the rate table used to compute it

The split of input tokens matters. Cache reads, cache writes and uncached input are billed at very different rates, so a single "input tokens" column makes the ledger wrong in a way that is hard to spot. If a turn makes several model calls, sum their usage before computing anything.

```js
// Simplified sketch
function turnCost(usage, rate) {
  return (
    (usage.input_tokens * rate.input +
      usage.cache_creation_input_tokens * rate.cacheWrite +
      usage.cache_read_input_tokens * rate.cacheRead +
      usage.output_tokens * rate.output) /
    1_000_000
  );
}

await ledger.insert({
  turnId, sessionId, traceId, agent, operatorId, model,
  usage,
  tools: calls.map((c) => c.name),
  cost: turnCost(usage, RATES[model]),
  ratesVersion: RATES.version,
  durationMs,
  outcome,
});
```

Store the computed cost at write time, along with the version of the rates. Rates change. If you recompute history from today's table, last month's numbers quietly change too.

## Reconcile with the provider's cost report

The ledger is an estimate. The provider's cost report is the bill. You need both, and they should agree.

Live spend comes straight from the provider's cost report, so the headline number is the one that will actually be charged. The ledger answers the attribution questions the report cannot: which agent, which user, which session.

When the two disagree by more than rounding, something is wrong, and it is usually one of these:

- **Calls outside the ledger.** A background scoring job, a one-off script or a retry path that calls the model without writing a row.
- **A stale rate table.** A model was added or changed and the table was not.
- **Charges that are not tokens.** Server-side tools such as web search, and hosted agent runtimes, can bill on top of tokens. A token-only ledger will read low.

Fix the gap before trusting either number for decisions.

## Where the money actually goes

Once the ledger exists, the first useful query is the most boring one: sort sessions by cost and read the top few.

In an agent, input tokens usually dominate. Every turn sends the whole conversation again, so the input for one turn grows with the length of the session, and the total input for a session grows roughly with the square of its length. Caching makes most of that history cheap to read, but not free, and anything written fresh each turn still adds up. A session that runs twice as long can cost much more than twice as much.

So look first at the long sessions, and at what their message text is made of. For our agents, about 8K characters of standing rules were being sent with every message, and in the most expensive sessions they made up around 40% of all message text.

Two other places are worth a look:

- **Tool results.** A tool that returns a large payload pays for it again on every later turn of the session. Caps help: the Mandate Assistant's SQL reads stop at 200 rows, which keeps one careless query from flooding the context.
- **Repeated state.** The per-turn snapshot is hashed and only re-sent when it changes, so a run of follow-up questions does not accumulate near-identical copies.

## The cuts, in the order I would make them

**1. Send standing rules once per session.** Same rules, a fraction of the text. This is the cheapest cut there is, because nothing about the agent's behaviour should change. I explained why caching did not already make this free in [Prompt caching is an ordering problem](/blog/prompt-caching-in-practice).

**2. Start fresh sessions earlier.** Past a token threshold, the assistant starts a new session from the current snapshot and the shared mandate brief. We lowered the thresholds from 100K and 300K tokens to 80K and 150K. Because turn cost grows with session size, that removes the most expensive turns: the ones at the end of long sessions. It only works because nothing important lives only in the conversation, which is the subject of [Keep facts in code, not in the model](/blog/facts-in-code-not-in-the-model).

**3. Do not call the model when you do not need to.** Autopilot handles common intents with no model call at all. The cheapest token is the one never sent.

**4. Use the smallest model that does the job.** Voice commands turn one utterance into one command on a small, fast model. Not every step needs the model that runs the agent.

**5. Trim what goes into every request.** Autopilot's tool declarations went from about 2.8k to about 1.3k tokens. Every request carries them, so the saving repeats on every call.

## Put limits in code

A ledger tells you what happened. Limits decide what can happen.

Autopilot mode in the Mandate Assistant has a step cap, so one runaway run has a ceiling. Lead qualification runs on a queue at concurrency 1 with a daily research budget, so a burst of new leads cannot turn into a burst of spend. Both are a few lines of code, and both are easier to reason about than an alert that fires after the money is gone.

The ledger and the limits work together. The ledger tells you where to set the limits, and the limits make the ledger's worst day predictable.

## What I would take from this

1. **Log cost per turn, with input split into uncached, cache write and cache read.**
2. **Reconcile against the provider's cost report.** The ledger attributes; the report is the bill.
3. **Read the costliest sessions first.** Length and repetition usually explain them.
4. **Cut repetition, then session length, then model calls.** And put hard limits in code before you need them.

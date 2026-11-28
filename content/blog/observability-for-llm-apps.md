---
title: "What to log for every agent turn"
description: "When an agent does something odd, you need the turn, not a guess. What I log for every LLM agent turn, how to keep it private, and the questions it answers."
date: "2026-10-26"
id: 8
tags: ["Observability", "AI agents", "Security"]
---

When a normal API misbehaves, the logs usually tell you. A request came in, something threw, and the status code says so.

Agents fail differently. The interesting failures come back as perfectly healthy responses. Say the assistant tells a recruiter the client has not replied when they have, or drafts an email to the wrong contact, or takes nine tool calls to answer a question that needs two. Nothing threw. If all you logged was "200 OK, 14 seconds", there is nothing to look at.

So for agents, the unit worth logging is the turn: one user message and everything the agent did about it.

## One record per turn, one span per step

For every turn, I want a single structured record that answers who, what, how much and how it ended.

- **Who asked.** The operator's identity and the channel they came through: the web app, a voice command, a desktop connector, or the headless driver acting as a bot account. Every tool call carries that identity too.
- **Which agent.** Its name and a version, ideally a hash of its definition, so a change in behaviour can be lined up with the change that caused it.
- **The model and its usage.** Uncached input, cache writes, cache reads and output tokens, kept separate.
- **Latency.** Time to first token and total time. Users feel the first; your queues and your bill feel the second.
- **Cost.** Computed from the usage at write time; see [A cost ledger for every agent turn](/blog/a-cost-ledger-for-every-turn).
- **Tool calls.** Name, duration, status and result size, in order.
- **Approvals.** For each write the agent proposed: the card, the decision, and who made it (a person, autopilot or the driver).
- **Outcome.** One value from a fixed list.

Alongside the record, emit a trace: one span for the turn, child spans for each model call and each tool call, and the trace ID passed on to the backend services the tools call. When a tool is slow, you follow the trace into the service instead of guessing. OpenTelemetry is the usual way to do this. Use a logger that ships structured records to your backend, not one that prints strings to a console nobody collects.

```js
// Simplified: one structured record per turn
logger.info({
  event: "agent.turn",
  traceId, sessionId, turnId,
  agent: { name, version },
  operator: { userId, via }, // "web" | "voice" | "connector" | "driver"
  model,
  tokens: { uncached, cacheWrite, cacheRead, output },
  latencyMs: { firstToken, total },
  cost,
  tools: calls.map((c) => ({
    name: c.name, ms: c.ms, status: c.status, resultBytes: c.bytes, payloadId: c.payloadId,
  })),
  cards: cards.map((c) => ({ id: c.id, decision: c.decision, by: c.decidedBy })),
  outcome, // "answered" | "proposed" | "refused" | "step_cap" | "error"
});
```

## Typed outcomes, so silence means something

A free-text status is fine for reading and useless for counting. Autopilot runs end in typed outcomes, one of a known set, and a sweeper picks up runs that have gone stale.

That pairing is the useful part. If every path through the code has to end by logging an outcome, then a missing outcome is a signal in its own right: something hung, crashed or was dropped. Without that rule, the absence of a log line proves nothing, and you cannot tell "nothing happened" from "we did not record it".

## Payloads: keep them, but not in the log line

To debug an agent you need the actual arguments and results of its tool calls. Those payloads are also where the personal data is: candidate names, phone numbers, email bodies, salary expectations. The same goes for prompts and model output.

The pattern I would use is to keep the two apart:

- The turn record holds metadata and a payload ID, never the raw content.
- Full payloads go to a separate store with tighter access, its own retention period, and a record of who opened what.
- Known personal fields are redacted or hashed at write time, before anything reaches a log pipeline. Credentials and auth headers are dropped outright.
- The exact payload of an approved write is an audit record and is kept longer than debug data. It is what was actually sent, and on whose authority.

Treat access to logs the way you treat access to the database. A log store full of email bodies is a copy of your inbox with weaker controls.

## Who did it cannot be reconstructed later

I rebuilt an admin audit trail from the MongoDB oplog. The oplog is precise about what changed: it has the exact new values and the time of each change, and old values can be reconstructed by walking a document's changes from oldest to newest. What it does not have is who made each change. The actor column stayed null, because a guess in an audit trail is worse than a blank.

That is the lesson for agents in one line: identity has to be captured when the action happens. No amount of forensics afterwards will tell you whether an email was approved by a recruiter, by autopilot or by the driver, unless the approval recorded it at the time.

## Questions good logs should answer

A useful test of a logging design is to write down the questions you expect to ask, and check that each one can be answered with a single query.

- Why did the agent say that? Which tools did it call, what came back, and what state did it start from?
- Who approved this email: a person, autopilot or the driver?
- Which tool is slowest, and which fails most often?
- What does a typical turn cost for each agent, and which sessions are outliers?
- Did yesterday's prompt change move tokens per turn, cache hit rate or refusal rate?
- How often do autopilot runs hit the step cap?
- Which provider account served this turn? That one matters once you run a pool of accounts; see [LLM failover: switch on one error, never flap back](/blog/llm-provider-failover).

If a question needs someone to grep raw text across three services, the design has a gap.

## Logs feed evals

The last reason to log turns well is that they are where eval cases come from. When someone reports a bad answer, the turn record takes you to the exact conversation, the tool results and the state behind it. That turn becomes a case in the eval set, as I describe in [Evals from real questions, against live data](/blog/evals-from-real-questions), and the next change to the agent has to pass it.

Good logs and good evals are the same habit seen from two sides: write down what really happened, then make sure it keeps happening the way you meant.

## What I would take from this

1. **Log the turn, not just the request.** Who asked, which agent version, usage, latency, cost, tools, approvals and outcome.
2. **Make outcomes typed and mandatory**, so a missing one is a signal.
3. **Keep payloads out of log lines.** Store them separately, redact at write time, and control who reads them.
4. **Capture identity at the moment of action.** It cannot be recovered afterwards.

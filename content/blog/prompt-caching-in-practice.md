---
title: "Prompt caching is an ordering problem"
description: "Turning on prompt caching takes one line. Getting cache hits is a design job: what goes first, what goes last, and how the usage numbers tell you it is working."
date: "2026-11-17"
tags: ["Prompt caching", "Cost", "LLMs"]
---

In [Keep facts in code, not in the model](/blog/facts-in-code-not-in-the-model) I mentioned in passing that prompt caching only pays off when the start of the prompt is stable. That sentence hides most of the work. Marking a prompt as cacheable is one line; getting hits on most requests means designing how every prompt is assembled.

I will use Claude's API as the example. The details differ between providers; the shape does not.

## What the cache actually stores

Prompt caching is a prefix match. When you mark a point in the prompt, the provider stores its processed state for everything up to that point. A later request whose prompt starts with exactly the same bytes, up to that point, reads the stored state instead of processing it again.

Reading from the cache is much cheaper than normal input, and faster. Writing to it costs a little more than normal input. So a cached prefix pays off only if it is read again.

"Exactly the same bytes" is the important part. One changed character invalidates everything after it. On Claude's API the prompt is rendered as tools, then the system prompt, then messages. Editing a tool description invalidates everything. Editing the system prompt invalidates the system prompt and every message after it. Appending a new message invalidates nothing before it.

## The silent invalidators

Caching rarely breaks because of a missing marker. It breaks because of a small change near the top of the prompt that nobody thinks of as a change:

- the current date or time interpolated into the system prompt
- JSON serialized with keys in whatever order the object happened to have
- a tool list built per user or per mode, so different requests send different tools
- a conditional paragraph in the system prompt, so every combination of flags is a different prefix
- a request ID or a user's name near the start

None of these cause an error. Every request pays the write price, nothing reads what was written, and the only sign is in the usage numbers.

## Order everything by how often it changes

The rule is simple: what changes least goes first. In practice I think of five layers.

1. **Tool declarations and the system prompt.** These change when you deploy. Serialize tools in a fixed order, and keep the system prompt free of anything per user or per request.
2. **Long reference material.** Scoring rubrics, policies, reference guides. They change rarely and are often the biggest block. On the agents I built, the long rubric and reference prompts are cached.
3. **Session context.** Things that are true for this whole conversation, like standing rules. These go in once.
4. **The conversation.** It only grows, by appending. Never rewrite an earlier message.
5. **Volatile state.** The current snapshot, the time, the new question. Always last.

Cache breakpoints go at the boundaries between layers. You only get a few per request (four on Claude's API), so put them where stability changes, not everywhere.

```js
// Simplified: stable layers first, breakpoints at the boundaries
const request = {
  model,
  tools: sortByName(tools), // deploy-time, fixed order
  system: [
    { type: "text", text: SYSTEM_PROMPT },
    { type: "text", text: RUBRIC, cache_control: { type: "ephemeral" } },
  ],
  messages: [
    ...history, // append-only, with a breakpoint on its last block
    {
      role: "user",
      content: [
        { type: "text", text: snapshotOrNoChangeNote }, // volatile, after the last breakpoint
        { type: "text", text: question },
      ],
    },
  ],
};
```

Tool declarations are part of the prefix too. In Autopilot I cut the tool declarations from about 2.8k to about 1.3k tokens and arranged them around a stable cached prefix. Smaller declarations mean a cheaper first write, a cheaper miss when the cache expires, and less context on every turn.

## Standing rules: once per session

Caching does not make repeated text free. Standing rules are the clearest case.

Our agents used to send about 8K characters of standing rules with every message. In the costliest sessions, that was around 40% of all message text. Caching was on, so why did it matter?

Because rules attached to each user message are new content every turn. Each copy is written to the cache once, then read again on every later turn of the session, and every copy pushes the conversation closer to the size at which a fresh session has to start. Sent once per session, the same rules become a single block early in the conversation: written once, then read cheaply. That is the change we made.

A related trap: editing the system prompt mid-session to add an instruction changes the prefix in front of the entire history, so the next turn processes the whole conversation uncached. New instructions belong after the history.

## Volatile state goes last, and only when it changed

The Mandate Assistant's per-turn snapshot of mandate state is the most volatile thing in the prompt, so it sits after the last breakpoint. It is also hashed, and when nothing has changed the model gets a one-line note instead, so near-identical copies do not pile up in the history every later turn reads.

## Cache lifetime and traffic shape

Cache entries are short-lived. On Claude's API the default lifetime is five minutes, refreshed every time the entry is read, with a longer option that costs more to write. Whether that is enough depends on your traffic, not your prompt.

- **Agent loops** fire requests seconds apart and keep the cache warm on their own.
- **People pause.** Say a recruiter reads an answer for ten minutes; their next message meets a cold cache. For a large prefix and slow readers, the longer lifetime can pay for itself.
- **Parallel fan-out pays full price.** An entry becomes readable only once the first response starts arriving. Fire ten identical requests at once and all ten write. Send one, wait for its first token, then send the rest.
- **Caches are scoped.** A different model, or a different provider account, starts cold. That matters when you fail over between accounts; see [LLM failover: switch on one error, never flap back](/blog/llm-provider-failover).
- **Small prefixes do not cache.** Below a model-dependent minimum length, a marker silently does nothing.

## Measure the hit rate on every turn

The response tells you exactly what happened. Claude's API reports three input numbers: tokens read from the cache, tokens written to it, and uncached input tokens. The hit rate is reads divided by the sum of all three.

Log those numbers on every turn, next to the cost (more on that in [A cost ledger for every agent turn](/blog/a-cost-ledger-for-every-turn)). A healthy multi-turn session has a recognisable shape: reads grow turn over turn, and writes stay small, roughly the size of what the last turn added. If writes are close to the full prompt size on every turn, something upstream of the breakpoint is changing. Capture two consecutive request bodies and diff them. The first difference is your invalidator.

Then make it a standing check. Caching tends to break long after setup, when someone adds a harmless-looking field to the system prompt. A test that sends the same request twice and asserts that the second one read from the cache catches that on the day it happens.

## What I would tell someone starting

1. **Treat the prompt as layers ordered by stability.** Tools and system, reference material, session context, history, volatile state.
2. **Hunt the silent invalidators.** Timestamps, unsorted JSON, per-user tool lists and conditional sections near the top.
3. **Send standing context once.** Caching discounts repeated text; it does not make it free.
4. **Measure reads, writes and uncached input on every turn**, and keep a test that fails when cache reads drop to zero.
